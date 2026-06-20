# Predicting Employee Turnover at Salifort Motors

> Built an ML system that flags at-risk employees with **0.97 AUC** — and translates each prediction into a concrete retention action for HR.

**🔗 [Live Dashboard (Streamlit)](https://capstone-project-j7wejjq6ti48ugjpoapje8.streamlit.app/)  •  [Interactive Data App](https://data-insight-suite-daliyachakrobor.replit.app/data-app/dashboard)  •  [Full Analysis Notebook](salifort_attrition_modeling.ipynb)  •  [Executive Summary (PDF)](Predicting-Employee-Turnover-at-Salifort-Motors.pdf)**

---

## 📌 Executive Summary

Salifort Motors loses roughly **1 in 6 employees**, and replacing each one is expensive. Using a dataset of ~12,000 employee records, this project builds a predictive model that identifies flight risks and surfaces the underlying drivers of attrition.

A tuned **Random Forest** classifier flags at-risk employees with high accuracy, allowing Human Resources to shift from reactive replacement to proactive retention.

**Champion model — Tuned Random Forest**

| Metric | Score | What it means |
| --- | --- | --- |
| AUC | **0.97** | Near-perfect ability to separate leavers from stayers |
| F1 | **0.90** | Strong balance of precision and recall |
| Precision | **0.91** | When the model flags someone, it's right 91% of the time |
| Recall | **0.88** | Catches 88% of all actual leavers |

---

## 🔍 The Business Problem

High turnover hurts both culture and the bottom line. Salifort invests heavily in recruiting, training, and upskilling, so every avoidable departure is a sunk cost. Leadership needed two things: a data-driven understanding of *why* employees leave, and a reliable way to predict *who* will leave next — early enough to act.

---

## 📊 Key Drivers of Turnover

Exploratory analysis and feature-importance extraction revealed distinct clusters of risk:

- **Workload extremes** — the combination of `number_project` and `average_monthly_hours` is the single strongest predictor, splitting into two failure modes: **burnout** (overloaded high performers on 6–7 projects logging 175+ hours/month) and **boreout** (under-used staff restricted to only 2 projects).
- **The 5-year itch** — attrition risk peaks sharply as employees approach their 4th and 5th years.
- **The pay gap** — staff in the "low" salary band leave at roughly **4x** the rate of other bands.
- **Unrewarded excellence** — high evaluation scores often correlate with *higher* departure risk, signaling a lack of upward mobility or recognition.

---

## 📸 Interactive Dashboard

The findings ship as a 4-step decision journey — *Overview → Why They Leave → Predictive Model → Profiles & Actions.*

![Attrition Overview — workforce KPIs](docs/screenshots/overview.png)
![Model comparison — Random Forest champion](docs/screenshots/model-comparison.png)
![Leaver profiles and recommended HR actions](docs/screenshots/profiles-actions.png)

---

## 💡 Strategic HR Recommendations

- **Cap workloads.** Trigger an HR review for anyone on 6+ projects or logging over 240 hours/month.
- **Re-engage the under-used.** Identify low-satisfaction employees with little project exposure and assign meaningful work.
- **Run proactive 4-year reviews.** Don't wait for exit interviews — schedule targeted pay, promotion, and growth conversations between years 4 and 5.
- **Decouple recognition from hours.** Reward business impact, not raw volume of hours worked.
- **Deploy the model responsibly.** Predictions should drive supportive outreach only, with full transparency. The model is a tool for support, not surveillance.

---

## 🛠️ Project Structure

| File | Description |
| --- | --- |
| `HR_capstone_dataset.csv` | The core dataset used for analysis |
| `salifort_attrition_modeling.ipynb` | Full pipeline: EDA, cleaning, and machine learning |
| `Predicting-Employee-Turnover-at-Salifort-Motors.pdf` | One-page executive summary for non-technical stakeholders |
| `PACE_Strategy_Document.docx` | Planning doc covering the business scenario, ethics, and milestones |

---

## 💻 Technical Stack

- **Language:** Python
- **Data:** Pandas, NumPy
- **Visualization:** Matplotlib, Seaborn, Plotly
- **Machine Learning:** scikit-learn (Logistic Regression, Decision Tree, Random Forest), XGBoost
- **App / Deployment:** Streamlit

---

## 📈 Model Comparison

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
| --- | --- | --- | --- | --- | --- |
| Logistic Regression | 0.835 | 0.505 | 0.185 | 0.271 | 0.831 |
| Decision Tree | 0.984 | 0.971 | 0.930 | 0.950 | 0.977 |
| **Random Forest** ⭐ | **0.986** | **0.991** | **0.926** | **0.957** | **0.980** |

*Trained on 8,993 employees, evaluated on 2,998 held-out records.*
