---
name: recharts charts blank in screenshots/print — use the wipe pattern
description: recharts entrance animations (Area clipPath bug + grow-from-zero) render blank in captures/print; the screenshot-safe fix is disabling recharts animation and revealing via a CSS clip wipe.
---

# recharts charts render blank in screenshots / print

Two distinct causes, **same fix** (turn recharts' own animation off), in a
dashboard that must be screenshot/print/export-safe (e.g. an Insight Report tab
+ `@media print` CSS).

## Cause 1 — Area clipPath collapse (permanent blank, even when settled)

**Symptom:** A `ComposedChart` of `<Area>` + `<Line>` paints axes/grid/legend
but NO data series — both the Area AND its sibling Line vanish. A neighboring
`<Bar>`+`<Line>` chart renders fine. No console error; data is present.

**Root cause:** recharts 2.15.x animates the Area entrance through a reveal
`clipPath`. In fast-paint/headless/screenshot contexts that clipPath settles at
zero width and clips the entire series `<g>`, taking the Line with it.

## Cause 2 — grow-from-zero caught mid-entrance (transient blank on capture)

**Symptom:** Bar/line/scatter charts are blank in a fresh-load screenshot even
though they render fine when you actually watch the page.

**Root cause:** Every screenshot/print/export is a *fresh navigation*. recharts'
default grow-from-zero entrance is still at (or near) height 0 when the capture
settles, so the chart looks blank. This is NOT a data bug — it's timing.

## The fix (the codebase convention — do NOT revert it)

For any screenshot/print/export-facing recharts chart, **disable recharts'
entrance animation** (`isAnimationActive={false}` on every series) and supply
the motion with a **CSS clip "wipe"** instead: a wrapper class
(`.chart-wipe`) animating `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)` with
`animation-fill-mode: both`. The wipe reveals content that is *already at full
size*, so even a half-revealed capture shows real bars/lines — it never shows
nothing.

**Why this over alternatives:** timing hacks / forced remounts / delayed render
are nondeterministic; disabling recharts animation is deterministic and the wipe
keeps visible entrance motion. An architect review explicitly flagged "do not
revert to recharts grow animations for screenshot/export-facing charts."

**How to apply (artifacts/data-app):**
- New recharts chart that should animate in → default to the wipe pattern, not
  recharts native animation.
- `.chart-wipe` MUST have `animation: none; clip-path: none` overrides under both
  `@media print` AND `prefers-reduced-motion` so those modes show full charts.
- A scroll-replay wrapper that remounts a chart to re-run its entrance must NOT
  bump its replay key on the *first* in-view (only on RE-entry) — `useInView`
  starts `false`, so gate on a "has entered once" ref or the first real reveal
  remounts the chart mid-capture.
- Don't trust a blank recharts chart in a screenshot to mean "broken data" —
  check series animation / capture timing first.

Distinct from the WebGL/3D blank-chart issue (`webgl-charts.md`): 3D charts go
blank because the GL context inits *after* the capture settles and (unless they
have a 2D fallback) there's nothing to show yet — a separate, expected concern.
