"""
Salifort Motors: Employee Turnover & Retention Dashboard
Python + Streamlit rebuild of the capstone project.

Identifying who leaves, why, and where to act — based on ~12,000 employee records.

The presentation layer mirrors the React "People Analytics" command center:
an aurora gradient backdrop, glassmorphism cards, themed Plotly visuals, and
signature charts (Sankey attrition flow, 3D leaver clusters, dumbbell brain
drain). The data and model logic are unchanged so every metric stays in parity.
"""

from pathlib import Path

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components
from plotly.subplots import make_subplots
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

DATA_PATH = Path(__file__).parent / "data" / "hr_data.csv"

# --------------------------------------------------------------------------- #
# Brand palette (mirrors the React data-app)
# --------------------------------------------------------------------------- #
INK = "#0f172a"
SLATE = "#475569"
MUTED = "#94a3b8"
INDIGO = "#6366f1"
VIOLET = "#8b5cf6"
SKY = "#0ea5e9"
TEAL = "#14b8a6"
AMBER = "#f59e0b"
ROSE = "#f43f5e"

LEFT_COLOR = ROSE
STAYED_COLOR = TEAL

PLOT_FONT = "Inter, system-ui, -apple-system, sans-serif"
CHART_CONFIG = {"displayModeBar": False}

# Custom continuous colour scales
ATTR_SCALE = [[0.0, "#fee2e2"], [0.5, "#fb7185"], [1.0, "#e11d48"]]
IMP_SCALE = [[0.0, "#e0e7ff"], [0.5, "#818cf8"], [1.0, "#4338ca"]]


# --------------------------------------------------------------------------- #
# Data loading & preparation
# --------------------------------------------------------------------------- #
@st.cache_data
def load_data() -> pd.DataFrame:
    """Load the HR dataset, fix the column-name typo, and drop duplicate rows.

    The raw capstone file has 14,999 rows but 3,008 are exact duplicates.
    Removing them leaves 11,991 unique employee records (~12,000).
    """
    df = pd.read_csv(DATA_PATH)
    df = df.rename(columns={"average_montly_hours": "average_monthly_hours"})
    df = df.drop_duplicates().reset_index(drop=True)
    return df


@st.cache_data
def raw_row_count() -> int:
    return sum(1 for _ in open(DATA_PATH)) - 1


@st.cache_resource
def train_models(df: pd.DataFrame) -> dict:
    """Train Logistic Regression, Decision Tree and Random Forest models
    to predict attrition, returning fitted models and evaluation metrics."""
    salary_order = {"low": 0, "medium": 1, "high": 2}
    model_df = df.copy()
    model_df["salary_ordinal"] = model_df["salary"].map(salary_order)
    model_df = pd.get_dummies(model_df, columns=["Department"], prefix="dept", dtype=int)

    feature_cols = [
        "satisfaction_level",
        "last_evaluation",
        "number_project",
        "average_monthly_hours",
        "time_spend_company",
        "Work_accident",
        "promotion_last_5years",
        "salary_ordinal",
    ] + [c for c in model_df.columns if c.startswith("dept_")]

    X = model_df[feature_cols]
    y = model_df["left"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, stratify=y, random_state=42
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    results = {}
    estimators = {
        "Logistic Regression": (
            LogisticRegression(max_iter=1000, random_state=42),
            True,
        ),
        "Decision Tree": (
            DecisionTreeClassifier(max_depth=6, random_state=42),
            False,
        ),
        "Random Forest": (
            RandomForestClassifier(
                n_estimators=200, max_depth=None, n_jobs=-1, random_state=42
            ),
            False,
        ),
    }

    for name, (est, needs_scaling) in estimators.items():
        if needs_scaling:
            est.fit(X_train_scaled, y_train)
            preds = est.predict(X_test_scaled)
            proba = est.predict_proba(X_test_scaled)[:, 1]
        else:
            est.fit(X_train, y_train)
            preds = est.predict(X_test)
            proba = est.predict_proba(X_test)[:, 1]

        results[name] = {
            "model": est,
            "accuracy": accuracy_score(y_test, preds),
            "precision": precision_score(y_test, preds),
            "recall": recall_score(y_test, preds),
            "f1": f1_score(y_test, preds),
            "roc_auc": roc_auc_score(y_test, proba),
            "confusion": confusion_matrix(y_test, preds),
        }

    rf = results["Random Forest"]["model"]
    importances = (
        pd.DataFrame(
            {"feature": feature_cols, "importance": rf.feature_importances_}
        )
        .sort_values("importance", ascending=False)
        .reset_index(drop=True)
    )

    return {
        "results": results,
        "feature_importance": importances,
        "n_test": len(y_test),
        "n_train": len(y_train),
    }


def leaver_profiles(df: pd.DataFrame):
    """Split leavers into the three churn segments used across the dashboard."""
    leavers = df[df["left"] == 1]
    burned = leavers[
        (leavers["last_evaluation"] >= 0.75)
        & (leavers["average_monthly_hours"] >= 230)
    ]
    unhappy = leavers[
        (leavers["last_evaluation"] < 0.60) & (leavers["satisfaction_level"] < 0.20)
    ]
    apathetic = leavers.drop(burned.index).drop(unhappy.index, errors="ignore")
    return leavers, burned, unhappy, apathetic


# --------------------------------------------------------------------------- #
# Styling helpers
# --------------------------------------------------------------------------- #
def apply_theme(fig: go.Figure, height: int | None = None, legend: bool = True):
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family=PLOT_FONT, color=SLATE, size=13),
        margin=dict(t=12, r=12, b=8, l=8),
        hoverlabel=dict(font_family=PLOT_FONT, bgcolor="white"),
        colorway=[INDIGO, TEAL, ROSE, AMBER, VIOLET, SKY],
        barcornerradius=8,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            x=0,
            bgcolor="rgba(0,0,0,0)",
            font=dict(color=SLATE),
        ),
    )
    if height:
        fig.update_layout(height=height)
    if not legend:
        fig.update_layout(showlegend=False)
    grid = "rgba(148,163,184,0.18)"
    line = "rgba(148,163,184,0.35)"
    fig.update_xaxes(showgrid=True, gridcolor=grid, zeroline=False, linecolor=line)
    fig.update_yaxes(showgrid=True, gridcolor=grid, zeroline=False, linecolor=line)
    return fig


