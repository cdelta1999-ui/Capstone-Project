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
- `streamlit-dashboard/` — standalone Python + Streamlit capstone rebuild (`streamlit_app.py` entry point, pinned `requirements.txt`, `data/hr_data.csv`, `.streamlit/config.toml`). Runs outside the pnpm workspace. `streamlit_app.py` is the conventional Streamlit Community Cloud entry filename.

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

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
