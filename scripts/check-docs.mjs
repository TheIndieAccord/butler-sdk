// House style for everything a person reads in this repo (Markdown, and the
// comments in code samples inside it):
//   - plain punctuation: no em or en dashes, no curly quotes
//   - relative links point at files that exist
// Keeping to plain ASCII punctuation also keeps docs easy to edit and diff
// in any editor.
//   node scripts/check-docs.mjs

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { report, root, walk } from './lib.mjs'

const BANNED = [
  ['\u2014', 'em dash (use a comma, colon, parentheses or a new sentence)'],
  ['\u2013', 'en dash (use a hyphen, or "to" for ranges)'],
  ['\u201C', 'curly quote'], ['\u201D', 'curly quote'],
  ['\u2018', 'curly apostrophe'], ['\u2019', 'curly apostrophe'],
]

const files = walk('.', (n) => n.endsWith('.md')).filter((f) => f !== 'LICENSE')
const problems = []

// GitHub's heading anchors: lower case, punctuation removed, spaces to hyphens,
// repeats get -1, -2 and so on. Explicit <a id="..."> anchors count too.
const anchorCache = new Map()
function anchorsOf(file) {
  if (anchorCache.has(file)) return anchorCache.get(file)
  const seen = new Map()
  const anchors = new Set()
  let inFence = false
  for (const line of readFileSync(join(root, file), 'utf8').split('\n')) {
    if (line.startsWith('```')) inFence = !inFence
    if (inFence) continue
    const h = line.match(/^#{1,6}\s+(.*?)\s*#*\s*$/)
    if (h) {
      const base = h[1].toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-')
      const n = seen.get(base) ?? 0
      seen.set(base, n + 1)
      anchors.add(n ? `${base}-${n}` : base)
    }
    for (const a of line.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) anchors.add(a[1])
  }
  anchorCache.set(file, anchors)
  return anchors
}

for (const file of files) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n')
  let inFence = false
  lines.forEach((line, i) => {
    for (const [ch, why] of BANNED) if (line.includes(ch)) problems.push(`${file}:${i + 1}: ${why}`)
    if (line.startsWith('```')) inFence = !inFence
    if (inFence) return // links inside code samples are not links
    // [text](target) or [text](target "title"); skip URLs.
    for (const m of line.matchAll(/\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g)) {
      if (/^[a-z]+:/i.test(m[1])) continue
      const [path, fragment] = m[1].split('#')
      const target = path ? join(dirname(file), path) : file
      if (!existsSync(join(root, target))) {
        problems.push(`${file}:${i + 1}: broken link ${m[1]}`)
      } else if (fragment && target.endsWith('.md') && !anchorsOf(target).has(fragment)) {
        problems.push(`${file}:${i + 1}: no heading for #${fragment} in ${target}`)
      }
    }
  })
}
report(problems, `${files.length} Markdown files pass the docs style check`)
