const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { readCSV, writeCSV, appendCSV } = require("../utils/csvdb");
const { authMiddleware } = require("../middleware/auth");
const { calcEMI, LOAN_TYPES } = require("./loans");

function calcLateFee(dueDateStr, ratePerDay = 50) {
  const today = new Date();
  const due = new Date(dueDateStr);
  const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays * ratePerDay);
}

// GET /api/payments/:loanIndex - get payment history for a loan
router.get("/:loanIndex", authMiddleware, async (req, res) => {
  try {
    const payments = await readCSV("payments");
    const loanIdx = parseInt(req.params.loanIndex);
    const result = payments.filter(
      (p) => p.Username === req.user.username && parseInt(p.Loan_Index) === loanIdx
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/user/all - all payments for user
router.get("/user/all", authMiddleware, async (req, res) => {
  try {
    const payments = await readCSV("payments");
    const result = payments.filter((p) => p.Username === req.user.username);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/pay - make a payment
router.post("/pay", authMiddleware, async (req, res) => {
  try {
    const { loan_index, month, payment_method, upi_id, card_last4, bank_name } = req.body;

    const loans = await readCSV("loans");
    const idx = parseInt(loan_index);
    const loan = loans[idx];
    if (!loan || loan.Username !== req.user.username)
      return res.status(404).json({ error: "Loan not found" });

    const loanType = loan["Loan Type"] || "Personal Loan";
    const loanInfo = LOAN_TYPES[loanType] || LOAN_TYPES["Personal Loan"];
    const loanAmount = parseFloat(loan["Loan Amount"] || 0);
    const emi = parseFloat(loan.EMI || calcEMI(loanAmount, loanInfo.rate, loanInfo.tenure));
    const emiDay = parseInt(loan.EMI_Day || 5);
    const disbDate = loan.Disbursement_Date || new Date().toISOString().slice(0, 10);

    // Calculate this month's amounts
    const r = loanInfo.rate / 12;
    let bal = loanAmount;
    let priPart = 0, intPart = 0, dueDate = "";

    for (let m = 1; m <= parseInt(month); m++) {
      intPart = bal * r;
      priPart = emi - intPart;
      bal = Math.max(bal - priPart, 0);
      const base = new Date(disbDate);
      base.setMonth(base.getMonth() + m);
      base.setDate(Math.min(emiDay, 28));
      dueDate = base.toISOString().slice(0, 10);
    }

    // Check already paid
    const payments = await readCSV("payments");
    const alreadyPaid = payments.find(
      (p) =>
        p.Username === req.user.username &&
        parseInt(p.Loan_Index) === idx &&
        parseInt(p.Month) === parseInt(month) &&
        p.Status === "Success"
    );
    if (alreadyPaid)
      return res.status(400).json({ error: "This EMI month is already paid" });

    const lateFee = calcLateFee(dueDate);
    const totalPaid = emi + lateFee;

    const txnId = "TXN" + crypto
      .createHash("md5")
      .update(req.user.username + month + Date.now())
      .digest("hex")
      .slice(0, 12)
      .toUpperCase();

    const payRecord = {
      Username: req.user.username,
      Loan_Index: idx,
      Month: month,
      Due_Date: dueDate,
      Paid_Date: new Date().toISOString().slice(0, 16).replace("T", " "),
      Principal: Math.round(priPart * 100) / 100,
      Interest: Math.round(intPart * 100) / 100,
      EMI_Amount: Math.round(emi * 100) / 100,
      Late_Fee: lateFee,
      Total_Paid: Math.round(totalPaid * 100) / 100,
      Payment_Method: payment_method || "UPI",
      Transaction_ID: txnId,
      Status: "Success",
    };

    await appendCSV("payments", payRecord);

    // Check if all EMIs paid → close loan
    const updatedPayments = await readCSV("payments");
    const paidMonths = new Set(
      updatedPayments
        .filter((p) => p.Username === req.user.username && parseInt(p.Loan_Index) === idx && p.Status === "Success")
        .map((p) => parseInt(p.Month))
    );

    if (paidMonths.size >= loanInfo.tenure) {
      loans[idx]["Loan Status"] = "Closed";
      loans[idx]["Lifecycle Stage"] = "Loan Closed";
      await writeCSV("loans", loans);
    }

    res.json({
      message: "Payment successful",
      transaction_id: txnId,
      receipt: payRecord,
      loan_closed: paidMonths.size >= loanInfo.tenure,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
