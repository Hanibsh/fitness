# Stimulus-to-Fatigue Ratio (SFR) — rubric + audit

Justification layer for the CSV's **Stimulus-to-Fatigue Ratio (SFR)** column
(`Poor` / `Average` / `Good` / `Excellent`). Companion to `recovery-rubric.md`
(fatigue/recovery/rest); built 2026-07-10 as the SFR pass of the data
fact-check. `Hypertrophy Potential` and `Stretch-Mediated Hypertrophy` remain a
separate later pass.

## What SFR is, and why it's different from the recovery columns

SFR (popularized by Mike Israetel / RP) = **how much muscle-growth stimulus an
exercise delivers to its target muscle relative to the total fatigue it costs
the body** (systemic + joint + stabilizer). It is a *derived* rating, not an
independent physiological fact — so unlike Recovery Window it can't be
"measured," it has to stay **internally consistent** with columns we've already
vetted. That consistency is the entire audit.

## Where SFR feeds the app

`src/lib/advisor.js` rule R1: when a muscle is past its weekly volume ceiling,
the advisor recommends trimming the **worst-SFR exercise first**
(`SFR_RANK` in `engineConfig.js`, higher = more worth keeping; ties break toward
the more fatiguing lift). So an under-rated SFR makes the app tell you to drop a
good movement before junk work — the ratings have real downstream weight.

## What raises / lowers SFR (the rubric)

**Higher SFR** (Good → Excellent):
- Machine / cable — guided path, stable, isolates the target with little
  stabilizer or systemic cost. The literature's go-to *high-SFR* examples are
  exactly these: **leg press, hack squat, lat pulldown, machine chest press,
  cable work.**
- Very stable setup (chest-supported, bench-braced, pad-supported).
- Strong target stimulus (high/excellent hypertrophy potential).
- Low absolute fatigue for the stimulus delivered.

**Lower SFR** (Average → Poor):
- Free-weight **axial** compounds — squat, deadlift, barbell row: huge systemic
  fatigue relative to the per-muscle stimulus. Textbook *low-SFR*.
- Unstable / highly unstable — energy leaks into balancing instead of the target
  (walking lunge, Bulgarian split squat, muscle-ups).
- Very high skill — coordination/technique cost.

## Audit rules (`scripts/audit-sfr.mjs`)

Hard contradictions (flag): R1 SFR excellent + (highly) unstable; R2 SFR
excellent + free-weight + axial; R3 SFR excellent + poor/moderate hypertrophy;
R4 stable machine/cable + high hypertrophy + low fatigue but rated ≤ average
(under-rating); R6 SFR excellent + very-high skill. Plus R5 near-duplicate
divergence (same primary muscle/type/equipment, SFR spanning ≥ 2 bands) and a
soft heuristic-gap flag. Re-run after any SFR edit.

## Findings (2026-07-10)

The hard over-rating rules (R1/R2/R3/R6) caught **nothing** — the data never
rates an unstable / axial / low-stimulus / high-skill movement as excellent SFR.
Every flag pointed **one direction**: machine movements rated *below* what the
concept implies. Hani approved all fixes below; applied directly to the CSV.

| Exercise | SFR before → after | Why |
|---|---|---|
| Leg Press | average → **good** | Classic high-SFR quad machine (excellent hypertrophy, moderate fatigue); below-median was indefensible |
| Hack Squats Machine | average → **good** | Archetypal high-SFR quad machine — big stimulus, less lower-back/systemic cost than a barbell squat |
| Smith Machine Hip Thrust | average → **good** | Very stable machine, excellent hypertrophy — strong ratio |
| Lat Pulldown | average → **good** | Named high-SFR movement in the literature (lat stimulus, low lower-back cost) |
| Hack Squat Calf Raise | poor → **excellent** | Stale artifact: "poor" was set when the row was wrongly fatigue-5. Now fatigue-1 machine work, excellent hypertrophy; its sibling machine calf raises are good/excellent/excellent |
| Barbell Hip Thrust | poor → **average** | "Poor" (bottom rung) is for genuinely bad ratios; a stable, glute-specific movement isn't that |
| Single-Leg DB Hip Thrust | poor → **average** | Same as above |

Distribution after: good 74 · excellent 39 · average 27 · poor 8 (was 70 / 38 /
29 / 11). Audit re-run: **0 flags**.
