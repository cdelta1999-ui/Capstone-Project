---
name: Streamlit Community Cloud deploy gotchas
description: Why a Streamlit app that runs locally fails on Streamlit Community Cloud with "Oh no. Error running app."
---

# Streamlit Community Cloud deploy gotchas

## Health check is on the DEFAULT port (8501) — never pin server.port for Cloud
**Rule:** Do not set `[server] port = ...` in any `.streamlit/config.toml` that Cloud reads.
Cloud's working dir is the **repo root**, so it reads the **repo-root** `.streamlit/config.toml`
(plus `~/.streamlit`). It does NOT read a subfolder config when the main file is at root.

**Why:** Cloud probes `http://localhost:8501/healthz`. If a config forces another port
(e.g. 5000), the app binds that port, the 8501 health check gets `connection refused`, and the
UI shows "Oh no. Error running app." even though deps installed and the server started fine.
The smoking gun in the deploy log is a line like `Uvicorn server started on 0.0.0.0:5000`
followed by `health ... http://localhost:8501/healthz ... connection refused`.

**How to apply:** Keep any local/Replit port override on the **CLI** (`streamlit run app.py
--server.port 5000`) or in a subfolder config the Cloud CWD won't read — never in the repo-root
config. For Cloud, let Streamlit use its default port.

## Theme on Cloud: use a THEME-ONLY repo-root config
**Rule:** To style the Cloud app, put `[theme]` (and nothing else) in the **repo-root**
`.streamlit/config.toml`. A subfolder config is ignored by Cloud when the entrypoint is the
root shim, so a nested theme never takes effect there. Never add `[server]` to this root
config (see the port section above). Local/Render port settings belong in the subfolder
config that the local working directory reads.

**Why:** Most visual polish can be injected with CSS via `st.markdown(unsafe_allow_html=True)`,
but base theme tokens (primary colour, light/dark base, default text colour) only come from a
config Cloud actually reads — which is the repo-root one.

## Cloud prefers uv.lock / pyproject.toml over requirements.txt
**Rule:** If a repo-root `uv.lock` (or `pyproject.toml`) exists, Cloud installs with `uv-sync`
from the lock and **ignores `requirements.txt`** (it logs a "More than one requirements file
detected" WARN and states which it used).

**Why:** Editing `requirements.txt` to change/lower pins has zero effect on Cloud when a root
`uv.lock` is present. In a pnpm monorepo, Replit's Python package tooling can auto-create a root
`pyproject.toml` (`name = "repl-nix-workspace"`) + `uv.lock` when you install a Python stack;
those get committed and silently drive the Cloud install.

**How to apply:** To control Cloud deps, edit the lock/pyproject (or remove them so Cloud falls
back to requirements.txt) — not just requirements.txt.

## Don't assume "future" sandbox versions are missing on real PyPI
This Replit sandbox resolves far-future package versions (e.g. streamlit 1.58, pandas 3.0,
numpy 2.4). Cloud's PyPI actually has them — `uv-sync` installed them cleanly. So a deploy
failure is far more likely an app/runtime/config issue (like the port above) than an
"unsatisfiable version" problem. Confirm from the real deploy log before lowering pins blindly.
