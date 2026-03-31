"""
Train the Random Forest model for loan approval prediction.
Run: python train_model.py
Outputs: models/rf_model.pkl, models/scaler.pkl
"""
import numpy as np
import pandas as pd
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MDL_DIR  = os.path.join(BASE_DIR, "models")
os.makedirs(MDL_DIR, exist_ok=True)

FEATURES = [
    'Applicant Income', 'Coapplicant Income', 'Loan Amount', 'Credit History',
    'Total Income', 'Loan-to-Income Ratio', 'Log Applicant Income',
    'Log Coapplicant Income', 'Log Total Income', 'Loan per Coapplicant',
    'DTI Ratio', 'Credit-Income Interaction', 'Applicant Income Squared',
    'Loan Amount Squared', 'Income Ratio', 'Loan-Credit Interaction',
    'High Loan Flag', 'High Income Flag', 'Coapplicant Flag',
    'Loan Income Log Ratio', 'Sqrt Applicant Income', 'Sqrt Coapplicant Income',
    'Applicant-Loan Interaction', 'Coapplicant-Loan Interaction',
    'Marital Status Flag', 'Gender Flag', 'Age', 'Nationality Flag',
    'Employment Status Flag'
]

def generate_synthetic_data(n=5000, seed=42):
    np.random.seed(seed)
    ai   = np.random.exponential(50000, n).clip(5000, 500000)
    ci   = np.random.exponential(20000, n).clip(0, 200000)
    la   = np.random.exponential(200000, n).clip(10000, 5000000)
    ch   = np.random.choice([0, 1], n, p=[0.15, 0.85])
    ti   = ai + ci
    lti  = la / (ti + 1)
    log_ai = np.log1p(ai)
    log_ci = np.log1p(ci)
    log_ti = np.log1p(ti)
    lpc    = la / (ci + 1)
    dti    = np.clip(la / (ti * 12), 0.05, 0.9)
    cs     = np.clip(300 + (ai / 2000) + np.random.randn(n)*80, 300, 900)
    cr_inc = cs * ai / 1e6
    ai_sq  = (ai / 1000) ** 2
    la_sq  = (la / 1000) ** 2
    inc_r  = ai / (ci + 1)
    lc_int = la * ch
    hi_loan = (la > 500000).astype(int)
    hi_inc  = (ai > 100000).astype(int)
    co_flag = (ci > 0).astype(int)
    li_log  = np.log1p(la) / (log_ai + 1)
    sqrt_ai = np.sqrt(ai)
    sqrt_ci = np.sqrt(ci)
    al_int  = ai * la / 1e8
    cl_int  = ci * la / 1e8
    mar_flag = np.random.choice([0, 1], n)
    gen_flag = np.random.choice([0, 1], n)
    age      = np.random.randint(21, 65, n).astype(float)
    nat_flag = np.ones(n)
    emp_flag = np.random.choice([0, 1], n, p=[0.1, 0.9])

    X = np.column_stack([
        ai, ci, la, ch, ti, lti, log_ai, log_ci, log_ti, lpc,
        dti, cr_inc, ai_sq, la_sq, inc_r, lc_int,
        hi_loan, hi_inc, co_flag, li_log,
        sqrt_ai, sqrt_ci, al_int, cl_int,
        mar_flag, gen_flag, age, nat_flag, emp_flag
    ])

    # Label: approval based on key factors
    prob = (
        0.3 * ch +
        0.25 * np.clip((cs - 300) / 600, 0, 1) +
        0.2  * np.clip(1 - lti / 5, 0, 1) +
        0.15 * np.clip(1 - dti / 0.5, 0, 1) +
        0.1  * np.clip(ai / 200000, 0, 1)
    )
    y = (prob + np.random.randn(n) * 0.05 > 0.5).astype(int)
    return X, y

print("🔄 Generating synthetic training data...")
X, y = generate_synthetic_data(5000)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("⚙️ Scaling features...")
scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

print("🤖 Training Random Forest...")
model = RandomForestClassifier(
    n_estimators=200, max_depth=12, min_samples_leaf=4,
    random_state=42, n_jobs=-1, class_weight="balanced"
)
model.fit(X_train_s, y_train)

y_pred = model.predict(X_test_s)
acc = accuracy_score(y_test, y_pred)
print(f"\n✅ Accuracy: {acc*100:.2f}%")
print(classification_report(y_test, y_pred, target_names=["Rejected","Approved"]))

# Save models
pickle.dump(model,  open(os.path.join(MDL_DIR, "rf_model.pkl"), "wb"))
pickle.dump(scaler, open(os.path.join(MDL_DIR, "scaler.pkl"),   "wb"))
print(f"\n✅ Models saved to {MDL_DIR}")

# Feature importances
importances = model.feature_importances_
top5 = sorted(zip(FEATURES, importances), key=lambda x: -x[1])[:5]
print("\n🔝 Top 5 Features:")
for f, imp in top5:
    print(f"   {f}: {imp:.4f}")
