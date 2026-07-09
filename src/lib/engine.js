// Hypertrophy engine v1 — effective weekly volume per muscle.
//
// Pure functions over logged sessions (same pattern as dashboard.js /
// workoutStats.js): deterministic, portable, works for guests. "Effective
// volume" = for each working set, sum `muscle_contribution × RIR_effectiveness`
// per muscle, so a set counts more for the muscles it actually targets and more
// when taken closer to failure. Warm-ups are excluded; bodyweight sets are
// ordinary working sets and count. Tracks sub-muscle atoms from the exercise DB
// and rolls them up to engine muscle groups (the drill-down shows the atoms).

import exercisesDb from '../data/exercises.json'
import {
  rirEffectiveness, ATOM_TO_GROUP, ENGINE_MUSCLES, landmarksFor,
  rirFatigue, FATIGUE_SCORE_COEF, DEFAULT_FATIGUE_SCORE, DEFAULT_RECOVERY_WINDOW,
  RECOVERY_DECAY_FACTOR, capacityFor, READY_THRESHOLD, RECOVERY_LOOKBACK_DAYS,
  AXIAL_MULT, FREE_WEIGHT_MULT, SYSTEMIC_TAU, SYSTEMIC_CAPACITY, systemicLevel,
} from './engineConfig'
import { muscleForExercise } from './dashboard'
import { exerciseIdForName } from './exerciseLibrary'

const DAY = 86400000
const DB_BY_ID = new Map((exercisesDb.exercises || []).map((e) => [e.id, e]))

function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// A resistance set counts if it's a real working set (reps logged, not a
// warm-up). Cardio has no resistance muscle volume.
function isWorking(set, kind) {
  if (kind === 'cardio' || set.type === 'warmup') return false
  if (set.left) return Number(set.left?.reps) > 0 || Number(set.right?.reps) > 0
  return Number(set.reps) > 0
}

