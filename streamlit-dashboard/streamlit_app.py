"""
Salifort Motors: Employee Turnover & Retention Dashboard
Python + Streamlit rebuild of the capstone project.

Identifying who leaves, why, and where to act — based on ~12,000 employee records.
"""

from pathlib import Path

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
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

LEFT_COLOR = "#f43f5e"
STAYED_COLOR = "#10b981"
ACCENT = "#6366f1"


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


# --------------------------------------------------------------------------- #
# Page sections
# --------------------------------------------------------------------------- #
def section_overview(df: pd.DataFrame) -> None:
    st.subheader("Workforce Overview")

    total = len(df)
    left = int(df["left"].sum())
    stayed = total - left
    attrition_rate = left / total * 100

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Employees Analyzed", f"{total:,}")
    c2.metric("Attrition Rate", f"{attrition_rate:.1f}%")
    c3.metric("Left the Company", f"{left:,}")
    c4.metric("Still Employed", f"{stayed:,}")

    c5, c6, c7, c8 = st.columns(4)
    c5.metric("Avg Satisfaction", f"{df['satisfaction_level'].mean():.2f}")
    c6.metric("Avg Monthly Hours", f"{df['average_monthly_hours'].mean():.0f}")
    c7.metric("Avg Tenure (yrs)", f"{df['time_spend_company'].mean():.1f}")
    c8.metric("Promoted (5 yrs)", f"{df['promotion_last_5years'].mean() * 100:.1f}%")

    st.divider()

    col_left, col_right = st.columns([1, 1])
    with col_left:
        st.markdown("**Retention Split**")
        donut = go.Figure(
            go.Pie(
                labels=["Stayed", "Left"],
                values=[stayed, left],
                hole=0.6,
                marker=dict(colors=[STAYED_COLOR, LEFT_COLOR]),
                textinfo="label+percent",
            )
        )
        donut.update_layout(showlegend=False, height=340, margin=dict(t=10, b=10))
        st.plotly_chart(donut, use_container_width=True)

    with col_right:
        st.markdown("**Why this matters**")
        st.write(
            f"Nearly **1 in 6 employees** ({attrition_rate:.0f}%) left Salifort Motors. "
            "Replacing an employee can cost 50–200% of their annual salary in "
            "recruiting, onboarding and lost productivity. This dashboard pinpoints "
            "**who** is at risk, **why** they leave, and **where** HR should act first."
        )
        st.info(
            "Built on the de-duplicated dataset: "
            f"{raw_row_count():,} raw records → **{total:,} unique employees** "
            "after removing 3,008 exact duplicates."
        )


