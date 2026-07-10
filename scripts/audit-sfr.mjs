// Consistency audit for the Stimulus-to-Fatigue Ratio (SFR) column.
//
//   node scripts/audit-sfr.mjs
//
// SFR is a DERIVED rating (target-muscle stimulus ÷ whole-body/joint fatigue),
// so unlike the recovery columns it must stay internally consistent with the
// columns we've already vetted: Hypertrophy Potential (stimulus proxy),
// Fatigue Score + Axial Loading + Stability (fatigue proxy), and Equipment
// (machines/cables isolate with less systemic cost → higher SFR).
//
// Reads the built data/exercises.json (run `npm run build:exercises` first).
// Reports every violation; writes nothing. See data/recovery-rubric.md for the
// evidence base this extends.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { exercises } = JSON.parse(readFileSync(join(ROOT, 'data', 'exercises.candidate.json'), 'utf8'))

const SFR = { poor: 1, average: 2, good: 3, excellent: 4 }
const HYP = { low: 1, moderate: 2, high: 3, excellent: 4 }
const STAB = { 'highly unstable': 1, unstable: 2, moderate: 3, stable: 4, 'very stable': 5 }
const SFR_NAME = ['—', 'poor', 'average', 'good', 'excellent']

// ---- distribution -----------------------------------------------------------
const dist = {}
for (const ex of exercises) dist[ex.sfr] = (dist[ex.sfr] || 0) + 1
console.log('SFR distribution:', dist)
console.log(`(${exercises.length} exercises)\n`)

// ---- expected-SFR heuristic (for the soft flag) -----------------------------
// Start at "good" (3) and nudge by the fatigue/stimulus/stability signals.
function expectedSFR(ex) {
  let s = 3
  const stab = STAB[ex.stability] ?? 3
  const hyp = HYP[ex.hypertrophyPotential] ?? 3
  if (ex.equipment === 'machine' || ex.equipment === 'cable') s += 1
  if (stab <= 2) s -= 1.5          // (highly) unstable = energy lost to balance
  if (stab === 5) s += 0.5         // very stable = pure target work
  if (ex.axialLoading) s -= 1      // spinal/systemic cost
  if (ex.fatigueScore >= 5) s -= 1
  if (ex.fatigueScore <= 1) s += 0.5
  if (ex.skill === 'very high') s -= 1
  if (hyp >= 4) s += 0.5           // strong stimulus lifts the ratio
  if (hyp <= 1) s -= 0.5
  return Math.max(1, Math.min(4, s))
}

const flags = []
const flag = (ex, rule, detail) => flags.push({ name: ex.name, rule, detail })

for (const ex of exercises) {
  const sfr = SFR[ex.sfr]
  const hyp = HYP[ex.hypertrophyPotential] ?? 3
  const stab = STAB[ex.stability] ?? 3

  // R1 — instability tax: can't be excellent-SFR while energy leaks into balancing
  if (sfr >= 4 && stab <= 2) flag(ex, 'R1 instability↔SFR', `SFR excellent but stability "${ex.stability}"`)

  // R2 — axial free-weight tax: the textbook LOW-SFR lifts (squat/DL/row)
  if (sfr >= 4 && ex.equipment === 'free weight' && ex.axialLoading) flag(ex, 'R2 axial free-weight↔SFR', `SFR excellent but free-weight + axial loading (classic low-SFR pattern)`)

  // R3 — stimulus floor: "excellent" ratio needs real stimulus
  if (sfr >= 4 && hyp <= 2) flag(ex, 'R3 stimulus↔SFR', `SFR excellent but hypertrophy potential "${ex.hypertrophyPotential}"`)

  // R4 — stable machine/cable underrated
  if (sfr <= 2 && (ex.equipment === 'machine' || ex.equipment === 'cable') && stab >= 4 && hyp >= 3 && ex.fatigueScore <= 3) {
    flag(ex, 'R4 stable-machine underrated', `SFR "${ex.sfr}" but stable ${ex.equipment}, hypertrophy "${ex.hypertrophyPotential}", fatigue ${ex.fatigueScore}`)
  }

  // R6 — skill tax
  if (sfr >= 4 && ex.skill === 'very high') flag(ex, 'R6 skill↔SFR', `SFR excellent but skill "very high"`)

  // Soft — heuristic disagrees by ≥2 bands (informational)
  const exp = expectedSFR(ex)
  if (Math.abs(exp - sfr) >= 2) flag(ex, 'S heuristic gap ≥2', `SFR "${ex.sfr}" (${sfr}) vs heuristic ${exp.toFixed(1)} [fat ${ex.fatigueScore}/${ex.equipment}/${ex.stability}/hyp ${ex.hypertrophyPotential}${ex.axialLoading ? '/axial' : ''}]`)
}

// R5 — near-duplicate divergence: group by (primary muscle, type, equipment)
const groups = new Map()
for (const ex of exercises) {
  const primary = Object.entries(ex.muscles).sort((a, b) => b[1] - a[1])[0]?.[0] || '?'
  const key = `${primary}|${ex.type}|${ex.equipment}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(ex)
}
for (const [key, group] of groups) {
  if (group.length < 2) continue
  const scores = group.map((e) => SFR[e.sfr])
  if (Math.max(...scores) - Math.min(...scores) >= 2) {
    for (const ex of group) flag(ex, 'R5 near-duplicate divergence', `group [${key}] SFR spans ${SFR_NAME[Math.min(...scores)]}–${SFR_NAME[Math.max(...scores)]} (${group.map((e) => `${e.name}:${e.sfr}`).join(', ')})`)
  }
}

const byRule = new Map()
for (const fl of flags) { if (!byRule.has(fl.rule)) byRule.set(fl.rule, []); byRule.get(fl.rule).push(fl) }
console.log(`${flags.length} flags across ${byRule.size} rules.`)
for (const [rule, list] of [...byRule.entries()].sort()) {
  console.log(`\n=== ${rule} (${list.length}) ===`)
  for (const fl of list) console.log(`  ${fl.name} — ${fl.detail}`)
}
