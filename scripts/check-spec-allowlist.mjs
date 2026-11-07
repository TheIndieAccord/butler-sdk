// Guards the public spec. spec/butler.client.openapi.json must contain exactly
// the operations listed in spec/client-operations.json, each tagged with the
// tier it was listed under. This stops a hand edit (or a bad sync) from
// publishing a private Butler route.
//   node scripts/check-spec-allowlist.mjs

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { report, root } from './lib.mjs'

const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))
const spec = read('spec/butler.client.openapi.json')
const { operations } = read('spec/client-operations.json')

const METHODS = ['get', 'put', 'post', 'patch', 'delete', 'head', 'options', 'trace']
const allowed = new Map(operations.map((op) => [`${op.method} ${op.path}`, op]))
const problems = []
const seen = new Set()

for (const [path, item] of Object.entries(spec.paths ?? {})) {
  for (const method of METHODS) {
    const op = item[method]
    if (!op) continue
    const key = `${method} ${path}`
    seen.add(key)
    const label = `${method.toUpperCase()} ${path}`
    const want = allowed.get(key)
    if (!want) {
      problems.push(`${label} is in the spec but not on the allowlist`)
      continue
    }
    // The annotations must match the allowlist entry exactly.
    if (op['x-butler-tier'] !== want.tier) problems.push(`${label} has tier ${op['x-butler-tier']}, allowlist says ${want.tier}`)
    if ((op['x-butler-via'] ?? null) !== (want.via ?? null)) problems.push(`${label} x-butler-via does not match the allowlist`)
    if ((op['x-doorman-route'] ?? null) !== (want.doormanRoute ?? null)) problems.push(`${label} x-doorman-route does not match the allowlist`)
    // Callbacks would publish extra operations the allowlist never saw.
    if (op.callbacks) problems.push(`${label} has callbacks, which the public spec does not allow`)
  }
}
for (const unsupported of ['webhooks']) {
  if (spec[unsupported]) problems.push(`top-level ${unsupported} are not allowed in the public spec`)
}
for (const key of allowed.keys()) {
  if (!seen.has(key)) problems.push(`${key.toUpperCase()} is on the allowlist but missing from the spec (re-run scripts/sync-spec.mjs)`)
}
report(problems, `public spec matches the allowlist (${seen.size} operations)`)
