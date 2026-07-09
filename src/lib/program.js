// Training program + rotating schedule.
//
// Pure, portable logic (same pattern as dashboard.js / workoutStats.js): a
// program is an ordered CYCLE of days that you rotate through as you train, so
// a missed calendar day never desyncs it. `pointer` is the index of the next
// day up; completing that day advances the pointer (mod the cycle length).
// Each training day lists planned exercises with a target set count + rep range
// that pre-fill the logger when you start the session.

import { createExercise, createSet } from './workoutStore'
import { getExercise } from './exerciseLibrary'
import { lateralityFor, usesBodyweight } from './movements'

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// ---- Factories -------------------------------------------------------------

// A planned exercise inside a training day. `exerciseId` links to the DB when
// picked from the library (null for custom), `sets` is the target count, and
// `repRange` is the double-progression target.
export function createPlannedExercise(name, opts = {}) {
  const { exerciseId = null, kind = 'strength', sets = 3, repRange = { low: 8, high: 12 } } = opts
  return { id: newId(), exerciseId, name: name.trim().slice(0, 60), kind, sets: Math.max(1, sets), repRange }
}

export function createDay(kind = 'train', name = '') {
  return {
    id: newId(),
    kind,
    name: name || (kind === 'rest' ? 'Rest' : 'Training day'),
    exercises: [],
  }
}

export function emptyProgram(name = 'My program') {
  const now = Date.now()
  return { id: newId(), name, days: [], pointer: 0, createdAt: now, updatedAt: now }
}

// ---- Rotation --------------------------------------------------------------

// Normalise a pointer into a valid day index.
function safeIndex(program) {
  const n = program.days.length
  return n ? ((program.pointer % n) + n) % n : 0
}

// The next day up in the cycle (may be a rest day), or null for an empty program.
export function todaysDay(program) {
  if (!program || !program.days.length) return null
  return program.days[safeIndex(program)]
}

// Move the pointer to the slot after `dayId` (mod length). Falls back to
// advancing the current pointer if the id isn't found (e.g. the day was
// deleted). Returns a new program object.
export function advanceProgram(program, dayId) {
  if (!program || !program.days.length) return program
  const idx = program.days.findIndex((d) => d.id === dayId)
  const from = idx === -1 ? safeIndex(program) : idx
  return { ...program, pointer: (from + 1) % program.days.length, updatedAt: Date.now() }
}

// Manual correction: point AT `dayId` directly (unlike advanceProgram, which
// moves past a day). Lets a user fix the rotation if it drifted from reality
// — a forgotten "mark rest done," a workout logged out of order, etc. No-op if
// the day isn't found.
export function setPointerToDay(program, dayId) {
  if (!program || !program.days.length) return program
  const idx = program.days.findIndex((d) => d.id === dayId)
  if (idx === -1) return program
  return { ...program, pointer: idx, updatedAt: Date.now() }
}

// ---- Prefill the logger from a planned day ---------------------------------

// Build a draft's `exercises` array from a training day, reusing the same
// factories the manual "add exercise" flow uses so laterality / bodyweight /
// targets all match. `bodyweight` is the session bodyweight for BW-loaded moves.
export function draftFromDay(day, opts = {}) {
  const sessionBw = Number(opts.bodyweight) || 0
  return (day?.exercises || []).map((pe) => {
    const strength = pe.kind !== 'cardio'
    const lib = pe.exerciseId ? getExercise(pe.exerciseId) : null
    const laterality = strength ? (lib ? lib.laterality : lateralityFor(pe.name)) : undefined
    const bodyweight = strength ? (lib ? lib.bodyweight : usesBodyweight(pe.name)) : false
    const ex = createExercise(pe.name, pe.kind || 'strength', {
      laterality,
      repRange: pe.repRange || undefined,
      bodyweight,
      bw: sessionBw,
      exerciseId: pe.exerciseId || null,
    })
    // createExercise seeds one set; add the rest to hit the target count.
    const target = Math.max(1, Number(pe.sets) || 1)
    while (ex.sets.length < target) {
      const setOpts = ex.bodyweight ? { bodyweight: true, bw: sessionBw } : { unilateral: ex.unilateral }
      ex.sets.push(createSet(ex.sets[ex.sets.length - 1], setOpts))
    }
    return ex
  })
}