// The set's RIR (unilateral: average the logged limbs), or null if unlogged.
function setRir(set) {
  if (set.left) {
    const vals = [set.left?.rir, set.right?.rir]
      .filter((v) => v !== '' && v != null)
      .map(Number)
      .filter(Number.isFinite)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  return set.rir === '' || set.rir == null ? null : Number(set.rir)
}

const round1 = (n) => Math.round(n * 10) / 10

// Walk every working resistance set logged on/after `since` (a start-of-day
// timestamp), resolving each exercise's DB entry once. Prefers the stored id;
// falls back to matching by name for sessions logged before ids existed (or
// typed rather than picked from the search box) — otherwise those silently
// lose their muscle-atom detail (or all credit). `db` is null for custom /
// unmatched exercises. Shared by volume (v1) and recovery (v2) so the two
// never drift on what counts as a working set.
function forEachWorkingSet(sessions, since, cb) {
  for (const s of sessions) {
    if (startOfDay(s.date) < since) continue
    for (const ex of s.exercises) {
      if (ex.kind === 'cardio') continue
      const dbId = ex.exerciseId || exerciseIdForName(ex.name)
      const db = dbId ? DB_BY_ID.get(dbId) : null
      for (const set of ex.sets) {
        if (isWorking(set, ex.kind)) cb(set, ex, db, s)
      }
    }
  }
}

// Effective weekly volume per muscle over the last `days` days (inclusive).
// Returns one entry per ENGINE_MUSCLES group: { muscle, sets, atoms:[{atom,
// sets}], landmarks:{low,high}, status:'under'|'in'|'over' }.
export function effectiveWeeklyVolume(sessions, { days = 7, now = Date.now() } = {}) {
  const cutoff = startOfDay(now) - (days - 1) * DAY
  const atomSets = {} // DB atom -> effective sets
  const groupFallback = {} // engine muscle -> effective sets (custom exercises, no DB atoms)

  forEachWorkingSet(sessions, cutoff, (set, ex, db) => {
    const eff = rirEffectiveness(setRir(set))
    if (db && db.muscles && Object.keys(db.muscles).length) {
      for (const [atom, w] of Object.entries(db.muscles)) atomSets[atom] = (atomSets[atom] || 0) + w * eff
    } else {
      // Custom / unmatched exercise: coarse group from the name (no atoms).
      const g = muscleForExercise(ex.name)
      if (g) groupFallback[g] = (groupFallback[g] || 0) + eff
    }
  })

  const byGroup = {} // muscle -> { sets, atoms: {atom: sets} }
  const bump = (muscle, sets, atom) => {
    if (!muscle) return
    byGroup[muscle] = byGroup[muscle] || { sets: 0, atoms: {} }
    byGroup[muscle].sets += sets
    if (atom) byGroup[muscle].atoms[atom] = (byGroup[muscle].atoms[atom] || 0) + sets
  }
  for (const [atom, sets] of Object.entries(atomSets)) bump(ATOM_TO_GROUP[atom], sets, atom)
  for (const [muscle, sets] of Object.entries(groupFallback)) bump(muscle, sets, null)

  // Landmarks are weekly guidance; scale them to the requested window (e.g. a
  // 30-day view compares against ~4.3x the weekly range) so status stays
  // meaningful at any range, not just the default 7 days.
  const scale = days / 7
  return ENGINE_MUSCLES.map((muscle) => {
    const g = byGroup[muscle] || { sets: 0, atoms: {} }
    const sets = round1(g.sets)
    const weekly = landmarksFor(muscle)
    const lm = { low: Math.round(weekly.low * scale), high: Math.round(weekly.high * scale) }
    const status = sets < lm.low ? 'under' : sets > lm.high ? 'over' : 'in'
    return {
      muscle,
      sets,
      landmarks: lm,
      status,
      atoms: Object.entries(g.atoms)
        .map(([atom, s]) => ({ atom, sets: round1(s) }))
        .sort((a, b) => b.sets - a.sets),
    }
  })
}

// ---- Engine v2: fatigue + recovery ------------------------------------------

const HOUR = 3600000

// Per-muscle recovery right now, plus the whole-body pool. Every working set
// deposits fatigue on the muscles it loads (contribution × fatigue-score coef ×
// RIR multiplier) which decays exponentially with the exercise's own recovery
// window as the time constant. Recovery % = how much of the muscle's capacity
// is free again; `readyAt` estimates when it crosses READY_THRESHOLD.
//
// Returns {
//   muscles: [{ muscle, recoveryPct, status:'ready'|'recovering', readyAt,
//               lastTrained }],           // one per ENGINE_MUSCLES
//   systemic: { pct, level:'fresh'|'moderate'|'high' },  // pct = strain, 100 = wrecked
// }
export function muscleRecovery(sessions, { now = Date.now() } = {}) {
  const since = startOfDay(now) - RECOVERY_LOOKBACK_DAYS * DAY
  // Keep each deposit as {f0, tau, ts} so the same sum-of-exponentials can be
  // re-evaluated at future times for the ready-time scan.
  const deposits = {} // engine muscle -> [{ f0, tau, ts }]
  const systemicDeposits = [] // [{ f0, ts }]
  const lastTrained = {} // engine muscle -> latest set timestamp

  forEachWorkingSet(sessions, since, (set, ex, db, s) => {
    // Old logs predate per-set timestamps — fall back to the session's date.
    const ts = Math.min(set.completedAt || s.date, now)
    const coef = FATIGUE_SCORE_COEF[db?.fatigueScore] || FATIGUE_SCORE_COEF[DEFAULT_FATIGUE_SCORE]
    const rf = rirFatigue(setRir(set))
    const [lo, hi] = db?.recoveryWindowHours || DEFAULT_RECOVERY_WINDOW
    const tau = (lo + hi) / 2 / RECOVERY_DECAY_FACTOR // hours

    const drop = (muscle, f0) => {
      if (!muscle) return
      ;(deposits[muscle] = deposits[muscle] || []).push({ f0, tau, ts })
      if (!lastTrained[muscle] || ts > lastTrained[muscle]) lastTrained[muscle] = ts
    }
    if (db && db.muscles && Object.keys(db.muscles).length) {
      for (const [atom, w] of Object.entries(db.muscles)) drop(ATOM_TO_GROUP[atom], w * coef * rf)
    } else {
      drop(muscleForExercise(ex.name), coef * rf)
    }
    systemicDeposits.push({
      f0: coef * rf * (db?.axialLoading ? AXIAL_MULT : 1) * (db?.equipment === 'free weight' ? FREE_WEIGHT_MULT : 1),
      ts,
    })
  })

  const decayedSum = (list, t, tauOverride) =>
    list.reduce((sum, d) => sum + d.f0 * Math.exp(-Math.max(0, t - d.ts) / HOUR / (tauOverride ?? d.tau)), 0)

  const muscles = ENGINE_MUSCLES.map((muscle) => {
    const list = deposits[muscle] || []
    const capacity = capacityFor(muscle)
    const pctAt = (t) => 100 * Math.max(0, 1 - decayedSum(list, t) / capacity)
    const recoveryPct = Math.round(pctAt(now))
    const ready = recoveryPct >= READY_THRESHOLD
    // Recovering: scan forward hour by hour for the crossing (the sum mixes
    // time constants, so there's no clean closed form — and this is cheap).
    let readyAt = null
    if (!ready) {
      for (let h = 1; h <= RECOVERY_LOOKBACK_DAYS * 24; h++) {
        if (pctAt(now + h * HOUR) >= READY_THRESHOLD) {
          readyAt = now + h * HOUR
          break
        }
      }
    }
    return {
      muscle,
      recoveryPct,
      status: ready ? 'ready' : 'recovering',
      readyAt,
      lastTrained: lastTrained[muscle] || null,
    }
  })

  const strain = Math.round(100 * Math.min(1, decayedSum(systemicDeposits, now, SYSTEMIC_TAU) / SYSTEMIC_CAPACITY))
  return { muscles, systemic: { pct: strain, level: systemicLevel(strain) } }
}

// "~6h" / "~1d 8h" until `readyAt`, or null once it's in the past.
export function formatReadyIn(readyAt, now = Date.now()) {
  if (!readyAt || readyAt <= now) return null
  const hours = Math.ceil((readyAt - now) / HOUR)
  if (hours < 24) return `~${hours}h`
  const d = Math.floor(hours / 24)
  const h = hours % 24
  return h ? `~${d}d ${h}h` : `~${d}d`
}
