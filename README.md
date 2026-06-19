# Predictive Analytics for HR Retention: Identifying Turnover Drivers Using Machine Learning

## 📌 Executive Summary
[cite_start]Salifort Motors loses approximately 1 in 6 employees, and replacing them is costly[cite: 4]. [cite_start]This project leverages a dataset of ~12,000 employee records to build a predictive model that identifies flight risks and the underlying drivers of attrition[cite: 5, 66]. 

[cite_start]By deploying a **Tuned Random Forest classifier**, we achieved a highly accurate system for flagging at-risk employees, allowing Human Resources to transition from reactive replacements to proactive retention strategies[cite: 6, 67].

### Model Performance (Champion: Tuned Random Forest)
* [cite_start]**AUC:** 0.97 (Near-perfect discrimination) [cite: 16, 17, 18]
* [cite_start]**F1 Score:** 0.90 (Balanced precision and recall) [cite: 11, 12]
* [cite_start]**Precision:** 0.91 (When the model flags someone, it is right 91% of the time) [cite: 13, 14, 15]
* [cite_start]**Recall:** 0.88 (The model successfully catches 88% of all actual leavers) [cite: 8, 9, 10]

---

## 🔍 The Business Problem
High turnover impacts both culture and the bottom line. Salifort makes a heavy investment in recruiting, training, and upskilling talent. [cite_start]Leadership required a data-driven understanding of *why* employees are leaving and a reliable mechanism to predict *who* will leave next[cite: 64, 66, 75].

---

## 📊 Key Drivers of Turnover
[cite_start]Our exploratory data analysis and feature importance extraction revealed distinct clusters of turnover risk[cite: 45]:

1. [cite_start]**Workload Extremes:** The combination of `number_project` and `average_monthly_hours` is the strongest predictor of departure[cite: 35, 36]. We identified two distinct risk clusters:
   * [cite_start]**Burnout:** Overloaded high-performers working 175+ hours/month on 6-7 projects[cite: 41, 42, 46].
   * [cite_start]**Boreout:** Under-used employees restricted to only 2 projects[cite: 46].
2. [cite_start]**The 5-Year Itch:** Attrition risk peaks sharply as employees approach their 4th and 5th years with the company[cite: 37, 38].
3. [cite_start]**The Pay Gap:** Staff in the "low" salary band leave at approximately 4x the rate of other bands[cite: 43, 44].
4. [cite_start]**Unrewarded Excellence:** High performance evaluation scores frequently correlate with elevated departure risk, indicating a lack of upward mobility or recognition[cite: 39, 40].

---

## 💡 Strategic HR Recommendations
To convert these insights into measurable retention improvements, I recommend the following structural interventions:

* [cite_start]**Cap Workloads:** Institute an immediate HR review for any employee assigned to 6+ projects or logging over 240 hours per month[cite: 48, 50].
* [cite_start]**Re-Engage the Under-Used:** Identify employees with low satisfaction scores and limited project exposure; assign meaningful work to reignite engagement[cite: 49, 51].
* **Proactive 4-Year Reviews:** Do not wait for exit interviews. [cite_start]Schedule targeted pay, promotion, and growth trajectory reviews proactively between years 4 and 5[cite: 57, 58].
* [cite_start]**Decouple Recognition from Hours:** Shift the internal reward structure to celebrate business impact rather than sheer volume of hours worked[cite: 53, 54].
* **Deploy the Model Responsibly:** All interventions triggered by model predictions should be supportive outreach only, implemented with total transparency. [cite_start]The model is a tool for support, not surveillance[cite: 59, 60, 61].

---

## 🛠️ Project Structure
* `HR_capstone_dataset.csv`: The core dataset utilized for analysis.
* `salifort_attrition_modeling.ipynb`: The primary Python Jupyter Notebook containing the full EDA, data cleaning, and machine learning pipeline. 
* `Predicting-Employee-Turnover-at-Salifort-Motors.pdf`: The one-page executive summary designed for non-technical stakeholders.
* `PACE_Strategy_Document.docx`: The foundational planning document outlining the business scenario, ethical considerations, and milestone tracking.

## 💻 Technical Stack
* **Language:** Python
* **Data Manipulation:** Pandas, NumPy
* **Data Visualization:** Matplotlib, Seaborn
* **Machine Learning:** Scikit-Learn (Logistic Regression, Decision Trees, Random Forest), XGBoost
