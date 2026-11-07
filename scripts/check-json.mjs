// Fails if any .json file in the repo does not parse.
//   node scripts/check-json.mjs

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { report, root, walk } from './lib.mjs'

const files = walk('.', (name) => name.endsWith('.json'))
const problems = []
for (const file of files) {
  try {
    JSON.parse(readFileSync(join(root, file), 'utf8'))
  } catch (err) {
    problems.push(`${file}: ${err.message}`)
  }
}
report(problems, `${files.length} JSON files parse`)
