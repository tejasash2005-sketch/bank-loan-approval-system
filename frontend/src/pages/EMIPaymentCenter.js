import React, { useState, useEffect } from "react";
import API from "../utils/api";
import { toast } from "react-toastify";

function calcLateFee(dueDateStr) {
  const today = new Date();
  const due = new Date(dueDateStr);
  const days = Math.floor((today - due) / 86400000);
  return Math.max(0, days * 50);
}

function getEmiStatus(dueDateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dueDateStr); due.setHours(0,0,0,0);
  const diff = Math.floor((due - today) / 86400000);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Due Today";
  if (diff <= 7) return "Due Soon";
  return "Upcoming";
}

const LOAN_TYPES_INFO = {
  "Personal Loan":{rate:0.12,tenure:24},"Home Loan":{rate:0.08,tenure:240},
  "Car Loan":{rate:0.10,tenure:60},"Education Loan":{rate:0.09,tenure:120},
  "Gold Loan":{rate:0.11,tenure:12},"Business Loan":{rate:0.13,tenure:60},
  "Startup Loan":{rate:0.15,tenure:72},"Travel Loan":{rate:0.14,tenure:12},
  "Medical Loan":{rate:0.10,tenure:36},"Agriculture Loan":{rate:0.07,tenure:60},
  "10Y Plan":{rate:0.09,tenure:120},"15Y Plan":{rate:0.085,tenure:180},
  "20Y Plan":{rate:0.08,tenure:240},"25Y Plan":{rate:0.078,tenure:300},"30Y Plan":{rate:0.075,tenure:360}
};

