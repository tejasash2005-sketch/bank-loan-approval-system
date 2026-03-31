"""
ML API — Bank Loan Approval Prediction
Serves predictions using the trained RandomForest model (or fallback logic).
Run: uvicorn ml_api:app --host 0.0.0.0 --port 8000 --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import numpy as np
import os
import pickle

app = FastAPI(title="Bank Loan ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MDL_DIR  = os.path.join(BASE_DIR, "models")

# Load model if available
try:
    rf_model = pickle.load(open(os.path.join(MDL_DIR, "rf_model.pkl"), "rb"))
    scaler   = pickle.load(open(os.path.join(MDL_DIR, "scaler.pkl"),   "rb"))
    MODEL_LOADED = True
except Exception:
    rf_model = None
    scaler   = None
    MODEL_LOADED = False

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

class PredictRequest(BaseModel):
    applicant_income:    float = 50000
    coapplicant_income:  float = 0
    loan_amount:         float = 200000
    credit_history:      float = 1
    credit_score:        float = 700
    dti_ratio:           float = 0.3
    loan_to_income_ratio:float = 2
    age:                 int   = 30
    gender:              str   = "Male"
    marital_status:      str   = "Single"
    nationality:         str   = "Indian"

def build_feature_vector(req: PredictRequest) -> np.ndarray:
    ai = req.applicant_income
    ci = req.coapplicant_income
    la = req.loan_amount
    ch = req.credit_history
    ti = ai + ci
    lti = la / (ti + 1)
    log_ai = np.log1p(ai)
    log_ci = np.log1p(ci)
    log_ti = np.log1p(ti)
    lpc    = la / (ci + 1)
    dti    = req.dti_ratio
    cr_inc = req.credit_score * ai / 1e6
    ai_sq  = (ai / 1000) ** 2
    la_sq  = (la / 1000) ** 2
    inc_r  = ai / (ci + 1)
    lc_int = la * ch
    hi_loan = 1 if la > 500000 else 0
    hi_inc  = 1 if ai > 100000 else 0
    co_flag = 1 if ci > 0 else 0
    li_log  = np.log1p(la) / (log_ai + 1)
    sqrt_ai = np.sqrt(ai)
    sqrt_ci = np.sqrt(ci)
    al_int  = ai * la / 1e8
    cl_int  = ci * la / 1e8
    mar_flag = 1 if req.marital_status == "Married" else 0
    gen_flag = 1 if req.gender == "Male" else 0
    nat_flag = 1 if req.nationality.lower() in ["indian","india"] else 0
    emp_flag = 1  # default employed

    return np.array([[
        ai, ci, la, ch, ti, lti, log_ai, log_ci, log_ti, lpc,
        dti, cr_inc, ai_sq, la_sq, inc_r, lc_int,
        hi_loan, hi_inc, co_flag, li_log,
        sqrt_ai, sqrt_ci, al_int, cl_int,
        mar_flag, gen_flag, req.age, nat_flag, emp_flag
    ]])

def fallback_predict(req: PredictRequest) -> dict:
    score = 0
    score += 30 if req.credit_history == 1 else 0
    score += max(0, min(25, (req.credit_score - 300) / 600 * 25))
    ti = req.applicant_income + req.coapplicant_income
    lti = req.loan_amount / (ti + 1)
    score += max(0, (1 - min(lti / 5, 1)) * 20)
    score += max(0, (1 - min(req.dti_ratio / 0.5, 1)) * 15)
    score += min(req.applicant_income / 200000, 1) * 10
    prob = round(min(100, max(0, score)), 1)
    return {
        "prediction": 1 if prob >= 50 else 0,
        "probability": prob,
        "risk": "Low" if req.credit_score > 750 else "Medium" if req.credit_score > 650 else "High",
        "confidence": "High" if prob > 70 or prob < 30 else "Medium",
        "model": "fallback"
    }

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": MODEL_LOADED}

@app.post("/predict")
def predict(req: PredictRequest):
    if MODEL_LOADED:
        try:
            X = build_feature_vector(req)
            X_scaled = scaler.transform(X)
            prob = float(rf_model.predict_proba(X_scaled)[0][1]) * 100
            pred = 1 if prob >= 50 else 0
            cs = req.credit_score
            return {
                "prediction": pred,
                "probability": round(prob, 1),
                "risk": "Low" if cs > 750 else "Medium" if cs > 650 else "High",
                "confidence": "High" if prob > 70 or prob < 30 else "Medium",
                "model": "rf_model"
            }
        except Exception as e:
            pass  # fall through to fallback
    return fallback_predict(req)

@app.post("/explain")
def explain(req: PredictRequest):
    cs = req.credit_score
    ai = req.applicant_income
    ci = req.coapplicant_income
    la = req.loan_amount
    ti = ai + ci
    scores = {
        "Credit Score":          min(cs / 900, 1),
        "Applicant Income":      min(ai / 200000, 1),
        "DTI Ratio":             1 - min(req.dti_ratio, 1),
        "Loan Amount":           1 - min(la / 5000000, 1),
        "Credit History":        float(req.credit_history),
        "Coapplicant Income":    min(ci / 100000, 1),
        "Total Income":          min(ti / 300000, 1),
        "Loan-to-Income Ratio":  1 - min((la/(ti+1)) / 10, 1),
    }
    keys = list(scores.keys())
    vals = list(scores.values())
    best  = keys[vals.index(max(vals))]
    worst = keys[vals.index(min(vals))]
    return {
        "scores": scores,
        "best_factor":  best,
        "worst_factor": worst,
        "tip": f"Improving {worst} could boost approval chances by up to 15%."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml_api:app", host="0.0.0.0", port=8000, reload=True)
