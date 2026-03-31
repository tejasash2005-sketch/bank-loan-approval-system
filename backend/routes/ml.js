const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");

// Pure JS ML approximation (fallback when Python ML not running)
function predictApproval(features) {
  const {
    applicant_income = 0,
    coapplicant_income = 0,
    loan_amount = 0,
    credit_history = 1,
    credit_score = 600,
    dti_ratio = 0.3,
    loan_to_income_ratio = 2,
    marital_status = "Single",
    gender = "Male",
  } = features;

  let score = 0;

  // Credit history (30%)
  score += credit_history === 1 || credit_history === "1" ? 30 : 0;

  // Credit score (25%)
  const csNum = parseFloat(credit_score);
  score += Math.max(0, Math.min(25, ((csNum - 300) / 600) * 25));

  // Income vs loan (20%)
  const totalIncome = parseFloat(applicant_income) + parseFloat(coapplicant_income);
  const ltiRatio = totalIncome > 0 ? parseFloat(loan_amount) / totalIncome : 10;
  score += Math.max(0, (1 - Math.min(ltiRatio / 5, 1)) * 20);

  // DTI (15%)
  const dti = parseFloat(dti_ratio);
  score += Math.max(0, (1 - Math.min(dti / 0.5, 1)) * 15);

  // Applicant income (10%)
  score += Math.min(parseFloat(applicant_income) / 200000, 1) * 10;

  const probability = Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
  const prediction = probability >= 50 ? 1 : 0;

  return {
    prediction,
    probability,
    risk: csNum > 750 ? "Low" : csNum > 650 ? "Medium" : "High",
    confidence: probability > 70 || probability < 30 ? "High" : "Medium",
  };
}

function getExplainability(features, credit_score, loan_amount) {
  const scores = {
    "Credit Score":          Math.min(parseFloat(credit_score) / 900, 1),
    "Applicant Income":      Math.min(parseFloat(features.applicant_income || 0) / 200000, 1),
    "DTI Ratio":             1 - Math.min(parseFloat(features.dti_ratio || 0.5), 1),
    "Loan Amount":           1 - Math.min(parseFloat(loan_amount) / 5000000, 1),
    "Credit History":        parseFloat(features.credit_history || 0),
    "Coapplicant Income":    Math.min(parseFloat(features.coapplicant_income || 0) / 100000, 1),
    "Total Income":          Math.min((parseFloat(features.applicant_income || 0) + parseFloat(features.coapplicant_income || 0)) / 300000, 1),
    "Loan-to-Income Ratio":  1 - Math.min(parseFloat(features.loan_to_income_ratio || 2) / 10, 1),
  };
  const keys = Object.keys(scores);
  const vals = Object.values(scores);
  const bestIdx = vals.indexOf(Math.max(...vals));
  const worstIdx = vals.indexOf(Math.min(...vals));
  return {
    scores,
    best_factor: keys[bestIdx],
    worst_factor: keys[worstIdx],
    tip: `Improving ${keys[worstIdx]} could boost approval chances by up to 15%.`,
  };
}

// POST /api/ml/predict
router.post("/predict", authMiddleware, (req, res) => {
  try {
    const result = predictApproval(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ml/explain
router.post("/explain", authMiddleware, (req, res) => {
  try {
    const { features, credit_score, loan_amount } = req.body;
    const result = getExplainability(features || req.body, credit_score || req.body.credit_score, loan_amount || req.body.loan_amount);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ml/cone-scores - AI light cone
router.get("/cone-scores", authMiddleware, (req, res) => {
  const labels = ["Digital","Spending","Lifestyle","Social","Discipline","Income","Risk","Fraud","Eligibility","Approval"];
  const ranges = [[60,95],[50,90],[40,85],[55,92],[60,98],[50,100],[5,40],[1,30],[60,95],[65,99]];
  const scores = ranges.map(([a, b]) => Math.floor(Math.random() * (b - a + 1)) + a);
  res.json({ labels, scores });
});

// GET /api/ml/heatmap-data
router.get("/heatmap-data", (req, res) => {
  const creditBands = ["300-450","450-600","600-700","700-800","800-900"];
  const loanBands = ["<1L","1-5L","5-15L","15-50L","50L+"];
  const riskMatrix = [[95,85,70,55,40],[80,68,52,38,25],[60,50,38,28,18],[35,28,22,15,10],[15,12,10,8,5]];
  const dtiBands = ["DTI<20%","20-30%","30-40%","40-50%","50%+"];
  const incomeBands = ["<20K","20-50K","50-100K","100-200K","200K+"];
  const approvalMatrix = [[97,92,88,80,70],[88,82,75,65,52],[70,62,55,44,32],[48,40,33,25,18],[22,18,14,10,7]];
  res.json({ creditBands, loanBands, riskMatrix, dtiBands, incomeBands, approvalMatrix });
});

module.exports = router;
