const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { readCSV, writeCSV } = require("../utils/csvdb");
const { authMiddleware } = require("../middleware/auth");

// OTP storage (in-memory for demo)
const otpStore = {};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../../uploads")),
  filename: (req, file, cb) => cb(null, uuidv4() + "_" + file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/kyc/send-otp
router.post("/send-otp", authMiddleware, (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length !== 10 || !/^\d+$/.test(phone))
    return res.status(400).json({ error: "Valid 10-digit phone required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[req.user.username] = { otp, phone, expires: Date.now() + 5 * 60 * 1000 };

  // In production, send SMS. For demo, return OTP.
  res.json({ message: "OTP sent successfully", demo_otp: otp });
});

// POST /api/kyc/verify-otp
router.post("/verify-otp", authMiddleware, (req, res) => {
  const { otp } = req.body;
  const record = otpStore[req.user.username];

  if (!record) return res.status(400).json({ error: "No OTP sent" });
  if (Date.now() > record.expires) return res.status(400).json({ error: "OTP expired" });
  if (record.otp !== otp) return res.status(400).json({ error: "Incorrect OTP" });

  otpStore[req.user.username].verified = true;
  res.json({ message: "OTP verified successfully" });
});

// POST /api/kyc/submit
router.post("/submit", authMiddleware, upload.single("selfie"), async (req, res) => {
  try {
    const { phone, account_number, ifsc_code, bank_name } = req.body;
    const otpRecord = otpStore[req.user.username];

    if (!otpRecord?.verified)
      return res.status(400).json({ error: "Phone OTP not verified" });
    if (!req.file)
      return res.status(400).json({ error: "Selfie not uploaded" });
    if (!account_number || account_number.length < 9)
      return res.status(400).json({ error: "Invalid account number" });
    if (!ifsc_code || ifsc_code.length < 11)
      return res.status(400).json({ error: "Invalid IFSC code (11 chars)" });

    const kycs = await readCSV("kyc");
    const filtered = kycs.filter((k) => k.Username !== req.user.username);

    const record = {
      Username: req.user.username,
      Phone: phone,
      OTP_Verified: "true",
      Selfie_Uploaded: req.file.filename,
      Account_Number: account_number,
      IFSC_Code: ifsc_code.toUpperCase(),
      Bank_Name: bank_name,
      KYC_Status: "Verified",
      Verified_At: new Date().toISOString().slice(0, 16).replace("T", " "),
    };

    filtered.push(record);
    await writeCSV("kyc", filtered, Object.keys(record));
    delete otpStore[req.user.username];

    res.json({ message: "KYC verified successfully", kyc: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kyc/status
router.get("/status", authMiddleware, async (req, res) => {
  try {
    const kycs = await readCSV("kyc");
    const userKyc = kycs.filter((k) => k.Username === req.user.username).pop();
    if (!userKyc) return res.json({ verified: false, kyc: null });
    res.json({ verified: userKyc.KYC_Status === "Verified", kyc: userKyc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