export default function EMIPaymentCenter() {
  const [loans, setLoans] = useState([]);
  const [selIdx, setSelIdx] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selMonth, setSelMonth] = useState(null);
  const [payMethod, setPayMethod] = useState("UPI");
  const [upiId, setUpiId] = useState("");
  const [cardNum, setCardNum] = useState(""); const [cardExp, setCardExp] = useState(""); const [cardCvv, setCardCvv] = useState(""); const [cardName, setCardName] = useState("");
  const [nbBank, setNbBank] = useState("SBI"); const [nbUser, setNbUser] = useState(""); const [nbPwd, setNbPwd] = useState("");
  const [paying, setPaying] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/loans").then(r => {
      setLoans(r.data);
      if (r.data.length > 0) {
        const idx = r.data[r.data.length-1]._index;
        setSelIdx(idx);
      }
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  useEffect(() => {
    if (selIdx === null) return;
    API.get(`/loans/schedule/${selIdx}`).then(r => setSchedule(r.data.schedule)).catch(()=>{});
    API.get(`/payments/${selIdx}`).then(r => setPayments(r.data)).catch(()=>{});
  }, [selIdx]);

  const paidMonths = new Set(payments.filter(p=>p.Status==="Success").map(p=>parseInt(p.Month)));
  const loan = selIdx !== null ? loans.find(l=>l._index===selIdx) : null;
  const loanInfo = loan ? (LOAN_TYPES_INFO[loan["Loan Type"]] || LOAN_TYPES_INFO["Personal Loan"]) : null;
  const emi = loan ? parseFloat(loan.EMI||0) : 0;
  const loanAmount = loan ? parseFloat(loan["Loan Amount"]||0) : 0;

  const enriched = schedule.map(row => {
    const isPaid = paidMonths.has(row.month);
    const status = isPaid ? "Paid" : getEmiStatus(row.due_date);
    const lateFee = isPaid ? 0 : calcLateFee(row.due_date);
    return { ...row, status, lateFee };
  });

  const unpaid = enriched.filter(r => !paidMonths.has(r.month));
  const overdue = enriched.filter(r => r.status === "Overdue");

  const handlePay = async () => {
    if (selMonth === null) { toast.error("Select an EMI month"); return; }
    setPaying(true);
    try {
      const r = await API.post("/payments/pay", {
        loan_index: selIdx, month: selMonth,
        payment_method: payMethod
      });
      toast.success("✅ Payment Successful! Txn: " + r.data.transaction_id);
      setLastReceipt(r.data.receipt);
      const [sr, pr] = await Promise.all([
        API.get(`/loans/schedule/${selIdx}`),
        API.get(`/payments/${selIdx}`)
      ]);
      setSchedule(sr.data.schedule);
      setPayments(pr.data);
      if (r.data.loan_closed) toast.success("🎉 Loan fully paid and closed!");
    } catch (err) { toast.error(err.response?.data?.error || "Payment failed"); }
    finally { setPaying(false); }
  };

  if (loading) return <div style={{padding:40,textAlign:"center"}}><span className="spinner"/></div>;
  if (loans.length === 0) return (
    <div>
      <h1>💳 EMI Payment Center</h1>
      <div className="alert alert-warning">No loan applications found. Apply for a loan first.</div>
    </div>
  );

  const selectedRow = selMonth !== null ? enriched.find(r=>r.month===selMonth) : null;
  const totalDue = selectedRow ? selectedRow.emi + selectedRow.lateFee : 0;

  return (
    <div>
      <h1>💳 EMI Payment Center</h1>

      {/* Loan selector */}
      <div className="card card-cyan">
        <h3>🏦 Select Loan</h3>
        <select value={selIdx ?? ""} onChange={e=>{setSelIdx(parseInt(e.target.value));setSelMonth(null);setLastReceipt(null);}}>
          {loans.map(l=>(
            <option key={l._index} value={l._index}>
              Loan #{l._index} — {l["Loan Type"]} — ₹{parseFloat(l["Loan Amount"]||0).toLocaleString()} — {l["Loan Status"]}
            </option>
          ))}
        </select>
      </div>

      {/* Metrics */}
      {loan && (
        <div className="metrics-row">
          <div className="metric-box"><div className="metric-label">💰 Total Loan</div><div className="metric-value">₹{loanAmount.toLocaleString()}</div></div>
          <div className="metric-box"><div className="metric-label">📆 Monthly EMI</div><div className="metric-value">₹{emi.toLocaleString()}</div></div>
          <div className="metric-box"><div className="metric-label">✅ EMIs Paid</div><div className="metric-value">{paidMonths.size} / {loanInfo?.tenure}</div></div>
          <div className="metric-box" style={{borderColor:"rgba(255,51,102,0.4)"}}><div className="metric-label">⚠️ Overdue</div><div className="metric-value" style={{color:"#ff3366"}}>{overdue.length}</div></div>
        </div>
      )}

      {/* EMI Status Board */}
      <div className="card card-yellow">
        <h3>📅 EMI Status Board</h3>
        {enriched.filter(r=>["Overdue","Due Today","Due Soon","Upcoming"].includes(r.status)).slice(0,6).map(row=>(
          <div key={row.month} className={`emi-${row.status==="Overdue"?"overdue":row.status==="Due Today"||row.status==="Due Soon"?"due":row.status==="Paid"?"paid":"upcoming"}`}>
            Month {row.month} — Due: {row.due_date} — EMI: ₹{row.emi.toLocaleString()}
            {row.lateFee>0 && <span style={{color:"#ff6666"}}> | 🔴 Late Fee: ₹{row.lateFee}</span>}
            &nbsp;— <b>{row.status}</b>
          </div>
        ))}
        {unpaid.length===0 && <div className="alert alert-success">🎉 All EMIs up to date!</div>}
      </div>

      {/* Payment Gateway */}
      <div className="card card-blue">
        <h3>🏦 Payment Gateway</h3>
        {unpaid.length > 0 ? (
          <>
            <div className="form-group">
              <label>Select EMI to Pay</label>
              <select value={selMonth??""} onChange={e=>setSelMonth(parseInt(e.target.value))}>
                <option value="">-- Select Month --</option>
                {unpaid.map(r=>(
                  <option key={r.month} value={r.month}>
                    Month {r.month} — Due {r.due_date} — ₹{(r.emi+r.lateFee).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {selectedRow && (
              <div style={{background:"rgba(51,153,255,0.07)",border:"1px solid rgba(51,153,255,0.3)",borderRadius:12,padding:"14px 18px",marginBottom:16,fontSize:13}}>
                📅 Due: <b>{selectedRow.due_date}</b> &nbsp;|&nbsp;
                💰 EMI: <b>₹{selectedRow.emi.toLocaleString()}</b> &nbsp;|&nbsp;
                🔴 Late Fee: <b>₹{selectedRow.lateFee}</b> &nbsp;|&nbsp;
                💳 Total: <b style={{color:"#00ffe0",fontSize:16}}>₹{totalDue.toFixed(2)}</b>
              </div>
            )}

            {/* Payment method */}
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              {["UPI","Card","Net Banking"].map(m=>(
                <button key={m} className={`btn ${payMethod===m?"btn-cyan":"btn-blue"}`} onClick={()=>setPayMethod(m)}>
                  {m==="UPI"?"📱":m==="Card"?"💳":"🏦"} {m}
                </button>
              ))}
            </div>

            {payMethod==="UPI" && (
              <div className="form-group"><label>UPI ID</label><input value={upiId} onChange={e=>setUpiId(e.target.value)} placeholder="yourname@upi" /></div>
            )}
            {payMethod==="Card" && (
              <div className="grid-2">
                <div className="form-group"><label>Card Number</label><input value={cardNum} onChange={e=>setCardNum(e.target.value)} maxLength={16} placeholder="16-digit number" /></div>
                <div className="form-group"><label>Expiry (MM/YY)</label><input value={cardExp} onChange={e=>setCardExp(e.target.value)} maxLength={5} placeholder="MM/YY" /></div>
                <div className="form-group"><label>CVV</label><input type="password" value={cardCvv} onChange={e=>setCardCvv(e.target.value)} maxLength={3} /></div>
                <div className="form-group"><label>Name on Card</label><input value={cardName} onChange={e=>setCardName(e.target.value)} /></div>
              </div>
            )}
            {payMethod==="Net Banking" && (
              <div className="grid-2">
                <div className="form-group"><label>Bank</label><select value={nbBank} onChange={e=>setNbBank(e.target.value)}>
                  {["SBI","HDFC","ICICI","Axis","PNB","Kotak","Yes Bank","IndusInd"].map(b=><option key={b}>{b}</option>)}
                </select></div>
                <div className="form-group"><label>User ID</label><input value={nbUser} onChange={e=>setNbUser(e.target.value)} /></div>
                <div className="form-group"><label>Password</label><input type="password" value={nbPwd} onChange={e=>setNbPwd(e.target.value)} /></div>
              </div>
            )}

            <button className="btn btn-green" onClick={handlePay} disabled={paying||selMonth===null} style={{fontSize:14,padding:"13px 28px"}}>
              {paying ? <><span className="spinner"/> Processing...</> : "💸 Pay Now"}
            </button>
          </>
        ) : (
          <div className="alert alert-success">🎉 All EMIs for this loan are paid!</div>
        )}
      </div>

      {/* Receipt */}
      {lastReceipt && (
        <div className="receipt-card" style={{marginBottom:20}}>
          <h3 style={{color:"#00ff88",textAlign:"center",letterSpacing:3,textShadow:"0 0 15px #00ff44",marginBottom:16}}>🧾 PAYMENT RECEIPT</h3>
          <div className="grid-2" style={{gap:8,fontSize:13}}>
            {[["🔢 Transaction ID",lastReceipt.Transaction_ID],["📅 Paid Date",lastReceipt.Paid_Date],
              ["📆 EMI Month",lastReceipt.Month],["💰 EMI Amount","₹"+parseFloat(lastReceipt.EMI_Amount).toLocaleString()],
              ["🔴 Late Fee","₹"+parseFloat(lastReceipt.Late_Fee).toLocaleString()],
              ["💳 Total Paid","₹"+parseFloat(lastReceipt.Total_Paid).toLocaleString()],
              ["🏦 Method",lastReceipt.Payment_Method],["✅ Status",lastReceipt.Status]
            ].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(0,255,136,0.1)"}}>
                <span style={{color:"rgba(0,255,136,0.7)"}}>{k}</span>
                <b style={{color:"#00ffe0"}}>{v}</b>
              </div>
            ))}
          </div>
          <button className="btn btn-green" onClick={()=>{
            const txt = `PAYMENT RECEIPT\nTransaction ID : ${lastReceipt.Transaction_ID}\nPaid Date      : ${lastReceipt.Paid_Date}\nEMI Month      : ${lastReceipt.Month}\nEMI Amount     : Rs.${lastReceipt.EMI_Amount}\nLate Fee       : Rs.${lastReceipt.Late_Fee}\nTotal Paid     : Rs.${lastReceipt.Total_Paid}\nMethod         : ${lastReceipt.Payment_Method}\nStatus         : SUCCESS`;
            const a=document.createElement("a"); a.href="data:text/plain;charset=utf-8,"+encodeURIComponent(txt); a.download=`receipt_${lastReceipt.Transaction_ID}.txt`; a.click();
          }} style={{marginTop:14}}>⬇ Download Receipt</button>
        </div>
      )}

      {/* Payment History */}
      <div className="card card-cyan">
        <h3>📜 Payment History</h3>
        {payments.length === 0 ? (
          <div className="alert alert-info">No payments made yet.</div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table className="data-table">
              <thead><tr><th>Month</th><th>Due Date</th><th>Paid Date</th><th>EMI (₹)</th><th>Late Fee</th><th>Total (₹)</th><th>Method</th><th>Txn ID</th><th>Status</th></tr></thead>
              <tbody>{[...payments].sort((a,b)=>a.Month-b.Month).map((p,i)=>(
                <tr key={i}>
                  <td>{p.Month}</td><td>{p.Due_Date}</td><td>{p.Paid_Date}</td>
                  <td>{parseFloat(p.EMI_Amount||0).toLocaleString()}</td>
                  <td style={{color:"#ff6666"}}>{parseFloat(p.Late_Fee||0).toLocaleString()}</td>
                  <td style={{color:"#00ff88"}}>{parseFloat(p.Total_Paid||0).toLocaleString()}</td>
                  <td>{p.Payment_Method}</td><td style={{fontSize:10}}>{p.Transaction_ID}</td>
                  <td><span className={`badge ${p.Status==="Success"?"badge-green":"badge-red"}`}>{p.Status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full EMI Schedule */}
      <div className="card card-purple">
        <h3>📅 Full EMI Schedule</h3>
        <div style={{overflowX:"auto",maxHeight:360,overflowY:"auto"}}>
          <table className="data-table">
            <thead><tr><th>Month</th><th>Due Date</th><th>EMI (₹)</th><th>Principal</th><th>Interest</th><th>Balance</th><th>Late Fee</th><th>Status</th></tr></thead>
            <tbody>{enriched.map(row=>(
              <tr key={row.month}>
                <td>{row.month}</td><td>{row.due_date}</td>
                <td>{row.emi.toLocaleString()}</td><td>{row.principal.toLocaleString()}</td>
                <td>{row.interest.toLocaleString()}</td><td>{row.balance.toLocaleString()}</td>
                <td style={{color:row.lateFee>0?"#ff6666":"#888"}}>{row.lateFee||"—"}</td>
                <td>
                  <span className={`badge ${row.status==="Paid"?"badge-green":row.status==="Overdue"?"badge-red":row.status==="Upcoming"?"badge-blue":"badge-yellow"}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
