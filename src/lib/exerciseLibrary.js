// The exercise library that backs the workout-log picker.
//
// The source of truth is the cleaned, ID'd exercise database
// (`src/data/exercises.json`) — 147 resistance movements each carrying a stable
// `id`, laterality, muscles, and equipment. Picking one of these carries its
// `id` through to the logged exercise, so downstream features (routine builder,
// hypertrophy engine) look movements up by id instead of re-guessing from the
// name. Anything the user types that isn't in the DB is still added as a custom
// exercise (no id), and laterality/bodyweight fall back to name inference.
//
// The DB is resistance-only, so cardio (and a few Olympic / full-body lifts it
// doesn't cover) are supplemented from the legacy movement list. Those have no
// id — they're names only, like custom entries.

import exercisesDb from '../data/exercises.json'
import { MOVEMENTS } from './movements'

// ---- Search vocabulary -----------------------------------------------------

// Whole-word query abbreviations, expanded before searching. Expansions are
// chosen to hit the DB's naming (e.g. "ohp" → the shoulder-press synonyms).
const ABBREVIATIONS = {
  db: 'dumbbell',
  bb: 'barbell',
  ohp: 'overhead press',
  rdl: 'romanian deadlift',
  sldl: 'stiff leg deadlift',
  bss: 'bulgarian split squat',
  cgbp: 'close grip bench press',
}

// The DB's anatomical muscle names → the everyday words people actually search
// ("quads" not "quadriceps"). Anything unmapped falls back to its own name.
const MUSCLE_ALIASES = {
  Quadriceps: 'quads quadriceps',
  Hamstrings: 'hamstrings hams',
  'Glute Max': 'glutes glute',
  Abductors: 'abductors',
  Adductors: 'adductors inner thigh',
  Gastrocnemius: 'calves calf',
  Soleus: 'calves calf soleus',
  'Front Delts': 'front delts shoulders',
  'Side Delts': 'side delts shoulders lateral',
  'Rear Delts': 'rear delts shoulders',
  'Upper Chest': 'upper chest pecs',
  'Middle Chest': 'chest pecs',
  'Lower Chest': 'lower chest pecs',
  Lats: 'lats back',
  'Mid Back': 'mid back',
  Rhomboids: 'rhomboids upper back',
  'Upper Traps': 'traps',
  'Lower Traps': 'traps',
  Biceps: 'biceps bicep',
  Triceps: 'triceps tricep',
  Brachialis: 'brachialis',
  Brachioradialis: 'forearms',
  'Wrist Flexors': 'forearms',
  'Wrist Extensors': 'forearms',
  'Rectus Abdominis': 'abs core',
  'Transverse Abdominis': 'abs core',
  Obliques: 'obliques abs core',
  'Hip Flexors': 'hip flexors',
  'Spinal Erectors': 'lower back erectors',
  'Rotator Cuff': 'rotator cuff',
}

// Extra search terms inferred from an exercise's name — the DB has no keyword
// field, so this bridges the common gaps between what people type and how the
// DB names things (e.g. its shoulder presses never say "overhead").
function nameSynonyms(name) {
  const n = name.toLowerCase()
  const out = []
  if (/shoulder press|behind the neck press/.test(n)) out.push('overhead press', 'ohp', 'military press')
  if (/lateral raise|side lateral/.test(n)) out.push('side raise', 'lateral raise', 'side delts')
  if (/rear (delt|lateral)/.test(n)) out.push('reverse fly', 'rear delt fly')
  if (/romanian deadlift/.test(n)) out.push('rdl')
  if (/bulgarian/.test(n)) out.push('bss', 'split squat')
  if (/pulldown/.test(n)) out.push('lat pulldown')
  if (/pull-?up|chin-?up|muscle-?up|dip|push-?up|inverted row/.test(n)) out.push('bodyweight')
  if (/push-?down/.test(n)) out.push('tricep pushdown', 'pressdown')
  return out
}

// Bodyweight-loaded movements (pull-ups, dips, push-ups…): the log treats
// bodyweight as the base load. Mirrors the rule in movements.js but works off
// the DB row we already have in hand.
const BODYWEIGHT_RE = /\b(pull-?up|chin-?up|push-?up|muscle-?up|dip|inverted row|pistol|sissy squat|nordic|dragon flag)\b/i
function isBodyweight(equipment, name) {
  if (equipment === 'bodyweight') return true
  if (/\b(machine|lever|cable|smith)\b/i.test(name)) return false
  return BODYWEIGHT_RE.test(name)
}

