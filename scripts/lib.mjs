// Small helpers shared by the check scripts. No dependencies, so the checks
// run on a bare Node 22 install in CI and on a contributor's machine.

import { readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Folders the checks never look inside.
const SKIP = new Set(['.git', 'node_modules', 'dist', 'coverage', 'Library', 'Temp'])

/** Every file under `dir` (relative to the repo root) whose name passes `filter`. */
export function walk(dir = '.', filter = () => true) {
  const out = []
  const visit = (abs) => {
    for (const name of readdirSync(abs)) {
      if (SKIP.has(name)) continue
      const path = join(abs, name)
      if (statSync(path).isDirectory()) visit(path)
      else if (filter(name)) out.push(relative(root, path))
    }
  }
  visit(join(root, dir))
  return out.sort()
}

/** Print the problems and exit 1, or print `okMessage` and return. */
export function report(problems, okMessage) {
  if (problems.length) {
    for (const p of problems) console.error(`  ${p}`)
    console.error(`${problems.length} problem(s)`)
    process.exit(1)
  }
  console.log(okMessage)
}
