// How the exercise DB's five `equipment` values group into the two things people
// actually ask: can I do this at home, or do I need a gym?
//
// Deliberately plain data with no import of exercises.json — the profile page
// reads these too, and it has no other reason to pull in the 141KB exercise
// database. The values must stay in step with the CSV's equipment vocabulary
// (`ENUMS.equipment` in scripts/lint-exercises.mjs).
//
// "At home" is bodyweight + resistance band. Bench-only movements are already
// inside `bodyweight` (Bench Dips, Incline Push-Up…), so a chair standing in for
// a bench needs no extra encoding. It's an optimistic label: a few bodyweight
// moves want a pull-up bar or straps (Pull Up, Muscle-Up, TRX Row, Toes to Bar).
// Telling those apart needs apparatus data the DB doesn't carry — see the
// Apparatus-column option if that ever matters.
export const AT_HOME_EQUIPMENT = ['bodyweight', 'resistance band']

export const GYM_EQUIPMENT = ['free weight', 'machine', 'cable']

export const ALL_EQUIPMENT = [...AT_HOME_EQUIPMENT, ...GYM_EQUIPMENT]
