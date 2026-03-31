const express = require("express");
const router = express.Router();
const { readCSV, writeCSV } = require("../utils/csvdb");
const { adminMiddleware } = require("../middleware/auth");

// GET /api/admin/loans
router.get("/loans", adminMiddleware, async (req, res) => {
  try {
    const loans = await readCSV("loans");
    res.json(loans.map((l, i) => ({ ...l, _index: i })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/loans/:index/status
router.put("/loans/:index/status", adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const idx = parseInt(req.params.index);
    const loans = await readCSV("loans");
    if (!loans[idx]) return res.status(404).json({ error: "Loan not found" });

    const stageMap = {
      Approved: "Final Approval",
      Rejected: "Credit Bureau Check",
      Disbursed: "Loan Disbursement",
      Active:   "Active Repayment",
      Closed:   "Loan Closed",
    };

    loans[idx]["Loan Status"] = status;
    loans[idx]["Lifecycle Stage"] = stageMap[status] || loans[idx]["Lifecycle Stage"];
    loans[idx]["Last Updated"] = new Date().toISOString().slice(0, 16).replace("T", " ");
    if (status === "Disbursed") {
      loans[idx]["Disbursement_Date"] = new Date().toISOString().slice(0, 10);
    }

    await writeCSV("loans", loans);
    res.json({ message: `Loan #${idx} updated to ${status}`, loan: loans[idx] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/kyc
router.get("/kyc", adminMiddleware, async (req, res) => {
  try {
    const kyc = await readCSV("kyc");
    res.json(kyc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/payments
router.get("/payments", adminMiddleware, async (req, res) => {
  try {
    const payments = await readCSV("payments");
    const total = payments
      .filter((p) => p.Status === "Success")
      .reduce((sum, p) => sum + parseFloat(p.Total_Paid || 0), 0);
    res.json({ payments, total_collections: Math.round(total * 100) / 100 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get("/users", adminMiddleware, async (req, res) => {
  try {
    const users = await readCSV("users");
    res.json(users.map((u) => ({ username: u.username, role: u.role, created_at: u.created_at })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
