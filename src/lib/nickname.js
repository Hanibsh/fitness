// Nickname validation + a best-effort inappropriate-name filter.
//
// The nickname is optional, only ever shown to the user themselves (dashboard
// greeting), and stored in profiles.display_name. The filter is client-side
// and deliberately moderate: it normalises leetspeak/separators and checks a
// blocklist, using substring matches only for unambiguous terms and
// whole-word matches for short/ambiguous ones — so "class", "analysis",
// "Cassandra" etc. pass while "cl4ss-hole" style evasions are caught.

export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 20

// Common character-substitution ("leet") tricks, mapped back to letters.
const LEET = {
  0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 6: 'g', 7: 't', 8: 'b', 9: 'g',
  '@': 'a', '$': 's', '!': 'i', '+': 't', '€': 'e', '£': 'l',
}

// Unambiguous terms — blocked wherever they appear, even inside other text.
const SUBSTRING_BLOCK = [
  'fuck', 'shit', 'bitch', 'whore', 'slut', 'bastard',
  'asshole', 'dickhead', 'motherfuck', 'bullshit', 'dumbass', 'jackass',
  'nigger', 'nigga', 'faggot', 'wetback', 'beaner', 'tranny',
  'blowjob', 'handjob', 'cumshot', 'jizz', 'dildo', 'penis', 'vagina',
  'pedophile', 'molest', 'hitler', 'porn',
]

// Ambiguous/short terms — only blocked as a standalone word, so ordinary
// names and words that merely contain them ("class", "chick", "homophone",
// "Sexton" is a casualty we accept) don't get flagged.
// Includes 'cunt' and 'rapist' as whole words only, so real words that merely
// contain them (Scunthorpe, therapist) aren't caught — the classic false-
// positive trap.
const WORD_BLOCK = [
  'ass', 'arse', 'anal', 'anus', 'cum', 'sex', 'tit', 'tits', 'boob', 'boobs',
  'cock', 'dick', 'prick', 'twat', 'wank', 'wanker', 'fag', 'fags', 'coon',
  'nazi', 'pedo', 'pussy', 'homo', 'hoe', 'thot', 'milf', 'cunt',
  'rape', 'raped', 'rapes', 'rapist', 'retard', 'spic', 'chink', 'kike', 'kys',
]

function mapLeet(s) {
  return [...s].map((ch) => LEET[ch] ?? ch).join('')
}

function isBlocked(raw) {
  const lowered = mapLeet(raw.toLowerCase())
  // Variant 1: separators become spaces → for whole-word checks.
  const words = lowered.replace(/[^a-z]+/g, ' ').trim()
  // Variant 2: everything squashed together → for substring checks (catches
  // "f.u.c.k" / "f u c k").
  const solid = lowered.replace(/[^a-z]/g, '')
  // Variant 3: repeated letters collapsed → catches "fuuuuck".
  const collapsed = solid.replace(/(.)\1+/g, '$1')

  for (const term of SUBSTRING_BLOCK) {
    if (solid.includes(term) || collapsed.includes(term)) return true
  }
  const tokens = words.split(' ')
  for (const term of WORD_BLOCK) {
    if (tokens.includes(term)) return true
  }
  return false
}

// Returns { ok: true, value } with the cleaned value ('' means "clear it"),
// or { ok: false, error } with a user-facing message.
export function validateNickname(input) {
  const value = (input || '').trim().replace(/\s+/g, ' ')
  if (!value) return { ok: true, value: '' } // optional — empty clears it
  if (value.length < NICKNAME_MIN) return { ok: false, error: `Nickname needs at least ${NICKNAME_MIN} characters.` }
  if (value.length > NICKNAME_MAX) return { ok: false, error: `Nickname can be at most ${NICKNAME_MAX} characters.` }
  if (!/^[\p{L}\p{N} ._'-]+$/u.test(value)) {
    return { ok: false, error: "Only letters, numbers, spaces and . _ - ' are allowed." }
  }
  if (isBlocked(value)) return { ok: false, error: "That nickname isn't allowed — try another one." }
  return { ok: true, value }
}