def attrition_flow_svg(
    total: int, stayed: int, left: int, segments: list[tuple[str, int, str]]
) -> str:
    """Hand-built SVG flow diagram mirroring the React SankeyFlow component:
    All Employees -> Stayed / Left -> leaver profiles. Profiles are spread into
    even vertical slots so their labels never collide, and an "Other leavers"
    node is added if the profiles don't fully account for every leaver."""
    W, H = 680, 300
    col1x, col2x, col3x = 60, 250, 432
    node_w = 15
    pad_top = 16
    usable_h = H - pad_top * 2
    branch_gap = 26
    avail_h = usable_h - branch_gap

    total = max(total, 1)
    left = max(left, 1)
    stayed_h = stayed / total * avail_h
    left_h = left / total * avail_h
    stayed_y = pad_top
    left_y = pad_top + stayed_h + branch_gap

    segs = list(segments)
    other = left - sum(c for _, c, _ in segs)
    if other > 1:
        segs.append(("Other leavers", other, SLATE))

    slot_h = usable_h / max(len(segs), 1)
    cursor = left_y
    nodes = []
    for i, (name, count, color) in enumerate(segs):
        src_h = max(count / left * left_h, 1.5)
        src_y = cursor
        cursor += count / left * left_h
        node_h = max(count / left * usable_h, 16)
        slot_center = pad_top + i * slot_h + slot_h / 2
        nodes.append((name, count, color, src_y, src_h, node_h, slot_center - node_h / 2))

    def ribbon(x1, y1, h1, x2, y2, h2, color, op):
        mx = (x1 + x2) / 2
        d = (
            f"M{x1:.1f},{y1:.1f} C{mx:.1f},{y1:.1f} {mx:.1f},{y2:.1f} {x2:.1f},{y2:.1f} "
            f"L{x2:.1f},{y2 + h2:.1f} C{mx:.1f},{y2 + h2:.1f} {mx:.1f},{y1 + h1:.1f} {x1:.1f},{y1 + h1:.1f} Z"
        )
        return f'<path d="{d}" class="depth-lift-soft" fill="{color}" opacity="{op}"/>'

    def spine(x1, y1, h1, x2, y2, h2, color):
        mx = (x1 + x2) / 2
        cy1 = y1 + h1 / 2
        cy2 = y2 + h2 / 2
        d = f"M{x1:.1f},{cy1:.1f} C{mx:.1f},{cy1:.1f} {mx:.1f},{cy2:.1f} {x2:.1f},{cy2:.1f}"
        return (
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.5" '
            f'stroke-opacity="0.5" stroke-linecap="round" class="sankey-flow"/>'
        )

    def rect(x, y, h, color):
        return (
            f'<rect class="depth-lift" x="{x:.1f}" y="{y:.1f}" width="{node_w}" '
            f'height="{h:.1f}" rx="4" fill="{color}"/>'
        )

    def label(x, y, name, count, anchor="start", name_size=11.0):
        a = f' text-anchor="{anchor}"' if anchor != "start" else ""
        return (
            f'<text x="{x:.1f}" y="{y - 3:.1f}" font-size="{name_size}" fill="#334155" font-weight="600"{a}>{name}</text>'
            f'<text x="{x:.1f}" y="{y + 11:.1f}" font-size="9.5" fill="#64748b"{a}>{count:,}</text>'
        )

    p: list[str] = []
    p.append(ribbon(col1x + node_w, pad_top, stayed_h, col2x, stayed_y, stayed_h, TEAL, 0.20))
    p.append(ribbon(col1x + node_w, pad_top + stayed_h, left_h, col2x, left_y, left_h, ROSE, 0.20))
    for name, count, color, src_y, src_h, node_h, y in nodes:
        p.append(ribbon(col2x + node_w, src_y, src_h, col3x, y, node_h, color, 0.26))
    p.append(spine(col1x + node_w, pad_top, stayed_h, col2x, stayed_y, stayed_h, TEAL))
    p.append(spine(col1x + node_w, pad_top + stayed_h, left_h, col2x, left_y, left_h, ROSE))
    for name, count, color, src_y, src_h, node_h, y in nodes:
        p.append(spine(col2x + node_w, src_y, src_h, col3x, y, node_h, color))

    p.append(rect(col1x, pad_top, avail_h, INDIGO))
    p.append(label(col1x - 7, pad_top + avail_h / 2, "All", total, anchor="end"))
    p.append(rect(col2x, stayed_y, stayed_h, TEAL))
    p.append(label(col2x + node_w + 8, stayed_y + stayed_h / 2, "Stayed", stayed))
    p.append(rect(col2x, left_y, left_h, ROSE))
    p.append(label(col2x + node_w + 8, left_y + left_h / 2, "Left", left))
    for name, count, color, src_y, src_h, node_h, y in nodes:
        p.append(rect(col3x, y, node_h, color))
        p.append(label(col3x + node_w + 8, y + node_h / 2, name, count, name_size=10.5))

    inner = "".join(p)
    return (
        f'<div class="flow-wrap"><svg viewBox="0 0 {W} {H}" '
        f'preserveAspectRatio="xMidYMid meet" '
        f'style="width:100%;height:330px;display:block;overflow:visible">{inner}</svg></div>'
    )


