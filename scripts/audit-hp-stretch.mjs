// Consistency audit for Hypertrophy Potential + Stretch-Mediated Hypertrophy.
//
//   node scripts/audit-hp-stretch.mjs
//
// Neither column is read by any app code yet (grepped src/ — only SFR and
// the fatigue/recovery/rest trio are wired in). This is data hygiene ahead
// of a future feature, checked the same way as SFR: internal consistency
// against columns already vetted (Stability, Equipment, SFR for Hypertrophy
// Potential; Resistance Profile for Stretch-Mediated, since "loads hardest
// at long muscle length" and "lengthened bias" describe the same mechanism).
//
// Reads the built data/exercises.candidate.json. Reports only, writes nothing.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { exercises } = JSON.parse(readFileSync(join(ROOT, 'data', 'exercises.candidate.json'), 'utf8'))

const SFR = { poor: 1, average: 2, good: 3, excellent: 4 }
const HYP = { low: 1, moderate: 2, high: 3, excellent: 4 }
const STAB = { 'highly unstable': 1, unstable: 2, moderate: 3, stable: 4, 'very stable': 5 }
const STRETCH = { none: 0, partial: 1, yes: 2 }
const HYP_NAME = ['—', 'low', 'moderate', 'high', 'excellent']
const STRETCH_NAME = ['none', 'partial', 'yes']

const flags = []
const flag = (ex, rule, detail) => flags.push({ name: ex.name, rule, detail })

console.log('Hypertrophy Potential distribution:', exercises.reduce((a, e) => ((a[e.hypertrophyPotential] = (a[e.hypertrophyPotential] || 0) + 1), a), {}))
console.log('Stretch-Mediated distribution:', exercises.reduce((a, e) => ((a[e.stretchMediated] = (a[e.stretchMediated] || 0) + 1), a), {}))
console.log(`(${exercises.length} exercises)\n`)

for (const ex of exercises) {
  const hyp = HYP[ex.hypertrophyPotential]
  const sfr = SFR[ex.sfr]
  const stab = STAB[ex.stability] ?? 3
  const stretch = STRETCH[ex.stretchMediated]

  // ---- Stretch-Mediated <-> Resistance Profile (mechanically the same thing:
  // does the exercise load the muscle hardest at long/stretched length?) ----
  if (ex.resistanceProfile === 'lengthened' && stretch === 0) {
    flag(ex, 'ST1 lengthened-bias↔stretch', `Resistance Profile "Lengthened Bias" but Stretch-Mediated "No" — loading hardest at the stretched position IS the mechanism`)
  }
  // NOTE: no inverse rule (shortened-bias + stretch=yes). Tried it, killed it —
  // "peak resistance biased toward the shortened end" and "meaningful tension
  // at the stretched end" aren't mutually exclusive (cam-profile machines,
  // dead-hang start positions). Confirmed 3 real false positives 2026-07-10:
  // Pec Deck Fly, Hanging Knee Raise, Seated Calf Raise — see hp-stretch-rubric.md.

  // ---- Hypertrophy Potential <-> SFR (numerator/ratio should agree loosely) ----
  if (hyp >= 4 && sfr === 1) flag(ex, 'H1 hypertrophy↔SFR', `Hypertrophy Potential "excellent" but SFR "poor"`)
  if (hyp <= 1 && sfr === 4) flag(ex, 'H1 hypertrophy↔SFR', `Hypertrophy Potential "low" but SFR "excellent"`)

  // ---- Hypertrophy Potential <-> stability/equipment (soft — under-rating check) ----
  if (hyp <= 2 && (ex.equipment === 'machine' || ex.equipment === 'cable') && stab >= 4 && sfr >= 3) {
    flag(ex, 'H2 stable-machine underrated', `Hypertrophy Potential "${ex.hypertrophyPotential}" but stable ${ex.equipment} with SFR "${ex.sfr}"`)
  }
  // ---- Hypertrophy Potential <-> instability (soft — over-rating check) ----
  if (hyp >= 4 && stab <= 2) flag(ex, 'H3 unstable overrated', `Hypertrophy Potential "excellent" but stability "${ex.stability}"`)
}

// Near-duplicate divergence: group by (primary muscle, type, equipment)
const groups = new Map()
for (const ex of exercises) {
  const primary = Object.entries(ex.muscles).sort((a, b) => b[1] - a[1])[0]?.[0] || '?'
  const key = `${primary}|${ex.type}|${ex.equipment}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(ex)
}
for (const [key, group] of groups) {
  if (group.length < 2) continue
  const hScores = group.map((e) => HYP[e.hypertrophyPotential])
  if (Math.max(...hScores) - Math.min(...hScores) >= 2) {
    for (const ex of group) flag(ex, 'H4 near-dup HP divergence', `group [${key}] HP spans ${HYP_NAME[Math.min(...hScores)]}–${HYP_NAME[Math.max(...hScores)]} (${group.map((e) => `${e.name}:${e.hypertrophyPotential}`).join(', ')})`)
  }
  const sScores = group.map((e) => STRETCH[e.stretchMediated])
  if (Math.max(...sScores) - Math.min(...sScores) >= 2) {
    for (const ex of group) flag(ex, 'ST3 near-dup stretch divergence', `group [${key}] stretch spans ${STRETCH_NAME[Math.min(...sScores)]}–${STRETCH_NAME[Math.max(...sScores)]} (${group.map((e) => `${e.name}:${e.stretchMediated}`).join(', ')})`)
  }
}

const byRule = new Map()
for (const fl of flags) { if (!byRule.has(fl.rule)) byRule.set(fl.rule, []); byRule.get(fl.rule).push(fl) }
console.log(`${flags.length} flags across ${byRule.size} rules.`)
for (const [rule, list] of [...byRule.entries()].sort()) {
  console.log(`\n=== ${rule} (${list.length}) ===`)
  for (const fl of list) console.log(`  ${fl.name} — ${fl.detail}`)
}