// ---- Starter templates -----------------------------------------------------
// Ready-made programs so a user isn't staring at a blank builder. Exercise ids
// reference src/data/exercises.json so prefills carry full DB metadata.

const x = (name, exerciseId, sets, low, high) => ({ name, exerciseId, sets, repRange: { low, high } })

const TEMPLATES = [
  {
    key: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Three training days on rotation, then a rest slot.',
    days: [
      { kind: 'train', name: 'Push', exercises: [x('Bench Press', 'bench-press', 4, 6, 10), x('Dumbbell Shoulder Press', 'dumbbell-shoulder-press', 3, 8, 12), x('Cable Lateral Raise', 'cable-lateral-raise', 3, 12, 20), x('Push-down', 'push-down', 3, 10, 15)] },
      { kind: 'train', name: 'Pull', exercises: [x('Barbell Bent Over Row', 'barbell-bent-over-row', 4, 6, 10), x('Lat Pulldown', 'lat-pulldown', 3, 8, 12), x('Face Pull', 'face-pull', 3, 12, 20), x('Barbell Curl', 'barbell-curl', 3, 8, 12)] },
      { kind: 'train', name: 'Legs', exercises: [x('Barbell Squat', 'barbell-squat', 4, 5, 8), x('Romanian Deadlift', 'romanian-deadlift', 3, 8, 12), x('Leg Extension', 'leg-extension', 3, 12, 15), x('Lying Leg Curl', 'lying-leg-curl', 3, 10, 15)] },
      { kind: 'rest', name: 'Rest', exercises: [] },
    ],
  },
  {
    key: 'upper-lower',
    name: 'Upper / Lower (A/B)',
    description: 'Four training days (Upper A, Lower A, Upper B, Lower B) then rest.',
    days: [
      { kind: 'train', name: 'Upper A', exercises: [x('Bench Press', 'bench-press', 4, 6, 10), x('Barbell Bent Over Row', 'barbell-bent-over-row', 4, 6, 10), x('Dumbbell Shoulder Press', 'dumbbell-shoulder-press', 3, 8, 12), x('Barbell Curl', 'barbell-curl', 3, 8, 12)] },
      { kind: 'train', name: 'Lower A', exercises: [x('Barbell Squat', 'barbell-squat', 4, 5, 8), x('Romanian Deadlift', 'romanian-deadlift', 3, 8, 12), x('Leg Extension', 'leg-extension', 3, 12, 15)] },
      { kind: 'train', name: 'Upper B', exercises: [x('Incline Barbell Bench Press', 'incline-barbell-bench-press', 4, 6, 10), x('Lat Pulldown', 'lat-pulldown', 4, 8, 12), x('Cable Lateral Raise', 'cable-lateral-raise', 3, 12, 20), x('Push-down', 'push-down', 3, 10, 15)] },
      { kind: 'train', name: 'Lower B', exercises: [x('Leg Press', 'leg-press', 4, 8, 12), x('Lying Leg Curl', 'lying-leg-curl', 4, 10, 15), x('Leg Extension', 'leg-extension', 3, 12, 15)] },
      { kind: 'rest', name: 'Rest', exercises: [] },
    ],
  },
]

// Public list for the builder's "start from a template" picker.
export const STARTER_PROGRAMS = TEMPLATES.map((t) => ({ key: t.key, name: t.name, description: t.description }))

// Instantiate a fresh program (new ids, pointer 0) from a template key, or an
// empty program when key is falsy / 'blank'.
export function programFromTemplate(key) {
  const t = TEMPLATES.find((tpl) => tpl.key === key)
  if (!t) return emptyProgram()
  const program = emptyProgram(t.name)
  program.days = t.days.map((d) => ({
    ...createDay(d.kind, d.name),
    exercises: d.exercises.map((e) => createPlannedExercise(e.name, { exerciseId: e.exerciseId, sets: e.sets, repRange: e.repRange })),
  }))
  return program
}