def render_rotating_3d(fig: go.Figure, height: int = 560, div_id: str = "cluster3d") -> None:
    """Render a Plotly 3D figure that continuously auto-rotates its camera, then
    pauses while the user drags/zooms to explore and resumes after a short idle.
    Honours prefers-reduced-motion. Embedded via components.html so the rotation
    loop can drive the camera with Plotly.relayout (st.plotly_chart can't)."""
    html = fig.to_html(
        include_plotlyjs="cdn",
        full_html=False,
        div_id=div_id,
        config={"displayModeBar": False, "responsive": True},
    )
    script = """
<style>html,body{margin:0;background:transparent;overflow:hidden}</style>
<script>
(function(){
  var R=1.8, ELEV=0.85, STEP=0.006, ang=Math.PI*0.25, dragging=false, resumeAt=0;
  function resumeSoon(ms){ dragging=false; resumeAt=Date.now()+(ms||3000); }
  function start(){
    var gd=document.getElementById('__DIV__');
    if(typeof Plotly==='undefined' || !gd || !gd._fullLayout){ return setTimeout(start,200); }
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){ return; }
    gd.addEventListener('pointerdown', function(){ dragging=true; }, {passive:true});
    gd.addEventListener('wheel', function(){ resumeSoon(4000); }, {passive:true});
    window.addEventListener('pointerup', function(){ resumeSoon(3000); });
    window.addEventListener('pointercancel', function(){ resumeSoon(3000); });
    window.addEventListener('blur', function(){ resumeSoon(1500); });
    setInterval(function(){
      if(dragging || Date.now()<resumeAt) { return; }
      if(document.visibilityState && document.visibilityState!=='visible') { return; }
      ang+=STEP;
      Plotly.relayout(gd, {'scene.camera.eye': {x:R*Math.cos(ang), y:R*Math.sin(ang), z:ELEV}});
    }, 60);
  }
  start();
})();
</script>
""".replace("__DIV__", div_id)
    components.html(html + script, height=height, scrolling=False)