def section_eda(df: pd.DataFrame) -> None:
    st.subheader("Exploratory Analysis")

    # Attrition by department
    dept = (
        df.groupby("Department")["left"]
        .agg(total="count", left="sum")
        .reset_index()
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

    c1, c2 = st.columns(2)
    with c1:
        st.markdown("**Attrition Rate by Department**")
        fig = px.bar(
            dept,
            x="attrition_rate",
            y="Department",
            orientation="h",
            color="attrition_rate",
            color_continuous_scale="Reds",
            labels={"attrition_rate": "Attrition Rate (%)", "Department": ""},
        )
        fig.update_layout(height=380, coloraxis_showscale=False, margin=dict(t=10))
        st.plotly_chart(fig, use_container_width=True)
    with c2:
        st.markdown("**Attrition Rate by Salary Band**")
        fig = px.bar(
            sal,
            x="salary",
            y="attrition_rate",
            color="attrition_rate",
            color_continuous_scale="Reds",
            labels={"attrition_rate": "Attrition Rate (%)", "salary": "Salary Band"},
        )
        fig.update_layout(height=380, coloraxis_showscale=False, margin=dict(t=10))
        st.plotly_chart(fig, use_container_width=True)

    st.divider()

    # Satisfaction distribution & the famous scatter
    c3, c4 = st.columns(2)
    with c3:
        st.markdown("**Satisfaction Level: Stayed vs Left**")
        plot_df = df.assign(
            Status=np.where(df["left"] == 1, "Left", "Stayed")
        )
        fig = px.histogram(
            plot_df,
            x="satisfaction_level",
            color="Status",
            nbins=25,
            barmode="overlay",
            opacity=0.75,
            color_discrete_map={"Left": LEFT_COLOR, "Stayed": STAYED_COLOR},
            labels={"satisfaction_level": "Satisfaction Level"},
        )
        fig.update_layout(height=380, margin=dict(t=10))
        st.plotly_chart(fig, use_container_width=True)
    with c4:
        st.markdown("**Satisfaction vs Evaluation (the 3 churn clusters)**")
        plot_df = df.assign(Status=np.where(df["left"] == 1, "Left", "Stayed"))
        fig = px.scatter(
            plot_df,
            x="satisfaction_level",
            y="last_evaluation",
            color="Status",
            opacity=0.45,
            color_discrete_map={"Left": LEFT_COLOR, "Stayed": STAYED_COLOR},
            labels={
                "satisfaction_level": "Satisfaction Level",
                "last_evaluation": "Last Evaluation",
            },
        )
        fig.update_layout(height=380, margin=dict(t=10))
        st.plotly_chart(fig, use_container_width=True)

    st.divider()

    # Projects vs hours, and tenure
    proj = (
        df.groupby("number_project")
        .agg(
            total=("left", "count"),
            left=("left", "sum"),
            avg_hours=("average_monthly_hours", "mean"),
        )
        .reset_index()
    )
    proj["attrition_rate"] = (proj["left"] / proj["total"] * 100).round(1)

    tenure = (
        df.groupby("time_spend_company")
        .agg(total=("left", "count"), left=("left", "sum"))
        .reset_index()
    )
    tenure["attrition_rate"] = (tenure["left"] / tenure["total"] * 100).round(1)

    c5, c6 = st.columns(2)
    with c5:
        st.markdown("**Attrition Rate by Number of Projects**")
        fig = px.bar(
            proj,
            x="number_project",
            y="attrition_rate",
            color="attrition_rate",
            color_continuous_scale="Reds",
            labels={
                "number_project": "Number of Projects",
                "attrition_rate": "Attrition Rate (%)",
            },
        )
        fig.update_layout(height=360, coloraxis_showscale=False, margin=dict(t=10))
        st.plotly_chart(fig, use_container_width=True)
    with c6:
        st.markdown("**Attrition Rate by Tenure**")
        fig = px.line(
            tenure,
            x="time_spend_company",
            y="attrition_rate",
            markers=True,
            labels={
                "time_spend_company": "Years at Company",
                "attrition_rate": "Attrition Rate (%)",
            },
        )
        fig.update_traces(line_color=ACCENT)
        fig.update_layout(height=360, margin=dict(t=10))
        st.plotly_chart(fig, use_container_width=True)

    st.divider()
    st.markdown("**Correlation Heatmap (numeric features)**")
    num_cols = [
        "satisfaction_level",
        "last_evaluation",
        "number_project",
        "average_monthly_hours",
        "time_spend_company",
        "Work_accident",
        "promotion_last_5years",
        "left",
    ]
    corr = df[num_cols].corr().round(2)
    fig = px.imshow(
        corr,
        text_auto=True,
        color_continuous_scale="RdBu_r",
        zmin=-1,
        zmax=1,
        aspect="auto",
    )
    fig.update_layout(height=520, margin=dict(t=10))
    st.plotly_chart(fig, use_container_width=True)


def section_model(df: pd.DataFrame) -> None:
    st.subheader("Predictive Attrition Model")
    with st.spinner("Training models on the employee dataset…"):
        bundle = train_models(df)

    results = bundle["results"]
    st.caption(
        f"Trained on {bundle['n_train']:,} employees, "
        f"evaluated on a held-out test set of {bundle['n_test']:,}."
    )

    comparison = pd.DataFrame(
        {
            "Model": list(results.keys()),
            "Accuracy": [results[m]["accuracy"] for m in results],
            "Precision": [results[m]["precision"] for m in results],
            "Recall": [results[m]["recall"] for m in results],
            "F1 Score": [results[m]["f1"] for m in results],
            "ROC-AUC": [results[m]["roc_auc"] for m in results],
        }
    )
    st.markdown("**Model Comparison**")
    st.dataframe(
        comparison.style.format(
            {
                "Accuracy": "{:.3f}",
                "Precision": "{:.3f}",
                "Recall": "{:.3f}",
                "F1 Score": "{:.3f}",
                "ROC-AUC": "{:.3f}",
            }
        ),
        use_container_width=True,
        hide_index=True,
    )

    best = comparison.loc[comparison["F1 Score"].idxmax(), "Model"]
    st.success(
        f"**Champion model: {best}** — it best balances precision and recall, "
        "correctly flagging employees who are about to leave while keeping "
        "false alarms low."
    )

    st.divider()
    rf = results["Random Forest"]
    c1, c2 = st.columns([1, 1])
    with c1:
        st.markdown("**Random Forest — Confusion Matrix**")
        cm = rf["confusion"]
        cm_fig = px.imshow(
            cm,
            text_auto=True,
            color_continuous_scale="Blues",
            labels=dict(x="Predicted", y="Actual", color="Count"),
            x=["Stayed", "Left"],
            y=["Stayed", "Left"],
        )
        cm_fig.update_layout(height=380, margin=dict(t=10), coloraxis_showscale=False)
        st.plotly_chart(cm_fig, use_container_width=True)
        st.caption(
            f"Recall {rf['recall']:.1%} — of all employees who actually left, "
            f"the model catches {rf['recall']:.0%} of them."
        )
    with c2:
        st.markdown("**What Drives Attrition (feature importance)**")
        imp = bundle["feature_importance"].head(10).iloc[::-1]
        fig = px.bar(
            imp,
            x="importance",
            y="feature",
            orientation="h",
            color="importance",
            color_continuous_scale="Purples",
            labels={"importance": "Importance", "feature": ""},
        )
        fig.update_layout(height=380, coloraxis_showscale=False, margin=dict(t=10))
        st.plotly_chart(fig, use_container_width=True)


def section_profiles(df: pd.DataFrame) -> None:
    st.subheader("Churn Profiles & Recommendations")
    leavers = df[df["left"] == 1]
    n_leavers = len(leavers)

    burned = leavers[
        (leavers["last_evaluation"] >= 0.75)
        & (leavers["average_monthly_hours"] >= 230)
    ]
    unhappy = leavers[
        (leavers["last_evaluation"] < 0.60) & (leavers["satisfaction_level"] < 0.20)
    ]
    apathetic = leavers.drop(burned.index).drop(
        unhappy.index, errors="ignore"
    )

    profiles = [
        {
            "name": "Burned Out Stars",
            "rows": burned,
            "color": LEFT_COLOR,
            "desc": "High performers crushed by overwork. Top evaluations but "
            "driven out by excessive hours.",
            "action": "Immediate workload reduction. Cap projects at 4. "
            "Mandatory PTO. Senior mentorship.",
        },
        {
            "name": "Unhappy Underperformers",
            "rows": unhappy,
            "color": "#f59e0b",
            "desc": "Low satisfaction paired with poor performance — often "
            "under-utilized on very few projects.",
            "action": "1:1 career development. Role reassignment. Structured "
            "performance improvement plans.",
        },
        {
            "name": "Apathetic Middle",
            "rows": apathetic,
            "color": "#8b5cf6",
            "desc": "Average performers with moderate but declining "
            "satisfaction. Promotion and recognition gaps.",
            "action": "Career-path visibility. Transparent promotion criteria. "
            "Salary reviews for 3+ year staff.",
        },
    ]

    cols = st.columns(3)
    for col, p in zip(cols, profiles):
        rows = p["rows"]
        pct = len(rows) / n_leavers * 100 if n_leavers else 0
        with col:
            st.markdown(f"### {p['name']}")
            st.metric("Share of leavers", f"{pct:.0f}%")
            st.caption(f"{len(rows):,} of {n_leavers:,} employees who left")
            st.write(p["desc"])
            st.caption(
                f"Avg satisfaction {rows['satisfaction_level'].mean():.2f} · "
                f"Avg evaluation {rows['last_evaluation'].mean():.2f} · "
                f"Avg hours {rows['average_monthly_hours'].mean():.0f}/mo"
            )
            st.markdown(f"**Action plan:** {p['action']}")

    st.divider()
    st.markdown("**Key Risk Factors**")
    risk = pd.DataFrame(
        [
            ["Low Satisfaction (< 0.4)", "Leave at ~3× the rate of satisfied peers"],
            ["Overwork (> 250 hrs/mo)", "Strong burnout signal predicting departure"],
            ["Too Many Projects (≥ 6)", "45–53% attrition among heavily loaded staff"],
            ["No Promotion in 5 yrs", "Only ~2% promoted; stalled career growth"],
            ["Low Salary Band", "29% attrition vs ~7% for high-salary employees"],
        ],
        columns=["Risk Factor", "Impact"],
    )
    st.dataframe(risk, use_container_width=True, hide_index=True)

    st.markdown("**Recommendations for HR Leadership**")
    st.write(
        "- **Fix the overwork engine.** Cap monthly hours and project counts; the "
        "highest performers are leaving from burnout, not lack of ability.\n"
        "- **Act on satisfaction early.** Pulse surveys and manager check-ins for "
        "anyone trending below 0.4 satisfaction.\n"
        "- **Unblock career growth.** Clear promotion criteria and salary reviews, "
        "especially for employees at 3+ years of tenure.\n"
        "- **Deploy the model.** Score employees quarterly and route high-risk "
        "individuals to targeted retention conversations."
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

    df = load_data()

    st.title("Salifort Motors: Employee Turnover & Retention Dashboard")
    st.caption(
        "Identifying who leaves, why, and where to act — based on "
        "~12,000 employee records."
    )

    section = st.sidebar.radio(
        "Navigate",
        ["Overview", "Exploratory Analysis", "Predictive Model", "Churn Profiles & Recommendations"],
    )
    st.sidebar.divider()
    st.sidebar.caption(
        "Capstone project · Google Advanced Data Analytics\n\n"
        "Built with Streamlit, pandas, scikit-learn & Plotly."
    )

    if section == "Overview":
        section_overview(df)
    elif section == "Exploratory Analysis":
        section_eda(df)
    elif section == "Predictive Model":
        section_model(df)
    else:
        section_profiles(df)


if __name__ == "__main__":
    main()
