# Salifort Motors HR Analytics

Analyzes ~12,000 employee records to predict turnover and recommend retention actions. Available as a JS/React data app and as a Python + Streamlit capstone dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- `cd streamlit-dashboard && streamlit run streamlit_app.py --server.port 5000` — run the Python + Streamlit dashboard (port 5000)
- Streamlit Community Cloud deploy: set main file to `streamlit_app.py` (repo-root shim that runs the dashboard) and Python 3.12 in advanced settings. Root `requirements.txt` is what Cloud installs from.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/data-app/` — JS/React interactive HR dashboard (Vite).
- `artifacts/api-server/` — Express API; HR metric/profile logic in `src/routes/hr.ts` (source of truth for thresholds).
- `artifacts/api-server/data/hr_data.csv` — original dataset (14,999 rows).
- `streamlit-dashboard/` — standalone Python + Streamlit capstone rebuild (`streamlit_app.py` entry point, pinned `requirements.txt`, `data/hr_data.csv`, `.streamlit/config.toml` with the local `[server]` port + theme). Runs outside the pnpm workspace. `streamlit_app.py` is the conventional Streamlit Community Cloud entry filename.
- Repo root: `streamlit_app.py` (thin shim Streamlit Cloud runs) and `.streamlit/config.toml` (**theme-only** — Cloud reads config from the repo root; do not add `[server]` here).

## Architecture decisions

- The Streamlit dashboard mirrors the React data-app's look via `inject_css()` (aurora gradient `.stApp` background, glassmorphism cards, Inter font, styled top tabs) plus an `apply_theme()` helper that makes every Plotly figure transparent so the backdrop shows through. Streamlit can't replicate the React app's R3F 3D / Framer Motion exactly, so `px.scatter_3d` (leaver clusters) and a Plotly `go.Sankey` (attrition flow) stand in for the signature visuals; KPI/profile cards use custom HTML with a CSS entry animation.
- Streamlit theme config is split by deploy target: the **repo-root** `.streamlit/config.toml` is **theme-only** (Streamlit Community Cloud runs from the repo root via the `streamlit_app.py` shim and only reads config from there), while `streamlit-dashboard/.streamlit/config.toml` keeps the `[server]` port for the local Replit workflow and Render. Never put `[server] port` in the root config — Cloud health-checks its own default port and a forced port breaks the deploy.
- Navigation uses `st.tabs` (client-side), so all four sections render once per run; data is cached with `@st.cache_data` and models with `@st.cache_resource` to keep that cheap.

## Product

Employee turnover & retention analytics for Salifort Motors (Google Advanced Data Analytics capstone):

- Overview/KPIs: attrition rate, satisfaction, hours, tenure, promotion rate.
- Exploratory analysis: attrition by department, salary, projects, tenure; satisfaction/evaluation clusters; correlation heatmap.
- Predictive model: Logistic Regression / Decision Tree / Random Forest comparison, confusion matrix, feature importance (Random Forest is the champion).
- Churn profiles & recommendations: Burned Out Stars, Unhappy Underperformers, Apathetic Middle, plus risk factors and HR actions.

The Streamlit and JS dashboards share the same metric definitions; the Streamlit app de-duplicates the dataset to ~12,000 unique records (capstone convention), so exact numeric parity with the raw-row JS app is not expected.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
