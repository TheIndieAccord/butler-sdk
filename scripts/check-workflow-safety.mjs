// A lint for the GitHub Actions workflows in this repo.
//
// Fork pull requests run our workflows, so a workflow that runs untrusted
// code with secrets or a write token is how open source repos leak
// credentials. This check rejects the risky patterns we know about:
//   - triggers that run with secrets on fork code: pull_request_target, workflow_run
//   - any secrets reference (secrets.X or secrets['X']) in a pull_request workflow
//   - write-all permissions, or a write permission at the workflow level
//   - actions/checkout without `persist-credentials: false`
//   - third-party actions not pinned to a 40-character commit SHA
//   - docker:// images not pinned to a sha256 digest
//
// This is a lint, not a security boundary: a pull request can edit this file
// too. Code owner review of .github/ and scripts/ is what protects it.
//   node scripts/check-workflow-safety.mjs

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { report, root, walk } from './lib.mjs'

/** Drop a YAML comment from one line, but keep `#` inside quoted strings. */
function stripComment(line) {
  let quote = null
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quote) {
      if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i)
    }
  }
  return line
}

const files = walk('.github/workflows', (n) => n.endsWith('.yml') || n.endsWith('.yaml'))
const problems = []

for (const file of files) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n').map(stripComment)
  const code = lines.join('\n')
  const where = (re) => lines.findIndex((l) => re.test(l)) + 1

  if (/\bpull_request_target\b/.test(code)) problems.push(`${file}:${where(/pull_request_target/)}: uses pull_request_target`)
  if (/\bworkflow_run\b/.test(code)) problems.push(`${file}:${where(/workflow_run/)}: uses workflow_run`)

  const secretRef = /\bsecrets\s*(\.|\[)/
  if (/\bpull_request\b/.test(code) && secretRef.test(code))
    problems.push(`${file}:${where(secretRef)}: runs on pull_request and references secrets`)

  if (/permissions:\s*write-all/.test(code)) problems.push(`${file}:${where(/write-all/)}: write-all permissions`)

  // Workflow-level permissions are the lines between `permissions:` at column 0
  // and the next top-level key. Jobs may ask for more; the workflow may not.
  const top = lines.findIndex((l) => /^permissions:/.test(l))
  if (top >= 0) {
    for (let i = top + 1; i < lines.length && /^\s/.test(lines[i]); i++)
      if (/:\s*write\b/.test(lines[i])) problems.push(`${file}:${i + 1}: write permission at workflow level`)
  }

  lines.forEach((line, i) => {
    const m = line.match(/uses:\s*["']?([^\s"']+)["']?/)
    if (!m) return
    const ref = m[1]
    const at = `${file}:${i + 1}`
    if (ref.startsWith('./')) return
    if (ref.startsWith('docker://')) {
      if (!/@sha256:[0-9a-f]{64}$/.test(ref)) problems.push(`${at}: ${ref} is not pinned to a sha256 digest`)
      return
    }
    if (!/@[0-9a-f]{40}$/.test(ref)) problems.push(`${at}: ${ref} is not pinned to a commit SHA`)
    if (ref.startsWith('actions/checkout@')) {
      // persist-credentials: false must appear in this step's `with:` block.
      const block = lines.slice(i + 1, i + 6).join('\n')
      if (!/persist-credentials:\s*false/.test(block)) problems.push(`${at}: checkout keeps credentials (set persist-credentials: false)`)
    }
  })
}
report(problems, `${files.length} workflow(s) pass the safety lint`)
