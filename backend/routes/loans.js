const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { readCSV, appendCSV, updateCSVRow, writeCSV } = require("../utils/csvdb");
const { authMiddleware } = require("../middleware/auth");

const LOAN_TYPES = {
  "Personal Loan":    { rate: 0.12, tenure: 24 },
  "Home Loan":        { rate: 0.08, tenure: 240 },
  "Car Loan":         { rate: 0.10, tenure: 60 },
  "Education Loan":   { rate: 0.09, tenure: 120 },
  "Gold Loan":        { rate: 0.11, tenure: 12 },
  "Business Loan":    { rate: 0.13, tenure: 60 },
  "Startup Loan":     { rate: 0.15, tenure: 72 },
  "Travel Loan":      { rate: 0.14, tenure: 12 },
  "Medical Loan":     { rate: 0.10, tenure: 36 },
  "Agriculture Loan": { rate: 0.07, tenure: 60 },
  "10Y Plan":         { rate: 0.09, tenure: 120 },
  "15Y Plan":         { rate: 0.085, tenure: 180 },
  "20Y Plan":         { rate: 0.08, tenure: 240 },
  "25Y Plan":         { rate: 0.078, tenure: 300 },
  "30Y Plan":         { rate: 0.075, tenure: 360 },
};

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../../uploads")),
  filename: (req, file, cb) => cb(null, uuidv4() + "_" + file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function calcEMI(principal, annualRate, months) {
  const r = annualRate / 12;
  if (r === 0) return Math.round((principal / months) * 100) / 100;
  return Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1) * 100) / 100;
}