// ---- Build the pool --------------------------------------------------------

// Normalise a string for searching: lowercase and treat hyphens as spaces, so
// "push-down" and "push down" both match. We also append a compacted copy (all
// non-alphanumerics stripped) so a one-word query like "pushdown" still hits.
function buildHaystack(parts) {
  const base = parts.filter(Boolean).join(' ').toLowerCase().replace(/-/g, ' ')
  const compact = base.replace(/[^a-z0-9]/g, '')
  return `${base} ${compact}`
}

// Library entries from the DB — the real, ID'd movements. Compounds sort ahead
// of isolation (nice empty-state suggestions), then alphabetical.
const LIBRARY = (exercisesDb.exercises || [])
  .map((e) => {
    const muscles = Object.keys(e.muscles || {})
    const item = {
      id: e.id,
      name: e.name,
      category: e.category,
      laterality: e.laterality || 'both',
      bodyweight: isBodyweight(e.equipment, e.name),
      type: e.type,
    }
    item._hay = buildHaystack([
      e.name,
      e.category,
      e.type,
      e.equipment,
      ...muscles.map((m) => MUSCLE_ALIASES[m] || m),
      ...nameSynonyms(e.name),
    ])
    return item
  })
  .sort((a, b) => (a.type === 'compound' ? 0 : 1) - (b.type === 'compound' ? 0 : 1) || a.name.localeCompare(b.name))

// Supplements the DB doesn't cover — cardio, Olympic lifts, loaded carries.
// Names only, no id, so they behave like custom entries.
const SUPPLEMENT_CATEGORIES = new Set(['Cardio', 'Olympic', 'Full Body'])
const SUPPLEMENTAL = MOVEMENTS.filter((m) => SUPPLEMENT_CATEGORIES.has(m.category)).map((m) => {
  const item = { id: null, name: m.name, category: m.category, laterality: 'both', bodyweight: false }
  item._hay = buildHaystack([m.name, m.category, ...(m.keywords || [])])
  return item
})

const POOL = [...LIBRARY, ...SUPPLEMENTAL]
const BY_ID = new Map(LIBRARY.map((e) => [e.id, e]))
const BY_NAME = new Map(POOL.map((e) => [e.name.trim().toLowerCase(), e]))

// ---- Public lookups --------------------------------------------------------

// The full DB entry (laterality, bodyweight, muscles…) for a picked id, or null
// for custom / supplemental exercises.
export function getExercise(id) {
  return id ? BY_ID.get(id) || null : null
}

// Reconcile a bare exercise name back to a DB id when it matches one exactly
// (case-insensitive) — used to backfill ids on older logged exercises.
export function exerciseIdForName(name) {
  const entry = BY_NAME.get((name || '').trim().toLowerCase())
  return entry?.id || null
}

// ---- Search ----------------------------------------------------------------

function tokenize(q) {
  return q
    .split(/\s+/)
    .map((t) => ABBREVIATIONS[t] || t)
    .join(' ')
    .split(/\s+/)
    .map((t) => t.replace(/-/g, ''))
    .filter(Boolean)
}

// The searchable set for a user: their previously-logged movements first
// (most-recent first, reconciled to a DB entry when the name matches so they
// keep their id/category), then the full pool — deduped by name.
export function exercisePool(recentNames = []) {
  const seen = new Set()
  const pool = []
  const push = (item) => {
    const key = item.name.trim().toLowerCase()
    if (!key || seen.has(key)) return
    seen.add(key)
    pool.push(item)
  }
  for (const name of recentNames) {
    const known = BY_NAME.get(name.trim().toLowerCase())
    push(known || { id: null, name: name.trim(), category: 'Recent', _hay: buildHaystack([name, 'Recent']) })
  }
  for (const m of POOL) push(m)
  return pool
}

// Token search over the pool: every query word must appear in the movement's
// searchable text (name/category/muscles/equipment/synonyms). Empty query
// returns the whole pool (recents first). Name-prefix matches float to the top.
export function searchExercises(query, recentNames = []) {
  const pool = exercisePool(recentNames)
  const q = (query || '').trim().toLowerCase()
  if (!q) return pool
  const tokens = tokenize(q)
  return pool
    .filter((m) => tokens.every((t) => m._hay.includes(t)))
    .sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)))
}
