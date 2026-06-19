---
name: Running Streamlit/Python apps in this pnpm artifact monorepo
description: How to run a Python + Streamlit app alongside the JS artifact system, and why it won't appear in the artifact proxy.
---

This is a pnpm + path-routing artifact monorepo, but you can host a Python/Streamlit app too:

- `createArtifact` does **not** support Streamlit/Python (only expo, data-visualization, mockup-sandbox, react-vite, slides, video-js). Keep the Streamlit project **outside** `artifacts/`, `lib/`, `scripts/` (e.g. top-level `streamlit-dashboard/`) so pnpm workspace globs don't treat it as a package.
- Run it with a **webview workflow**: `configureWorkflow({ name, command: "cd streamlit-dashboard && streamlit run app.py --server.port 5000", waitForPort: 5000, outputType: "webview" })`. This auto-adds a `[[ports]]` mapping (localPort 5000 → externalPort 5000) so the workspace can preview it.
- It is **not** wired into the artifact proxy on port 80 — `curl localhost:80/<path>` returns 404. It is only reachable on its own port (5000). `presentArtifact` won't find it (no registry entry).
- Verify rendering headlessly with `streamlit.testing.v1.AppTest` (set `default_timeout` high enough to train models): `at.run()`, then `at.radio[0].set_value(section).run()` and assert `not at.exception` per section. Catches runtime errors without a browser.
- `pandas.Styler.background_gradient` needs matplotlib — avoid it unless matplotlib is installed.

**Why:** Streamlit doesn't fit the JS artifact model; this is the working setup that keeps it runnable and previewable without breaking the pnpm workspace.
