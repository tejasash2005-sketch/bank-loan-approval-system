import React, { useState, useEffect } from "react";
import API from "../utils/api";
import { toast } from "react-toastify";

const BANKS = ["State Bank of India","HDFC Bank","ICICI Bank","Axis Bank","Punjab National Bank",
  "Bank of Baroda","Canara Bank","Kotak Mahindra Bank","Yes Bank","IndusInd Bank","Union Bank","Other"];

export default function KYCVerification() {
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [selfie, setSelfie] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [accNum, setAccNum] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState(BANKS[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    API.get("/kyc/status").then(r => {
      setKyc(r.data.kyc);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSendOtp = async () => {
    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
      toast.error("Enter a valid 10-digit phone number"); return;
    }
    try {
      const r = await API.post("/kyc/send-otp", { phone });
      setOtpSent(true);
      setDemoOtp(r.data.demo_otp);
      toast.success(`OTP sent! Demo OTP: ${r.data.demo_otp}`);
    } catch (err) { toast.error(err.response?.data?.error || "Failed to send OTP"); }
  };

  const handleVerifyOtp = async () => {
    try {
      await API.post("/kyc/verify-otp", { otp });
      setOtpVerified(true);
      toast.success("✅ OTP Verified!");
    } catch (err) { toast.error(err.response?.data?.error || "Incorrect OTP"); }
  };

  const handleSelfie = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelfie(file);
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!otpVerified) { toast.error("Verify OTP first"); return; }
    if (!selfie) { toast.error("Upload selfie"); return; }
    if (!accNum || accNum.length < 9) { toast.error("Enter valid account number"); return; }
    if (!ifsc || ifsc.length < 11) { toast.error("IFSC must be 11 characters"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("selfie", selfie);
      fd.append("phone", phone);
      fd.append("account_number", accNum);
      fd.append("ifsc_code", ifsc);
      fd.append("bank_name", bankName);
      await API.post("/kyc/submit", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("🎉 KYC Verified Successfully!");
      const r = await API.get("/kyc/status");
      setKyc(r.data.kyc);
    } catch (err) { toast.error(err.response?.data?.error || "KYC submission failed"); }
    finally { setSubmitting(false); }
  };

  const handleRedo = () => {
    setKyc(null); setOtpSent(false); setOtpVerified(false);
    setPhone(""); setOtp(""); setSelfie(null); setSelfiePreview(null);
    setAccNum(""); setIfsc(""); setDemoOtp("");
  };

  if (loading) return <div style={{padding:40,textAlign:"center"}}><span className="spinner"/></div>;

  if (kyc?.KYC_Status === "Verified") {
    return (
      <div>
        <h1>🔐 KYC — Know Your Customer</h1>
        <div className="card card-green">
          <div className="alert alert-success" style={{marginBottom:16}}>✅ KYC Verified on {kyc.Verified_At}</div>
          <div className="metrics-row">
            <div className="metric-box"><div className="metric-label">📱 Phone</div><div className="metric-value" style={{fontSize:14}}>{kyc.Phone}</div></div>
            <div className="metric-box"><div className="metric-label">🏦 Bank</div><div className="metric-value" style={{fontSize:12}}>{kyc.Bank_Name}</div></div>
            <div className="metric-box"><div className="metric-label">🔑 IFSC</div><div className="metric-value" style={{fontSize:12}}>{kyc.IFSC_Code}</div></div>
            <div className="metric-box"><div className="metric-label">💳 Account</div><div className="metric-value" style={{fontSize:12}}>{"*".repeat(8)+(kyc.Account_Number||"").slice(-4)}</div></div>
          </div>
          <button className="btn btn-blue" onClick={handleRedo} style={{marginTop:12}}>🔄 Re-do KYC</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>🔐 KYC — Know Your Customer</h1>
      <p style={{color:"rgba(0,255,224,0.6)",marginBottom:20,fontSize:14}}>Complete your KYC to enable loan disbursement to your bank account.</p>

      {/* Step 1: Phone OTP */}
      <div className="card card-cyan">
        <h3>📱 Step 1 — Phone Verification</h3>
        <div className="grid-2">
          <div className="form-group">
            <label>Mobile Number</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="10-digit number" maxLength={10} disabled={otpVerified} />
          </div>
          <div style={{display:"flex",alignItems:"flex-end",paddingBottom:16}}>
            <button className="btn btn-cyan" onClick={handleSendOtp} disabled={otpVerified}>
              📨 Send OTP
            </button>
          </div>
        </div>
        {otpSent && !otpVerified && (
          <>
            <div className="alert alert-info">✉️ OTP sent! Demo OTP: <b>{demoOtp}</b></div>
            <div className="grid-2">
              <div className="form-group">
                <label>Enter OTP</label>
                <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} />
              </div>
              <div style={{display:"flex",alignItems:"flex-end",paddingBottom:16}}>
                <button className="btn btn-green" onClick={handleVerifyOtp}>✔ Verify OTP</button>
              </div>
            </div>
          </>
        )}
        {otpVerified && <div className="alert alert-success">✅ Phone Verified Successfully!</div>}
      </div>

      {/* Step 2: Selfie */}
      <div className="card card-purple">
        <h3>🤳 Step 2 — Face Verification (Selfie)</h3>
        <div className="form-group">
          <label>Upload a clear selfie / photo for face verification</label>
          <input type="file" accept=".jpg,.jpeg,.png" onChange={handleSelfie} style={{padding:"6px"}} />
        </div>
        {selfiePreview && (
          <div style={{marginTop:12}}>
            <img src={selfiePreview} alt="selfie" style={{width:160,height:160,objectFit:"cover",borderRadius:12,border:"2px solid rgba(191,0,255,0.5)"}} />
            <div className="alert alert-success" style={{marginTop:8}}>✅ Selfie uploaded — Face match: Auto-passed (Demo mode)</div>
          </div>
        )}
      </div>

      {/* Step 3: Bank Account */}
      <div className="card card-blue">
        <h3>🏦 Step 3 — Bank Account Details</h3>
        <div className="alert alert-info" style={{marginBottom:14}}>Loan amount will be credited to this account after approval.</div>
        <div className="grid-2">
          <div className="form-group"><label>Account Number</label><input value={accNum} onChange={e=>setAccNum(e.target.value)} maxLength={18} placeholder="Bank account number" /></div>
          <div className="form-group"><label>IFSC Code</label><input value={ifsc} onChange={e=>setIfsc(e.target.value.toUpperCase())} maxLength={11} placeholder="e.g. SBIN0001234" /></div>
        </div>
        <div className="form-group">
          <label>Bank Name</label>
          <select value={bankName} onChange={e=>setBankName(e.target.value)}>
            {BANKS.map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Submit */}
      <button className="btn btn-green" onClick={handleSubmit} disabled={submitting} style={{fontSize:14,padding:"14px 32px"}}>
        {submitting ? <span className="spinner"/> : "🚀 Submit KYC"}
      </button>
    </div>
  );
}
