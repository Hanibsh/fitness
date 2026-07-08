// Hypertrophy engine — tunable coefficients.
//
// Every categorical→number mapping the engine uses lives HERE, so the formulas
// stay readable and the model can be dialled in without hunting through code.
// These are evidence-informed starting points, not gospel — tune freely.

// ---- RIR effectiveness -----------------------------------------------------
// How much hypertrophic stimulus a working set delivers by proximity to
// failure. Sets at RIR 0–2 count fully (the sweet spot the app already coaches),
// tapering as you leave more reps in reserve. Junk-close-to-nothing past ~6.
export const RIR_EFFECTIVENESS = {
  0: 1.0, 1: 1.0, 2: 1.0, 3: 0.95, 4: 0.88, 5: 0.75,
  6: 0.6, 7: 0.45, 8: 0.33, 9: 0.25, 10: 0.2,
}
// When RIR wasn't logged, assume a hard-ish set but don't reward the missing data.
export const RIR_EFFECTIVENESS_DEFAULT = 0.9

export function rirEffectiveness(rir) {
  if (rir == null || rir === '') return RIR_EFFECTIVENESS_DEFAULT
  const r = Math.max(0, Math.min(10, Math.round(Number(rir))))
  return Number.isFinite(r) ? RIR_EFFECTIVENESS[r] : RIR_EFFECTIVENESS_DEFAULT
}

// ---- Muscle model ----------------------------------------------------------
// The muscle groups the engine reports volume for (finer than the taxonomy's 6
// so arms/legs are actionable). Sub-muscle atoms from the exercise DB roll up
// into these; the drill-down shows the atoms.
export const ENGINE_MUSCLES = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs',
]

// Exercise-DB muscle atom → engine muscle group. A couple are judgement calls
// (adductors→Quads, abductors→Glutes) and easy to retune here.
export const ATOM_TO_GROUP = {
  'Upper Chest': 'Chest', 'Middle Chest': 'Chest', 'Lower Chest': 'Chest',
  Lats: 'Back', 'Mid Back': 'Back', Rhomboids: 'Back', 'Upper Traps': 'Back', 'Lower Traps': 'Back', 'Spinal Erectors': 'Back',
  'Front Delts': 'Shoulders', 'Side Delts': 'Shoulders', 'Rear Delts': 'Shoulders', 'Rotator Cuff': 'Shoulders',
  Biceps: 'Biceps', Brachialis: 'Biceps',
  Triceps: 'Triceps',
  Brachioradialis: 'Forearms', 'Wrist Flexors': 'Forearms', 'Wrist Extensors': 'Forearms',
  Quadriceps: 'Quads', Adductors: 'Quads',
  Hamstrings: 'Hamstrings',
  'Glute Max': 'Glutes', Abductors: 'Glutes',
  Gastrocnemius: 'Calves', Soleus: 'Calves',
  'Rectus Abdominis': 'Abs', 'Transverse Abdominis': 'Abs', Obliques: 'Abs', 'Hip Flexors': 'Abs',
}

// ---- Weekly volume landmarks (effective sets per muscle group) -------------
// Rough guidance for a productive weekly range — a floor worth clearing and a
// ceiling past which more is usually junk. Guidance only; the app never forces
// deloads (fatigue is managed by trimming volume — see app thesis).
export const VOLUME_LANDMARKS = {
  default: { low: 10, high: 20 },
  Abs: { low: 6, high: 16 },
  Calves: { low: 8, high: 16 },
  Forearms: { low: 4, high: 12 },
}

export function landmarksFor(muscle) {
  return VOLUME_LANDMARKS[muscle] || VOLUME_LANDMARKS.default
}
