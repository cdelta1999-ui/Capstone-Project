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
