# 🤖 Bank Loan Approval Prediction — Full Stack

A complete **React + Node.js + Python ML** application converted from the original Streamlit app.  
All 1889 lines of features preserved and enhanced.

---

## 🚀 Quick Start (Windows)

```
Double-click: run.bat
```

That's it. The script installs all dependencies, trains the ML model, and opens the app.

---

## 📁 Project Structure

```
bank-loan-app/
├── run.bat                  ← ONE-CLICK launcher
├── frontend/                ← React 18 app
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.js         ← Login + Register
│   │   │   ├── LoanApplication.js   ← Full loan form + AI + charts
│   │   │   ├── KYCVerification.js   ← OTP + selfie + bank details
│   │   │   ├── EMIPaymentCenter.js  ← Payment gateway + schedule
│   │   │   ├── LoanDetails.js       ← Real bank view + charts
│   │   │   └── AdminDashboard.js    ← Admin panel
│   │   ├── components/
│   │   │   └── Layout.js            ← Sidebar navigation
│   │   ├── hooks/useAuth.js         ← Auth context
│   │   ├── utils/api.js             ← Axios API client
│   │   └── styles/global.css        ← Cyberpunk theme
├── backend/                 ← Node.js Express API
│   ├── server.js
│   ├── routes/
│   │   ├── auth.js          ← Login, Register, JWT
│   │   ├── loans.js         ← Apply, schedule, list
│   │   ├── kyc.js           ← OTP, selfie, bank verify
│   │   ├── payments.js      ← Pay EMI, receipts, history
│   │   ├── ml.js            ← Predict, explain, heatmaps
│   │   └── admin.js         ← Approve/reject, view all data
│   ├── middleware/auth.js   ← JWT middleware
│   └── utils/csvdb.js       ← CSV file database
├── ml/                      ← Python ML service
│   ├── ml_api.py            ← FastAPI prediction server
│   ├── requirements.txt
│   └── scripts/
│       └── train_model.py   ← Train RandomForest model
├── data/                    ← CSV data files (auto-created)
└── uploads/                 ← Document uploads (auto-created)
```

---

## ✅ Features — All Preserved from Streamlit

| Feature | Status |
|---------|--------|
| 🔐 Login / Register with bcrypt | ✅ |
| 🏠 Loan Application Form (29 features) | ✅ |
| 📊 Real-time AI Prediction | ✅ |
| 🤖 ML RandomForest Model | ✅ |
| 🔮 AI Light Cone Radar Chart | ✅ |
| 🔬 Explainability (bar + radar) | ✅ |
| 🔥 Risk + Approval Heatmaps | ✅ |
| 📅 EMI Repayment Schedule | ✅ |
| 🚀 ZigZag Dashboard Charts | ✅ |
| 🧬 Loan Lifecycle Tracker | ✅ |
| 🧠 Advanced AI Control Panel | ✅ |
| 🔐 KYC Verification (OTP + Selfie + Bank) | ✅ |
| 💳 EMI Payment Center | ✅ |
| 🏦 Payment Gateway (UPI/Card/NetBanking) | ✅ |
| 🧾 Payment Receipts + Download | ✅ |
| ⚠️ Late Fee Calculation | ✅ |
| 📄 Loan Details — Real Bank View | ✅ |
| 📊 Credit Score Gauge | ✅ |
| 💰 EMI Breakdown Charts | ✅ |
| 🧠 Loan Simulator | ✅ |
| 💳 Payment Simulation | ✅ |
| ⬇️ Loan Report Download | ✅ |
| 🛠 Admin Dashboard | ✅ |
| ✅ Admin Approve / Reject / Disburse | ✅ |
| 🔐 KYC Admin View | ✅ |
| 💳 Payment Records Admin View | ✅ |
| 👥 User Management | ✅ |
| 📁 Document Uploads (Aadhaar/PAN/etc) | ✅ |

---

## 🔧 Manual Setup

### Prerequisites
- Node.js 18+ — https://nodejs.org
- Python 3.9+ — https://python.org (optional, for ML API)

### Backend
```bash
cd backend
npm install
npm run dev        # starts on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm start          # starts on http://localhost:3000
```

### ML API (optional)
```bash
cd ml
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
python scripts/train_model.py   # train model (first time)
python ml_api.py                # starts on http://localhost:8000
```

---

## 👤 Default Accounts

| Username | Password | Role  |
|----------|----------|-------|
| admin    | admin123 | Admin |
| user     | user123  | User  |

---

## 🗂 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register |
| GET  | /api/loans | Get user loans |
| POST | /api/loans/apply | Submit application |
| GET  | /api/loans/schedule/:id | EMI schedule |
| POST | /api/kyc/send-otp | Send OTP |
| POST | /api/kyc/verify-otp | Verify OTP |
| POST | /api/kyc/submit | Submit KYC |
| GET  | /api/kyc/status | KYC status |
| POST | /api/payments/pay | Make payment |
| GET  | /api/payments/:id | Payment history |
| POST | /api/ml/predict | AI prediction |
| POST | /api/ml/explain | Explainability |
| GET  | /api/ml/heatmap-data | Heatmap data |
| GET  | /api/admin/loans | All loans (admin) |
| PUT  | /api/admin/loans/:id/status | Update status (admin) |
| GET  | /api/admin/payments | All payments (admin) |
| GET  | /api/admin/kyc | All KYC (admin) |
