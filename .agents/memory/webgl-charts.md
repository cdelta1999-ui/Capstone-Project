---
name: WebGL/3D charts in data-app
description: How to make react-three-fiber charts survive the preview/screenshot environment and stay smooth
---

# WebGL / 3D charts (react-three-fiber)

**Rule:** every WebGL/3D chart must be wrapped in a `WebGLBoundary` with a 2D
fallback component, and animate via refs — never per-frame React state.

**Why:** the Replit preview/screenshot environment routinely emits
`THREE.WebGLRenderer: Context Lost.` (limited GPU contexts, multiple canvases).
A 3D chart with no fallback renders blank — this exact bug already bit us twice
(RiskBubbles had no fallback and showed nothing). The screenshot tool also has
no WebGL, so screenshots always show the 2D fallback even when the real browser
renders 3D fine — do not "fix" a blank 3D chart based on a screenshot alone.

**How to apply (in `artifacts/data-app`):**
- Wrap canvases in `components/3d/WebGLBoundary.tsx`; it guards `isWebGLAvailable()`
  and renders a fallback on render error. Pair each 3D chart with a 2D Recharts
  fallback (e.g. `DeptBars` → `DeptAttritionBar`).
- Fallback prop shapes can differ from the API type — map them at the call site
  (e.g. dept `left/total` → fallback `leftCount/totalCount`).
- In `useFrame`, mutate `mesh.scale`/`mesh.position` through a `useRef`, not
  `setState`. Per-frame `setState` (once per bar per frame) causes avoidable jank.
- `three` needs `@types/three` (match the `three` version, e.g. `^0.184.0`) in
  devDependencies or `tsc --noEmit` fails with TS7016.

## Layered live/fallback pattern + capture-mode (export safety)

`Live3D` (in `WebGLBoundary.tsx`) stacks a 2D `.webgl-capture-fallback` behind a
`.webgl-live-layer`; `ReadySignal` (a `useFrame` that fires `onReady` once) fades
the fallback out and the canvas in after the first GL frame, so there is no
slow-init blank.

**Constraint — the fallback is hidden (`opacity-0`) once the canvas paints.** Only
two things restore it: `@media print` and the `.capture-mode` root class. So:
- Browser-native screenshots and print are safe (print forces the fallback; native
  screenshots read the GL framebuffer).
- Any DOM-capture export that *can't* read WebGL (html2canvas-style) MUST add
  `capture-mode` to a root element before capturing, or it grabs a blank canvas
  with the fallback hidden. The Insight Report is safe because it renders its own
  2D Recharts instead of screenshotting the dashboard DOM.
**Why:** keeps the "dashboard stays screenshot/print/export safe" invariant true
for every capture path, not just print.

## Horizontal-bar fallback gotcha

A Recharts `layout="vertical"` (horizontal bars) chart used as an absolutely
positioned (`inset:0`) fallback layer must set `isAnimationActive={false}` on its
`<Bar>`. **Why:** the animated dimension is the value-axis *width*; when the
absolute container sizes a tick late, the bar animates to a stale 0-width target
and stays collapsed (axes render, bars don't). Vertical/column fallbacks animate
*height* off the category band and are unaffected, so only horizontal-bar
fallbacks need this.
