// Data accessor for the public exercise bank (`/exercises`).
//
// The bank needs the FULL exercise rows — muscles, fatigue, recovery, rest,
// SFR, resistance profile, etc. — which `exerciseLibrary.js`'s search entries
// deliberately strip out (they only carry id/name/category/laterality/type).
// So the bank reads `src/data/exercises.json` directly. Search itself is still
// delegated to `searchExercises` in exerciseLibrary.js.

import exercisesDb from '../data/exercises.json'

// Display order for the browse page's category sections.
// Keep the VALUES in sync with HOME_CATEGORIES in scripts/muscle-taxonomy.mjs.
export const CATEGORY_ORDER = ['Chest', 'Back', 'Shoulders', 'Arms', 'Forearms', 'Traps', 'Core', 'Legs']

const ALL = exercisesDb.exercises || []
const BY_ID = new Map(ALL.map((e) => [e.id, e]))

export const EXERCISE_COUNT = ALL.length

// The full DB row for a detail page, or null for an unknown id.
export function getFullExercise(id) {
  return id ? BY_ID.get(id) || null : null
}

// Compounds first, then alphabetical — a nice reading order within a group.
function byTypeThenName(a, b) {
  return (a.type === 'compound' ? 0 : 1) - (b.type === 'compound' ? 0 : 1) || a.name.localeCompare(b.name)
}

// All exercises grouped by Home Category in CATEGORY_ORDER. Returns
// [category, rows][] with empty categories dropped. Any category not in the
// order list (shouldn't happen given the linter) is appended at the end.
export function allByCategory() {
  const groups = new Map(CATEGORY_ORDER.map((c) => [c, []]))
  for (const e of ALL) {
    if (!groups.has(e.category)) groups.set(e.category, [])
    groups.get(e.category).push(e)
  }
  for (const list of groups.values()) list.sort(byTypeThenName)
  return [...groups.entries()].filter(([, list]) => list.length)
}

// Filter option lists, derived from the data so they never drift from the DB.
// Stored lowercase in the JSON ("free weight", "compound") — display-cased in the UI.
export const EQUIPMENT = [...new Set(ALL.map((e) => e.equipment))].filter(Boolean).sort()
export const TYPES = [...new Set(ALL.map((e) => e.type))].filter(Boolean).sort()

// The primary (highest-weight) muscle name(s) — used for card tags.
export function primaryMuscles(e) {
  const entries = Object.entries(e.muscles || {})
  if (!entries.length) return []
  const max = Math.max(...entries.map(([, w]) => w))
  return entries.filter(([, w]) => w === max).map(([m]) => m)
}

// ---- Display formatting ----------------------------------------------------

export function titleCase(s) {
  return (s || '').replace(/\b\w/g, (c) => c.toUpperCase())
}

// [24,48] -> "24–48h"; [72,72] -> "72h"
export function fmtRecovery(hours) {
  if (!Array.isArray(hours)) return '—'
  const [a, b] = hours
  return a === b ? `${a}h` : `${a}–${b}h`
}

// seconds -> minutes label: [120,180] -> "2–3 min"; [120,120] -> "2 min"
export function fmtRest(seconds) {
  if (!Array.isArray(seconds)) return '—'
  const toMin = (s) => {
    const m = s / 60
    return Number.isInteger(m) ? `${m}` : m.toFixed(1).replace(/\.0$/, '')
  }
  const [a, b] = seconds
  return a === b ? `${toMin(a)} min` : `${toMin(a)}–${toMin(b)} min`
}

// Muscle weight -> tier label (matches the CSV's four contribution columns).
export function tierLabel(weight) {
  if (weight >= 1) return 'Primary'
  if (weight >= 0.5) return 'Secondary'
  if (weight >= 0.25) return 'Tertiary'
  return 'Stabilizer'
}
