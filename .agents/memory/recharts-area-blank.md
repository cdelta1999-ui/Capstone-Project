---
name: recharts Area renders blank
description: recharts 2.15 ComposedChart with <Area> can paint nothing (Area + its sibling Line both vanish) while Bar+Line charts render fine
---

# recharts `<Area>` ComposedChart renders blank

**Symptom:** A `ComposedChart` whose series are `<Area>` + `<Line>` paints axes,
grid, legend, and ReferenceArea but NO data series — both the Area and the Line
in that chart are invisible. A sibling `ComposedChart` using `<Bar>` + `<Line>`
on the same page renders fine. No console error. Data is present (axes/ticks
prove the data array reached the chart).

**Root cause:** recharts 2.15.x runs the Area's entrance animation through an
animated reveal `clipPath`. In fast-paint / headless / screenshot contexts that
clipPath can settle at zero width and it clips the *entire* series `<g>` group,
so the Line drawn alongside the Area disappears too. Bars are unaffected, which
is why Bar+Line charts still render.

**Fix:** set `isAnimationActive={false}` on the `<Area>` **and** its sibling
`<Line>`. This removes the animated clipPath and everything paints immediately.

**Why this fix over alternatives:** timing hacks, forced remounts, or delayed
render are unreliable; disabling the entrance animation is deterministic. The
only cost is losing the reveal animation on those charts — acceptable vs. a
blank chart, and arguably cleaner for a serious dashboard.

**How to apply (artifacts/data-app):** any new Area-based recharts chart should
default to `isAnimationActive={false}` on Area + Line. Don't trust a blank Area
chart you see in a screenshot to be "broken data" — check the series animation
first. (Distinct from the WebGL/3D blank-chart issue in `webgl-charts.md`, which
is about Context Lost + 2D fallbacks.)