def inject_css() -> None:
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        :root { --ink:#0f172a; --slate:#475569; --muted:#94a3b8; --indigo:#6366f1; }

        @keyframes rise { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform:none; } }
        .kpi-card:nth-child(1){animation-delay:.02s} .kpi-card:nth-child(2){animation-delay:.06s}
        .kpi-card:nth-child(3){animation-delay:.10s} .kpi-card:nth-child(4){animation-delay:.14s}
        .kpi-card:nth-child(5){animation-delay:.18s} .kpi-card:nth-child(6){animation-delay:.22s}
        .kpi-card:nth-child(7){animation-delay:.26s} .kpi-card:nth-child(8){animation-delay:.30s}

        @keyframes sankeyFlow { to { stroke-dashoffset:-28; } }
        .sankey-flow { stroke-dasharray:5 9; animation: sankeyFlow 1.2s linear infinite; }
        .depth-lift { filter: drop-shadow(2px 3px 2px rgba(30,41,59,0.26)); }
        .depth-lift-soft { filter: drop-shadow(0 4px 5px rgba(30,41,59,0.14)); }
        .flow-wrap { width:100%; padding:6px 4px 2px; }
        .flow-wrap svg text { font-family:'Inter', system-ui, sans-serif; }
        /* ---- Ambient motion ---- */
        @keyframes floatA { 0%,100%{ transform: translate(0,0) scale(1); } 50%{ transform: translate(70px,46px) scale(1.14); } }
        @keyframes floatB { 0%,100%{ transform: translate(0,0) scale(1); } 50%{ transform: translate(-56px,34px) scale(1.1); } }
        @keyframes cardIn { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform:none; } }
        @keyframes logoFloat { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-4px); } }

        .stApp::before, .stApp::after {
            content:""; position:fixed; border-radius:50%;
            filter: blur(72px); pointer-events:none; z-index:0;
        }
        .stApp::before {
            width:460px; height:460px; left:-90px; top:-70px;
            background: radial-gradient(circle, rgba(99,102,241,0.28), transparent 68%);
            animation: floatA 28s ease-in-out infinite;
        }
        .stApp::after {
            width:540px; height:540px; right:-120px; top:10%;
            background: radial-gradient(circle, rgba(14,165,233,0.22), transparent 68%);
            animation: floatB 34s ease-in-out infinite;
        }
        .block-container { position:relative; z-index:1; }

        @media (prefers-reduced-motion: reduce){
            .sankey-flow, .stApp::before, .stApp::after, .app-logo,
            .kpi-card, .profile-card, [data-testid="stVerticalBlockBorderWrapper"] { animation:none !important; }
        }

        html, body, [class*="css"], .stApp,
        [data-testid="stAppViewContainer"], [data-testid="stMarkdownContainer"] {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .stApp {
            background:
              radial-gradient(900px 620px at 6% -8%, rgba(99,102,241,0.20), transparent 60%),
              radial-gradient(820px 520px at 98% -4%, rgba(14,165,233,0.16), transparent 55%),
              radial-gradient(900px 720px at 92% 105%, rgba(20,184,166,0.15), transparent 55%),
              radial-gradient(720px 620px at -4% 104%, rgba(139,92,246,0.15), transparent 55%),
              linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
            background-attachment: fixed;
        }

        #MainMenu, footer, [data-testid="stToolbar"], [data-testid="stDecoration"] {
            visibility: hidden; height: 0;
        }
        header[data-testid="stHeader"] { background: transparent; }
        .block-container { padding-top: 2.0rem; padding-bottom: 3rem; max-width: 1520px; }

        /* ---- App header ---- */
        .app-header { display:flex; align-items:center; gap:15px; margin: 2px 0 4px; }
        .app-logo {
            width:50px; height:50px; border-radius:14px;
            background: linear-gradient(135deg, #6366f1, #0ea5e9);
            display:flex; align-items:center; justify-content:center;
            color:#fff; font-weight:800; font-size:22px;
            box-shadow: 0 10px 24px -6px rgba(99,102,241,0.55);
            animation: logoFloat 4.5s ease-in-out infinite;
        }
        .app-title { font-size:1.7rem; font-weight:800; color:var(--ink); letter-spacing:-0.02em; line-height:1.05; margin:0; }
        .app-sub { color:var(--slate); font-size:.95rem; margin-top:3px; }

        /* ---- Section headers ---- */
        .eyebrow { text-transform:uppercase; letter-spacing:.16em; font-size:.72rem; font-weight:700; color:var(--indigo); }
        .sec-title { font-size:1.3rem; font-weight:700; color:var(--ink); letter-spacing:-0.01em; margin:1px 0; }
        .sec-sub { color:var(--slate); font-size:.92rem; }

        /* ---- KPI grid ---- */
        .kpi-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:14px; margin: 8px 0 6px; }
        @media (max-width: 1150px){ .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
        .kpi-card {
            position:relative; overflow:hidden;
            animation: rise .55s ease both;
            background: rgba(255,255,255,0.72);
            -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
            border:1px solid rgba(255,255,255,0.80);
            border-radius:16px; padding:15px 16px 14px 19px;
            box-shadow: 0 14px 32px -18px rgba(15,23,42,0.30);
            transition: transform .25s ease, box-shadow .25s ease;
        }
        .kpi-card:hover { transform: translateY(-4px) !important; box-shadow: 0 24px 44px -18px rgba(15,23,42,0.42); }
        .kpi-card::before { content:""; position:absolute; left:0; top:0; bottom:0; width:4px; background: var(--accent,#6366f1); }
        .kpi-label { font-size:.70rem; text-transform:uppercase; letter-spacing:.10em; color:var(--muted); font-weight:700; }
        .kpi-value { font-size:1.65rem; font-weight:800; color:var(--ink); letter-spacing:-0.02em; line-height:1.25; margin-top:3px; }
        .kpi-hint { font-size:.74rem; color:var(--slate); margin-top:1px; }

        /* ---- Glass cards (native bordered containers) ---- */
        [data-testid="stVerticalBlockBorderWrapper"] {
            background: rgba(255,255,255,0.70);
            -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
            border:1px solid rgba(255,255,255,0.75) !important;
            border-radius:18px !important;
            box-shadow: 0 16px 38px -22px rgba(15,23,42,0.32);
            transition: transform .28s ease, box-shadow .28s ease;
            animation: cardIn .5s ease both;
        }
        [data-testid="stVerticalBlockBorderWrapper"]:hover {
            transform: translateY(-3px) !important;
            box-shadow: 0 28px 54px -24px rgba(15,23,42,0.42);
        }
        .chart-h { font-weight:700; color:var(--ink); font-size:.98rem; }
        .chart-sub { color:var(--slate); font-size:.80rem; margin-bottom:2px; }

        /* ---- Callouts ---- */
        .callout {
            background: rgba(255,255,255,0.66);
            -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
            border:1px solid rgba(255,255,255,0.75);
            border-left:4px solid var(--accent,#6366f1);
            border-radius:14px; padding:14px 16px; color:var(--slate); font-size:.92rem;
        }
        .callout b, .callout strong { color:var(--ink); }

        /* ---- Profile cards ---- */
        .profile-card {
            animation: rise .55s ease both;
            background: rgba(255,255,255,0.74);
            -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
            border:1px solid rgba(255,255,255,0.80);
            border-top:4px solid var(--accent,#6366f1);
            border-radius:16px; padding:16px 18px; height:100%;
            box-shadow: 0 14px 32px -20px rgba(15,23,42,0.30);
            transition: transform .25s ease, box-shadow .25s ease;
        }
        .profile-card:hover { transform: translateY(-4px) !important; box-shadow: 0 24px 46px -20px rgba(15,23,42,0.42); }
        .profile-name { font-weight:700; font-size:1.06rem; color:var(--ink); }
        .profile-share { font-size:2.1rem; font-weight:800; color:var(--accent,#6366f1); line-height:1; margin-top:4px; }
        .profile-count { font-size:.76rem; color:var(--muted); margin-bottom:8px; }
        .profile-desc { font-size:.88rem; color:var(--slate); }
        .profile-stats { font-size:.76rem; color:var(--muted); margin:8px 0; }
        .profile-action { font-size:.86rem; color:var(--ink); }
        .profile-action b { color: var(--accent,#6366f1); }

        /* ---- Glass tables ---- */
        table.gt { width:100%; border-collapse: collapse; font-size:.9rem; }
        table.gt th {
            text-align:left; padding:9px 12px; color:var(--muted);
            font-size:.70rem; text-transform:uppercase; letter-spacing:.08em; font-weight:700;
            border-bottom:1px solid rgba(148,163,184,0.30);
        }
        table.gt td { padding:10px 12px; color:var(--ink); border-bottom:1px solid rgba(148,163,184,0.16); }
        table.gt tr.hl td {
            background: linear-gradient(90deg, rgba(99,102,241,0.12), rgba(14,165,233,0.06));
            font-weight:700;
        }
        table.gt tr.hl td:first-child { box-shadow: inset 3px 0 0 #6366f1; }

        /* ---- Modern top tabs ---- */
        .stTabs [data-baseweb="tab-list"] {
            gap:6px; background: rgba(255,255,255,0.55);
            -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
            padding:6px; border-radius:14px; border:1px solid rgba(255,255,255,0.65);
        }
        .stTabs [data-baseweb="tab"] {
            border-radius:10px; padding:9px 18px; font-weight:600; color:var(--slate);
        }
        .stTabs [data-baseweb="tab-highlight"], .stTabs [data-baseweb="tab-border"] { display:none; }
        .stTabs [aria-selected="true"] {
            background: linear-gradient(135deg, #6366f1, #0ea5e9) !important;
            color:#fff !important;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def kpi_grid(items: list[dict]) -> None:
    cards = ""
    for it in items:
        cards += (
            f'<div class="kpi-card" style="--accent:{it["color"]}">'
            f'<div class="kpi-label">{it["label"]}</div>'
            f'<div class="kpi-value">{it["value"]}</div>'
            f'<div class="kpi-hint">{it.get("hint", "")}</div>'
            f"</div>"
        )
    st.markdown(f'<div class="kpi-grid">{cards}</div>', unsafe_allow_html=True)


def sec(eyebrow: str, title: str, sub: str = "") -> None:
    html = (
        f'<div style="margin:16px 0 10px">'
        f'<div class="eyebrow">{eyebrow}</div>'
        f'<div class="sec-title">{title}</div>'
    )
    if sub:
        html += f'<div class="sec-sub">{sub}</div>'
    html += "</div>"
    st.markdown(html, unsafe_allow_html=True)


def chart_head(title: str, sub: str = "") -> None:
    html = f'<div class="chart-h">{title}</div>'
    if sub:
        html += f'<div class="chart-sub">{sub}</div>'
    st.markdown(html, unsafe_allow_html=True)


def callout(html: str, accent: str = INDIGO) -> None:
    st.markdown(
        f'<div class="callout" style="--accent:{accent}">{html}</div>',
        unsafe_allow_html=True,
    )


def glass_table(headers: list[str], rows: list[list], highlight: int | None = None) -> None:
    thead = "".join(f"<th>{h}</th>" for h in headers)
    body = ""
    for i, r in enumerate(rows):
        cls = ' class="hl"' if i == highlight else ""
        tds = "".join(f"<td>{c}</td>" for c in r)
        body += f"<tr{cls}>{tds}</tr>"
    st.markdown(
        f'<table class="gt"><thead><tr>{thead}</tr></thead><tbody>{body}</tbody></table>',
        unsafe_allow_html=True,
    )


# --------------------------------------------------------------------------- #
# Sections
# --------------------------------------------------------------------------- #
def section_overview(df: pd.DataFrame) -> None:
    total = len(df)
    left = int(df["left"].sum())
    stayed = total - left
    attrition_rate = left / total * 100

    sec("Workforce", "Attrition Overview", "The state of retention across the company today")
    kpi_grid(
        [
            {"label": "Employees", "value": f"{total:,}", "hint": "unique records", "color": INDIGO},
            {"label": "Attrition Rate", "value": f"{attrition_rate:.1f}%", "hint": f"{left:,} left", "color": ROSE},
            {"label": "Avg Satisfaction", "value": f"{df['satisfaction_level'].mean():.2f}", "hint": "0–1 scale", "color": TEAL},
            {"label": "Avg Evaluation", "value": f"{df['last_evaluation'].mean():.2f}", "hint": "0–1 scale", "color": SKY},
            {"label": "Avg Monthly Hrs", "value": f"{df['average_monthly_hours'].mean():.0f}", "hint": "per employee", "color": AMBER},
            {"label": "Avg Tenure", "value": f"{df['time_spend_company'].mean():.1f}", "hint": "years at company", "color": VIOLET},
            {"label": "Promotion Rate", "value": f"{df['promotion_last_5years'].mean() * 100:.1f}%", "hint": "in last 5 yrs", "color": INDIGO},
            {"label": "Work Accidents", "value": f"{df['Work_accident'].mean() * 100:.1f}%", "hint": "share involved", "color": SLATE},
        ]
    )

    col_left, col_right = st.columns([1, 1.25], gap="medium")
    with col_left:
        with st.container(border=True):
            chart_head("Retention Split", "Who stayed vs. who left")
            donut = go.Figure(
                go.Pie(
                    labels=["Stayed", "Left"],
                    values=[stayed, left],
                    hole=0.62,
                    marker=dict(colors=[STAYED_COLOR, LEFT_COLOR], line=dict(color="white", width=2)),
                    textinfo="label+percent",
                    textfont=dict(family=PLOT_FONT, size=14),
                )
            )
            donut.add_annotation(
                text=f"<b>{attrition_rate:.0f}%</b><br>left",
                showarrow=False,
                font=dict(family=PLOT_FONT, size=22, color=INK),
            )
            apply_theme(donut, 330, legend=False)
            st.plotly_chart(donut, use_container_width=True, config=CHART_CONFIG)

    with col_right:
        with st.container(border=True):
            chart_head("Attrition Flow", "From the whole workforce to specific leaver profiles")
            _, burned, unhappy, apathetic = leaver_profiles(df)
            segments = [
                ("Burned Out Stars", len(burned), ROSE),
                ("Unhappy Underperformers", len(unhappy), AMBER),
                ("Apathetic Middle", len(apathetic), VIOLET),
            ]
            st.markdown(
                attrition_flow_svg(total, stayed, left, segments),
                unsafe_allow_html=True,
            )

    callout(
        f"Nearly <b>1 in 6 employees</b> ({attrition_rate:.0f}%) left Salifort Motors. "
        "Replacing an employee can cost <b>50–200% of their annual salary</b> in recruiting, "
        "onboarding and lost productivity. This dashboard pinpoints <b>who</b> is at risk, "
        f"<b>why</b> they leave, and <b>where</b> HR should act first — built on {raw_row_count():,} "
        f"raw records de-duplicated to <b>{total:,} unique employees</b>.",
        accent=INDIGO,
    )


def section_eda(df: pd.DataFrame) -> None:
    sec("Diagnosis", "Why Employees Leave", "Where attrition concentrates and the patterns behind it")

    dept = (
        df.groupby("Department")["left"].agg(total="count", left="sum").reset_index()
    )
    dept["attrition_rate"] = (dept["left"] / dept["total"] * 100).round(1)
    dept = dept.sort_values("attrition_rate", ascending=False)

    sal = (
        df.assign(salary=pd.Categorical(df["salary"], ["low", "medium", "high"]))
        .groupby("salary", observed=True)["left"]
        .agg(total="count", left="sum")
        .reset_index()
    )
    sal["attrition_rate"] = (sal["left"] / sal["total"] * 100).round(1)

    c1, c2 = st.columns(2, gap="medium")
    with c1:
        with st.container(border=True):
            chart_head("Attrition Rate by Department")
            fig = px.bar(
                dept, x="attrition_rate", y="Department", orientation="h",
                color="attrition_rate", color_continuous_scale=ATTR_SCALE,
                labels={"attrition_rate": "Attrition Rate (%)", "Department": ""},
            )
            apply_theme(fig, 380, legend=False)
            fig.update_layout(coloraxis_showscale=False)
            st.plotly_chart(fig, use_container_width=True, config=CHART_CONFIG)
    with c2:
        with st.container(border=True):
            chart_head("Attrition Rate by Salary Band")
            fig = px.bar(
                sal, x="salary", y="attrition_rate",
                color="attrition_rate", color_continuous_scale=ATTR_SCALE,
                labels={"attrition_rate": "Attrition Rate (%)", "salary": "Salary Band"},
            )
            apply_theme(fig, 380, legend=False)
            fig.update_layout(coloraxis_showscale=False)
            st.plotly_chart(fig, use_container_width=True, config=CHART_CONFIG)

    c3, c4 = st.columns(2, gap="medium")
    with c3:
        with st.container(border=True):
            chart_head("Satisfaction Level: Stayed vs Left", "The bimodal signature of churn")
            plot_df = df.assign(Status=np.where(df["left"] == 1, "Left", "Stayed"))
            fig = px.histogram(
                plot_df, x="satisfaction_level", color="Status", nbins=25,
                barmode="overlay", opacity=0.75,
                color_discrete_map={"Left": LEFT_COLOR, "Stayed": STAYED_COLOR},
                labels={"satisfaction_level": "Satisfaction Level"},
            )
            apply_theme(fig, 380)
            st.plotly_chart(fig, use_container_width=True, config=CHART_CONFIG)
    with c4:
        with st.container(border=True):
            chart_head("Project Load U-Curve", "Churn spikes at the extremes; 3–5 projects is the sweet spot")
            proj = (
                df.groupby("number_project")
                .agg(total=("left", "count"), left=("left", "sum"), avg_hours=("average_monthly_hours", "mean"))
                .reset_index()
            )
            proj["attrition_rate"] = (proj["left"] / proj["total"] * 100).round(1)
            fig = make_subplots(specs=[[{"secondary_y": True}]])
            fig.add_bar(
                x=proj["number_project"], y=proj["attrition_rate"],
                name="Attrition Rate (%)", marker_color=ROSE, opacity=0.85,
            )
            fig.add_trace(
                go.Scatter(
                    x=proj["number_project"], y=proj["avg_hours"],
                    name="Avg Monthly Hours", mode="lines+markers",
                    line=dict(color=INDIGO, width=3.5, shape="spline"),
                    marker=dict(size=9, color=INDIGO, line=dict(color="white", width=2)),
                ),
                secondary_y=True,
            )
            fig.add_vrect(x0=2.5, x1=5.5, fillcolor=TEAL, opacity=0.08, line_width=0)
            apply_theme(fig, 380)
            fig.update_xaxes(title_text="Number of Projects")
            fig.update_yaxes(title_text="Attrition Rate (%)", secondary_y=False)
            fig.update_yaxes(title_text="Avg Hours", secondary_y=True, showgrid=False)
            st.plotly_chart(fig, use_container_width=True, config=CHART_CONFIG)

    with st.container(border=True):
        chart_head(
            "Leaver Clusters in 3D",
            "Satisfaction × Evaluation × Monthly Hours, coloured by leaver profile — auto-rotating, drag to explore",
        )
        _, burned, unhappy, apathetic = leaver_profiles(df)
        seg = pd.Series("Stayed", index=df.index)
        seg.loc[burned.index] = "Burned Out Stars"
        seg.loc[unhappy.index] = "Unhappy Underperformers"
        seg.loc[apathetic.index] = "Apathetic Middle"
        plot_df = df.assign(Segment=seg)
        stayed_df = plot_df[plot_df["Segment"] == "Stayed"]
        stayed_sample = stayed_df.sample(n=min(1500, len(stayed_df)), random_state=42)
        scatter_df = pd.concat([stayed_sample, plot_df[plot_df["Segment"] != "Stayed"]])
        seg_colors = {
            "Stayed": "rgba(148,163,184,0.45)",
            "Burned Out Stars": ROSE,
            "Unhappy Underperformers": AMBER,
            "Apathetic Middle": VIOLET,
        }
        fig = px.scatter_3d(
            scatter_df, x="satisfaction_level", y="last_evaluation",
            z="average_monthly_hours", color="Segment", opacity=0.6,
            color_discrete_map=seg_colors,
            category_orders={"Segment": list(seg_colors.keys())},
            labels={
                "satisfaction_level": "Satisfaction",
                "last_evaluation": "Evaluation",
                "average_monthly_hours": "Monthly Hours",
            },
        )
        fig.update_traces(marker=dict(size=3.2, line=dict(width=0)))
        apply_theme(fig, 540)
        fig.update_layout(
            scene=dict(
                xaxis=dict(backgroundcolor="rgba(0,0,0,0)", gridcolor="rgba(148,163,184,0.25)"),
                yaxis=dict(backgroundcolor="rgba(0,0,0,0)", gridcolor="rgba(148,163,184,0.25)"),
                zaxis=dict(backgroundcolor="rgba(0,0,0,0)", gridcolor="rgba(148,163,184,0.25)"),
                camera=dict(eye=dict(x=1.27, y=1.27, z=0.85)),
            )
        )
        render_rotating_3d(fig, height=560)

    c5, c6 = st.columns(2, gap="medium")
    with c5:
        with st.container(border=True):
            chart_head("Attrition Rate by Tenure", "The critical 3–5 year churn window")
            tenure = (
                df.groupby("time_spend_company")
                .agg(total=("left", "count"), left=("left", "sum"))
                .reset_index()
            )
            tenure["attrition_rate"] = (tenure["left"] / tenure["total"] * 100).round(1)
            fig = px.line(
                tenure, x="time_spend_company", y="attrition_rate", markers=True,
                labels={"time_spend_company": "Years at Company", "attrition_rate": "Attrition Rate (%)"},
            )
            fig.update_traces(
                line=dict(color=INDIGO, width=3.5, shape="spline"),
                marker=dict(size=9, color=INDIGO, line=dict(color="white", width=2)),
                fill="tozeroy", fillcolor="rgba(99,102,241,0.10)",
            )
            fig.add_vrect(x0=2.5, x1=5.5, fillcolor=ROSE, opacity=0.07, line_width=0)
            apply_theme(fig, 380, legend=False)
            st.plotly_chart(fig, use_container_width=True, config=CHART_CONFIG)
    with c6:
        with st.container(border=True):
            chart_head("Departmental Brain Drain", "Evaluation gap between those who left vs stayed")
            stay = df[df["left"] == 0].groupby("Department")["last_evaluation"].mean()
            leave = df[df["left"] == 1].groupby("Department")["last_evaluation"].mean()
            dd = (
                pd.concat([stay.rename("stay"), leave.rename("leave")], axis=1)
                .reset_index()
                .sort_values("leave")
            )
            fig = go.Figure()
            for _, r in dd.iterrows():
                fig.add_trace(
                    go.Scatter(
                        x=[r["stay"], r["leave"]], y=[r["Department"], r["Department"]],
                        mode="lines", line=dict(color="rgba(148,163,184,0.45)", width=3),
                        showlegend=False, hoverinfo="skip",
                    )
                )
            fig.add_trace(go.Scatter(x=dd["stay"], y=dd["Department"], mode="markers", name="Stayed", marker=dict(color=TEAL, size=13, line=dict(color="white", width=2))))
            fig.add_trace(go.Scatter(x=dd["leave"], y=dd["Department"], mode="markers", name="Left", marker=dict(color=ROSE, size=13, line=dict(color="white", width=2))))
            apply_theme(fig, 380)
            fig.update_xaxes(title_text="Avg Last Evaluation")
            st.plotly_chart(fig, use_container_width=True, config=CHART_CONFIG)

    with st.container(border=True):
        chart_head("Correlation Heatmap", "How the numeric drivers relate to each other and to leaving")
        num_cols = [
            "satisfaction_level", "last_evaluation", "number_project",
            "average_monthly_hours", "time_spend_company", "Work_accident",
            "promotion_last_5years", "left",
        ]
        corr = df[num_cols].corr().round(2)
        fig = px.imshow(
            corr, text_auto=True, color_continuous_scale="RdBu_r",
            zmin=-1, zmax=1, aspect="auto",
        )
        apply_theme(fig, 520)
        st.plotly_chart(fig, use_container_width=True, config=CHART_CONFIG)


def section_model(df: pd.DataFrame) -> None:
    sec("Prediction", "Predictive Attrition Model", "Comparing three classifiers to flag at-risk employees early")
    with st.spinner("Training models on the employee dataset…"):
        bundle = train_models(df)

    results = bundle["results"]
    order = ["Logistic Regression", "Decision Tree", "Random Forest"]
    f1s = [results[m]["f1"] for m in order]
    champion_idx = int(np.argmax(f1s))
    best = order[champion_idx]

    with st.container(border=True):
        chart_head("Model Comparison", f"Trained on {bundle['n_train']:,} employees · evaluated on {bundle['n_test']:,} held-out")
        rows = [
            [
                m,
                f"{results[m]['accuracy']:.3f}",
                f"{results[m]['precision']:.3f}",
                f"{results[m]['recall']:.3f}",
                f"{results[m]['f1']:.3f}",
                f"{results[m]['roc_auc']:.3f}",
            ]
            for m in order
        ]
        glass_table(
            ["Model", "Accuracy", "Precision", "Recall", "F1 Score", "ROC-AUC"],
            rows, highlight=champion_idx,
        )

    callout(
        f"<b>Champion model: {best}</b> — it best balances precision and recall, correctly "
        "flagging employees who are about to leave while keeping false alarms low.",
        accent=TEAL,
    )

    rf = results["Random Forest"]
    c1, c2 = st.columns(2, gap="medium")
    with c1:
        with st.container(border=True):
            chart_head("Random Forest — Confusion Matrix")
            cm = rf["confusion"]
            cm_fig = px.imshow(
                cm, text_auto=True, color_continuous_scale="Blues",
                labels=dict(x="Predicted", y="Actual", color="Count"),
                x=["Stayed", "Left"], y=["Stayed", "Left"],
            )
            apply_theme(cm_fig, 380, legend=False)
            cm_fig.update_layout(coloraxis_showscale=False)
            st.plotly_chart(cm_fig, use_container_width=True, config=CHART_CONFIG)
            st.caption(
                f"Recall {rf['recall']:.1%} — of all employees who actually left, "
                f"the model catches {rf['recall']:.0%} of them."
            )
    with c2:
        with st.container(border=True):
            chart_head("What Drives Attrition", "Random Forest feature importance")
            imp = bundle["feature_importance"].head(10).iloc[::-1]
            fig = px.bar(
                imp, x="importance", y="feature", orientation="h",
                color="importance", color_continuous_scale=IMP_SCALE,
                labels={"importance": "Importance", "feature": ""},
            )
            apply_theme(fig, 380, legend=False)
            fig.update_layout(coloraxis_showscale=False)
            st.plotly_chart(fig, use_container_width=True, config=CHART_CONFIG)


def section_profiles(df: pd.DataFrame) -> None:
    sec("Action", "Leaver Profiles & Recommendations", "Three distinct churn segments — and what HR should do about each")
    leavers, burned, unhappy, apathetic = leaver_profiles(df)
    n_leavers = len(leavers)

    profiles = [
        {
            "name": "Burned Out Stars", "rows": burned, "color": ROSE,
            "desc": "High performers crushed by overwork. Top evaluations but driven out by excessive hours.",
            "action": "Immediate workload reduction. Cap projects at 4. Mandatory PTO. Senior mentorship.",
        },
        {
            "name": "Unhappy Underperformers", "rows": unhappy, "color": AMBER,
            "desc": "Low satisfaction paired with poor performance — often under-utilized on very few projects.",
            "action": "1:1 career development. Role reassignment. Structured performance improvement plans.",
        },
        {
            "name": "Apathetic Middle", "rows": apathetic, "color": VIOLET,
            "desc": "Average performers with moderate but declining satisfaction. Promotion and recognition gaps.",
            "action": "Career-path visibility. Transparent promotion criteria. Salary reviews for 3+ year staff.",
        },
    ]

    cols = st.columns(3, gap="medium")
    for col, p in zip(cols, profiles):
        rows = p["rows"]
        pct = len(rows) / n_leavers * 100 if n_leavers else 0
        with col:
            st.markdown(
                f'<div class="profile-card" style="--accent:{p["color"]}">'
                f'<div class="profile-name">{p["name"]}</div>'
                f'<div class="profile-share">{pct:.0f}%</div>'
                f'<div class="profile-count">{len(rows):,} of {n_leavers:,} who left</div>'
                f'<div class="profile-desc">{p["desc"]}</div>'
                f'<div class="profile-stats">Satisfaction {rows["satisfaction_level"].mean():.2f} · '
                f'Evaluation {rows["last_evaluation"].mean():.2f} · '
                f'{rows["average_monthly_hours"].mean():.0f} hrs/mo</div>'
                f'<div class="profile-action"><b>Action:</b> {p["action"]}</div>'
                f"</div>",
                unsafe_allow_html=True,
            )

    c1, c2 = st.columns([1, 1], gap="medium")
    with c1:
        with st.container(border=True):
            chart_head("Key Risk Factors")
            glass_table(
                ["Risk Factor", "Impact"],
                [
                    ["Low Satisfaction (&lt; 0.4)", "~3× the leave rate of satisfied peers"],
                    ["Overwork (&gt; 250 hrs/mo)", "Strong burnout signal of departure"],
                    ["Too Many Projects (≥ 6)", "45–53% attrition under heavy load"],
                    ["No Promotion in 5 yrs", "Only ~2% promoted; stalled growth"],
                    ["Low Salary Band", "29% attrition vs ~7% for high salary"],
                ],
            )
    with c2:
        with st.container(border=True):
            chart_head("Recommendations for HR Leadership")
            st.markdown(
                "- **Fix the overwork engine.** Cap monthly hours and project counts; the highest "
                "performers are leaving from burnout, not lack of ability.\n"
                "- **Act on satisfaction early.** Pulse surveys and manager check-ins for anyone "
                "trending below 0.4 satisfaction.\n"
                "- **Unblock career growth.** Clear promotion criteria and salary reviews, especially "
                "at 3+ years of tenure.\n"
                "- **Deploy the model.** Score employees quarterly and route high-risk individuals "
                "to targeted retention conversations."
            )


# --------------------------------------------------------------------------- #
# Main app
# --------------------------------------------------------------------------- #
def main() -> None:
    st.set_page_config(
        page_title="Salifort Motors — Turnover & Retention",
        page_icon="📊",
        layout="wide",
    )
    inject_css()
    df = load_data()

    st.markdown(
        '<div class="app-header">'
        '<div class="app-logo">S</div>'
        "<div>"
        '<div class="app-title">Salifort Motors · People Analytics</div>'
        '<div class="app-sub">Employee turnover &amp; retention — who leaves, why, and where to act '
        "(~12,000 employee records)</div>"
        "</div></div>",
        unsafe_allow_html=True,
    )

    tab_overview, tab_eda, tab_model, tab_profiles = st.tabs(
        ["  Overview  ", "  Why They Leave  ", "  Predictive Model  ", "  Profiles & Actions  "]
    )
    with tab_overview:
        section_overview(df)
    with tab_eda:
        section_eda(df)
    with tab_model:
        section_model(df)
    with tab_profiles:
        section_profiles(df)


if __name__ == "__main__":
    main()
