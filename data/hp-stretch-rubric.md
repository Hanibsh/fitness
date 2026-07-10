# Hypertrophy Potential + Stretch-Mediated Hypertrophy — rubric + audit

Justification layer for the CSV's **Hypertrophy Potential** (`Low`/`Moderate`/
`High`/`Excellent`) and **Stretch-Mediated Hypertrophy** (`No`/`Partial`/`Yes`)
columns. Companion to `recovery-rubric.md` and `sfr-rubric.md`; built
2026-07-10 as the final pair of the data fact-check.

**Neither column is read by any app code yet** — checked (`grep` across
`src/`): only `sfr` and the fatigue/recovery/rest trio are wired into
`engine.js` / `advisor.js` today. This pass is data hygiene ahead of a future
feature, not a live-bug fix — unlike the SFR pass, nothing here changes what
the app does today.

## Hypertrophy Potential

Overall growth stimulus an exercise delivers — mechanical tension, target-muscle
isolation, controllable ROM. Should track loosely with SFR (a genuinely
low-stimulus lift can't have a "good" ratio no matter how low its fatigue is)
and with Stability/Equipment for the same reasons SFR does — see
`sfr-rubric.md`. It's not the same axis as Progressive Overload Potential
(can you keep adding load over time, e.g. barbell vs. fixed-increment machine)
— don't conflate the two.

## Stretch-Mediated Hypertrophy

Whether the exercise loads the target muscle meaningfully **at long
(stretched) muscle length**, not just whether it "feels like a stretch."

**The mechanism is genuinely contested in the literature** — worth stating
plainly rather than presenting as settled: training under load at long muscle
length is well-supported as producing hypertrophy *at least as good as*, and
in some studies modestly better than, standard training, including some
longitudinal (fascicle-length) growth. But the *distinct mechanism* framing
("sarcomerogenesis," a special extra growth pathway unlocked by stretch) is
contested — human evidence is thinner than the animal-model evidence, and
Stronger By Science's critique argues the effect is real but overhyped as
something categorically different from normal hypertrophy. **Practical
takeaway used here: this column is a descriptive tag** ("does this exercise
train the muscle at long length") not a claim that "Yes" exercises give bonus
gains — don't let future UI copy oversell it.

**Consistency check:** should track **Resistance Profile**. `Lengthened Bias`
(the exercise's resistance peaks at the stretched position) and training the
muscle at long length are close enough to the same mechanism that `Lengthened
Bias` + `Stretch-Mediated: No` would be a real contradiction. The reverse
isn't true, though — a `Shortened Bias` exercise (peak resistance at full
contraction) can still load real tension at the stretched end (cam-profile
machines, dead-hang start positions), so `Shortened Bias` + `Yes` is NOT
automatically a contradiction. Learned this the hard way — see below.

## Audit (`scripts/audit-hp-stretch.mjs`)

Distribution: Hypertrophy Potential — high 103, excellent 33, moderate 7,
low 5. Stretch-Mediated — none 75, partial 55, yes 18.

35 flags raised on the first pass. **Most turned out to be the audit rule
being wrong, not the data** — worth documenting so the same mistake isn't
repeated:

### Rule killed: "Shortened Bias + Stretch Yes = contradiction"
3 false positives — **Pec Deck Fly**, **Hanging Knee Raise**, **Seated Calf
Raise**. All three are real, well-known stretch-loaded exercises despite a
shortened-bias resistance curve: pec deck cams still load real tension at the
wide-arm stretch position, hanging knee raises stretch the abs/hip flexors
hard at the dead-hang start, and seated calf raises are a textbook deep-soleus-
stretch movement. Rule removed from the script (see its code comment).

### Near-duplicate grouping: mostly correct divergence, not errors
The "same primary muscle + type + equipment" grouping is too coarse to know
that exercises differ by **arm/joint position**, not just muscle+equipment.
Confirmed as legitimate, not flagged for change:
- **Triceps compounds/isolations**: skull crushers & overhead extensions
  (upper arm overhead → real long-head stretch) correctly show `Yes` next to
  presses/dips/pushdowns (upper arm neutral → correctly `None`).
- **Dragon Flag (none) vs. Toes to Bar (yes)**: Toes to Bar cycles a full
  dead-hang-to-contraction ROM; Dragon Flag is a controlled lever through a
  smaller arc. Legitimately different.
- **Decline Crunches (none) vs. Hanging Knee Raise (yes)**: hanging is a more
  complete stretch position than a decline bench. Legitimately different
  (decline crunches arguably could be `Partial` — low-confidence, no change).

### Judgment calls — reviewed with Hani, left as-is
- **Barbell Reverse Curl** (Hypertrophy Potential "low", vs. "high" on Dumbbell
  Reverse Curl and Seated One-Arm Forearm Reverse Curl): looked like an
  outlier at first (a barbell should out-load a dumbbell), but barbell reverse
  curls are commonly grip/wrist-limited — you fail on wrist fatigue before the
  target muscle (brachioradialis) is genuinely pushed, a well-known real
  drawback of the exercise. "Low" is defensible. **No change.**
- **Stiff Leg Deadlift** (Stretch-Mediated "none") **vs. Romanian Deadlift**
  ("yes"): both are hip-hinges, looked like the same movement rated
  differently. But their Resistance Profile already differs (SLDL =
  `Balanced`, RDL = `Lengthened Bias`) — the DB already treats them as
  mechanically distinct (RDL deliberately coached for a deep hamstring
  stretch; SLDL more of a pull-from-the-floor variant). A legitimate existing
  distinction, not an oversight. **No change.**
- **Face Pull** (Hypertrophy Potential "low", vs. "high" on Cable Rear Delt
  Fly — same muscles, same equipment, SFR "good"): flagged as the one
  confident recommendation (a "good" SFR is hard to reconcile with genuinely
  low stimulus). **Hani's call: leave at "low."** Trusting the original
  rating.

## Outcome

**Zero CSV changes this pass.** Every flag either turned out to be a bad rule
(fixed in the script) or a defensible existing rating once the full context
was checked. The data was already in good shape here — a useful result in
its own right, and this closes out the data fact-check: all 6 columns
originally scoped (Fatigue Score, Recovery Window, Rest Time, SFR,
Hypertrophy Potential, Stretch-Mediated Hypertrophy) have now been checked.