// GET /api/loans - get user loans
router.get("/", authMiddleware, async (req, res) => {
  try {
    const loans = await readCSV("loans");
    const userLoans = loans
      .map((l, i) => ({ ...l, _index: i }))
      .filter((l) => l.Username === req.user.username);
    res.json(userLoans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/loans/types - get loan type info
router.get("/types", (req, res) => {
  res.json(LOAN_TYPES);
});

// POST /api/loans/apply - submit loan application
router.post(
  "/apply",
  authMiddleware,
  upload.fields([
    { name: "aadhaar", maxCount: 1 },
    { name: "pan", maxCount: 1 },
    { name: "credit_report", maxCount: 1 },
    { name: "bank_statement", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const body = req.body;
      const files = req.files || {};

      const loanType = body.loan_type || "Personal Loan";
      const loanInfo = LOAN_TYPES[loanType] || LOAN_TYPES["Personal Loan"];
      const loanAmount = parseFloat(body.loan_amount || 0);
      const creditScore = parseInt(body.credit_score || 600);

      const emi = calcEMI(loanAmount, loanInfo.rate, loanInfo.tenure);
      const risk = creditScore > 750 ? "Low" : creditScore > 650 ? "Medium" : "High";

      // Approval probability calculation
      const approvalProb = Math.min(100, Math.max(0,
        ((creditScore - 300) / 600) * 50 +
        Math.min(parseFloat(body.applicant_income || 0) / 200000 * 30, 30) +
        (1 - Math.min(parseFloat(body.dti_ratio || 0.5), 1)) * 20
      )).toFixed(1);

      const kycs = await readCSV("kyc");
      const kyc = kycs.filter((k) => k.Username === req.user.username).pop();

      const newLoan = {
        Username: req.user.username,
        Name: body.name || "",
        Age: body.age || "",
        Gender: body.gender || "",
        Nationality: body.nationality || "",
        "Marital Status": body.marital_status || "",
        "Loan Type": loanType,
        "Loan Amount": loanAmount,
        "Credit Score": creditScore,
        EMI: emi,
        Risk: risk,
        Fraud: "false",
        "Loan Status": "Under Review",
        "Lifecycle Stage": "Application Submitted",
        "Approval Probability": approvalProb,
        "Applied Date": new Date().toISOString().slice(0, 16).replace("T", " "),
        "Last Updated": new Date().toISOString().slice(0, 16).replace("T", " "),
        EMI_Day: body.emi_day || 5,
        Disbursement_Date: new Date().toISOString().slice(0, 10),
        Account_Number: kyc?.Account_Number || "",
        Bank_Name: kyc?.Bank_Name || "",
        IFSC_Code: kyc?.IFSC_Code || "",
        Prediction: approvalProb > 50 ? 1 : 0,
        // Feature inputs
        "Applicant Income": body.applicant_income || 0,
        "Coapplicant Income": body.coapplicant_income || 0,
        "Total Income": body.total_income || 0,
        "Loan-to-Income Ratio": body.lti_ratio || 0,
        "DTI Ratio": body.dti_ratio || 0,
        "Credit History": body.credit_history || 0,
        Aadhaar: files.aadhaar?.[0]?.filename || "",
        PAN: files.pan?.[0]?.filename || "",
        CreditFile: files.credit_report?.[0]?.filename || "",
        BankFile: files.bank_statement?.[0]?.filename || "",
      };

      const idx = await appendCSV("loans", newLoan);
      res.json({ message: "Loan application submitted", index: idx, loan: newLoan });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/loans/schedule/:index - EMI schedule
router.get("/schedule/:index", authMiddleware, async (req, res) => {
  try {
    const loans = await readCSV("loans");
    const idx = parseInt(req.params.index);
    const loan = loans[idx];
    if (!loan || loan.Username !== req.user.username)
      return res.status(404).json({ error: "Loan not found" });

    const loanType = loan["Loan Type"] || "Personal Loan";
    const loanInfo = LOAN_TYPES[loanType] || LOAN_TYPES["Personal Loan"];
    const loanAmount = parseFloat(loan["Loan Amount"] || 0);
    const emi = parseFloat(loan.EMI || calcEMI(loanAmount, loanInfo.rate, loanInfo.tenure));
    const emiDay = parseInt(loan.EMI_Day || 5);
    const disbDate = loan.Disbursement_Date || new Date().toISOString().slice(0, 10);

    const r = loanInfo.rate / 12;
    let bal = loanAmount;
    const schedule = [];

    for (let m = 1; m <= loanInfo.tenure; m++) {
      const intPart = bal * r;
      const priPart = emi - intPart;
      bal = Math.max(bal - priPart, 0);

      const base = new Date(disbDate);
      base.setMonth(base.getMonth() + m);
      base.setDate(Math.min(emiDay, 28));

      schedule.push({
        month: m,
        due_date: base.toISOString().slice(0, 10),
        emi: Math.round(emi * 100) / 100,
        principal: Math.round(priPart * 100) / 100,
        interest: Math.round(intPart * 100) / 100,
        balance: Math.round(bal * 100) / 100,
      });
    }

    res.json({ schedule, emi, tenure: loanInfo.tenure, loanAmount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 📊 REAL-TIME ANALYTICS STREAM (CSV VERSION)
router.get("/analytics-stream", async (req, res) => {
  try {
    const loans = await readCSV("loans"); // ✅ YOUR SYSTEM

    const loanTypesMap = {};
    const risk = [];
    const income = [];
    const loanAmount = [];
    const creditScores = [];
    const approval = [];

    loans.forEach(l => {
      const type = l["Loan Type"] || "Unknown";

      loanTypesMap[type] = (loanTypesMap[type] || 0) + 1;

      risk.push(l.Risk || "Medium");

      income.push(parseFloat(l["Applicant Income"] || 0));
      loanAmount.push(parseFloat(l["Loan Amount"] || 0));
      creditScores.push(parseInt(l["Credit Score"] || 650));

      approval.push(parseFloat(l["Approval Probability"] || 50));
    });

    res.json({
      loanTypes: Object.keys(loanTypesMap),
      loanCounts: Object.values(loanTypesMap),
      risk,
      income,
      loanAmount,
      creditScores,
      approval
    });

  } catch (err) {
    console.log("Analytics error:", err);
    res.status(500).json({ error: "Analytics failed" });
  }
});
module.exports = router;
module.exports.calcEMI = calcEMI;
module.exports.LOAN_TYPES = LOAN_TYPES;
