---
name: Streamlit dashboard quirks
description: Non-obvious gotchas for the Salifort Streamlit capstone dashboard (HTML injection, verification, matching the React app).
---

# Streamlit dashboard quirks

## Injecting raw HTML/SVG via `st.markdown(unsafe_allow_html=True)`
Streamlit runs the string through Markdown first. **Any line indented 4+ spaces becomes a `<pre><code>` block** and the markup shows as literal text instead of rendering. When building multi-line HTML/SVG, assemble the parts into a list and `"".join()` them (no leading whitespace, no newlines), so the whole thing is one flush-left HTML block.
**Why:** the custom Attrition-Flow SVG silently rendered as a code block when built with indented f-strings.
**How to apply:** any time you hand-build HTML/SVG strings for `st.markdown`, strip leading whitespace; prefer `"".join(parts)` over a triple-quoted indented template.

## Verifying the dashboard
The Streamlit app is **not a registered artifact** and is not on the `:80` shared proxy, so the `screenshot` tool can't reach it. Verify changes headlessly instead:
```python
from streamlit.testing.v1 import AppTest
at = AppTest.from_file("streamlit_app.py", default_timeout=200)
at.run()
assert not at.exception
```
Run it from inside `streamlit-dashboard/`. Check `at.exception`, `len(at.tabs)`, and scan `at.markdown` values for injected HTML markers.

## Matching the React data-app's "signature" visuals
The React app's standout charts are **hand-built SVG/CSS, not chart-library output** — e.g. the attrition flow is a custom animated SVG ribbon diagram (`SankeyFlow` in `artifacts/data-app/src/components/DashboardCharts.tsx`), not a Plotly/Recharts Sankey. To match them in Streamlit, replicate the SVG geometry + CSS classes (`.sankey-flow` dash animation, `.depth-lift` drop-shadows) rather than reaching for a Plotly equivalent (`go.Sankey` looks overcrowded and wrong).
**Why:** a Plotly Sankey was the original mismatch the user rejected.

## Plotly rounded bars
Rounded bar corners use `barcornerradius` (layout-level) — introduced in **Plotly 5.18**. Keep `requirements.txt` lower bound at `>=5.18`, or older satisfying installs render square bars.
