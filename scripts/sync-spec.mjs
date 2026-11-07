#!/usr/bin/env node
// Builds the public client spec from Butler's full (private) OpenAPI document.
//
//   node scripts/sync-spec.mjs <path-to-butler-openapi.json>
//
// Only operations on the allowlist in spec/client-operations.json are copied,
// plus the component schemas they reference (followed transitively). Servers
// are replaced with the public hosts, and each operation is tagged with
// `x-butler-tier` so generators and docs can tell shipped-client calls from
// game-server calls. Run in CI on a schedule; a diff becomes a PR.
//
// The script fails if an allowlisted operation is missing from the source, so
// a renamed or removed route cannot silently drop out of the SDKs.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = process.argv[2]
if (!src) {
  console.error('usage: node scripts/sync-spec.mjs <butler openapi.json>')
  process.exit(2)
}

const full = JSON.parse(readFileSync(src, 'utf8'))
const { operations } = JSON.parse(readFileSync(join(root, 'spec/client-operations.json'), 'utf8'))

const out = {
  openapi: full.openapi,
  info: {
    title: 'Butler client API',
    version: full.info?.version ?? '0.0.0',
    description:
      'The public subset of the Butler API that games and SDKs call. Generated from the Butler server spec by scripts/sync-spec.mjs; do not edit by hand.',
    license: { name: 'Apache-2.0', identifier: 'Apache-2.0' },
  },
  servers: [
    { url: 'https://api.butler.theindieaccord.com', description: 'Production' },
    { url: 'https://api.butler.stg.theindieaccord.com', description: 'Staging (use sandbox keys)' },
  ],
  paths: {},
  components: { schemas: {}, securitySchemes: {} },
}

// Security used when the source operation declares none. Butler's spec does
// not yet mark every authenticated route, so the tier decides it here.
const TIER_SECURITY = {
  public: [], // reached through Doorman with a publishable key, see doorman.openapi.json
  player: [{ playerToken: [] }],
  server: [{ serverToken: [] }],
}
const SCHEMES = {
  playerToken: { type: 'http', scheme: 'bearer', description: 'Game-player access token from POST /v1/oauth/token (15 minutes).' },
  serverToken: { type: 'http', scheme: 'bearer', description: 'Game-server access token from POST /v1/auth/token (60 minutes). Never in a game build.' },
}
// Direct (server-side) analytics ingest also needs a body signature.
const SIGNATURE_HEADER = {
  name: 'X-Butler-Signature',
  in: 'header',
  required: true,
  schema: { type: 'string', pattern: '^t=[0-9]+,v1=[0-9a-f]{64}$' },
  description:
    'Required when calling Butler directly. `t` is Unix seconds; `v1` is hex HMAC-SHA256 of `<t>.<exact body bytes>` keyed with the integration signing secret. Valid for 300 seconds, each signature once. Doorman adds it for clients.',
}

// Internal wording that should not reach the public spec: route names for
// admin tooling and internal milestone labels.
function scrub(text) {
  return text
    .replace(/ Credentials are provisioned via POST \/v1\/admin\/[^.]*\./g, ' Credentials are created in Backstairs.')
    .replace(/ \(until P\d\)/g, '')
}

const missing = []
for (const op of operations) {
  const pathItem = full.paths?.[op.path]
  const source = pathItem?.[op.method]
  if (!source) {
    missing.push(`${op.method.toUpperCase()} ${op.path}`)
    continue
  }
  out.paths[op.path] ??= {}
  const copy = structuredClone(source)

  // Parameters can be declared on the path item and inherited by every method.
  if (pathItem.parameters) {
    const own = new Set((copy.parameters ?? []).map((p) => `${p.in}:${p.name}`))
    copy.parameters = [...(copy.parameters ?? []), ...pathItem.parameters.filter((p) => !own.has(`${p.in}:${p.name}`))]
  }
  // Security: the operation's own, else the document default, else by tier.
  copy.security ??= full.security ?? TIER_SECURITY[op.tier]
  if (op.tier === 'public' && op.method === 'post') {
    copy.parameters = [...(copy.parameters ?? []), SIGNATURE_HEADER]
  }
  if (copy.description) copy.description = scrub(copy.description)

  copy['x-butler-tier'] = op.tier
  if (op.via) copy['x-butler-via'] = op.via
  if (op.doormanRoute) copy['x-doorman-route'] = op.doormanRoute
  out.paths[op.path][op.method] = copy
}
if (missing.length) {
  console.error(`allowlisted operations missing from source spec:\n  ${missing.join('\n  ')}`)
  process.exit(1)
}

// Copy every referenced component (schemas, parameters, responses, request
// bodies, headers), following $refs inside them too. A $ref that cannot be
// resolved stops the sync instead of publishing a broken document.
const seen = new Set()
const visit = (node) => {
  if (Array.isArray(node)) return node.forEach(visit)
  if (!node || typeof node !== 'object') return
  for (const [k, v] of Object.entries(node)) {
    const m = k === '$ref' && typeof v === 'string' && v.match(/^#\/components\/([A-Za-z]+)\/(.+)$/)
    if (m) {
      const [, kind, name] = m
      if (seen.has(v)) continue
      seen.add(v)
      const target = full.components?.[kind]?.[name]
      if (!target) throw new Error(`unresolved $ref ${v}`)
      out.components[kind] ??= {}
      out.components[kind][name] = target
      visit(target)
    } else if (k === '$ref') {
      throw new Error(`unsupported $ref ${v} (only local #/components refs are copied)`)
    } else {
      visit(v)
    }
  }
}
visit(out.paths)

// Keep only the security schemes the published operations use, and fail on
// one that is used but not defined anywhere.
const usedSchemes = new Set()
for (const methods of Object.values(out.paths))
  for (const op of Object.values(methods))
    for (const req of op.security ?? []) Object.keys(req).forEach((s) => usedSchemes.add(s))
for (const s of usedSchemes) {
  const scheme = full.components?.securitySchemes?.[s] ?? SCHEMES[s]
  if (!scheme) throw new Error(`operations use security scheme "${s}" but it is not defined`)
  out.components.securitySchemes[s] = scheme
}

const ops = Object.values(out.paths).reduce((n, m) => n + Object.keys(m).length, 0)
const noId = Object.entries(out.paths).flatMap(([p, m]) =>
  Object.entries(m).filter(([, o]) => !o.operationId).map(([verb]) => `${verb.toUpperCase()} ${p}`),
)
writeFileSync(join(root, 'spec/butler.client.openapi.json'), JSON.stringify(out, null, 2) + '\n')
console.log(`wrote spec/butler.client.openapi.json: ${Object.keys(out.paths).length} paths, ${ops} operations, ${seen.size} components`)
if (noId.length) {
  // Generated SDK method names come from operationId. Warn while the Butler
  // spec is being updated; CI sets REQUIRE_OPERATION_IDS=1 once it has them.
  const msg = `${noId.length} operations have no operationId`
  if (process.env.REQUIRE_OPERATION_IDS === '1') {
    console.error(msg)
    process.exit(1)
  }
  console.warn(`warning: ${msg}`)
}
