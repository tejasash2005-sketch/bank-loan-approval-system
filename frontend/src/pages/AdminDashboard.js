import React, { useState, useEffect } from "react";
import API from "../utils/api";
import { toast } from "react-toastify";

export default function AdminDashboard() {
  const [tab, setTab] = useState("loans");
  const [loans, setLoans] = useState([]);
  const [kycs, setKycs] = useState([]);
  const [payData, setPayData] = useState({ payments: [], total_collections: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [lr, kr, pr, ur] = await Promise.all([
        API.get("/admin/loans"),
        API.get("/admin/kyc"),
        API.get("/admin/payments"),
        API.get("/admin/users"),
      ]);
      setLoans(lr.data);
      setKycs(kr.data);
      setPayData(pr.data);
      setUsers(ur.data);
    } catch (err) { toast.error("Failed to load admin data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const updateStatus = async (index, status) => {
    setActionLoading(`${index}-${status}`);
    try {
      await API.put(`/admin/loans/${index}/status`, { status });
      toast.success(`Loan #${index} → ${status}`);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || "Update failed"); }
    finally { setActionLoading(null); }
  };

  const tabs = [
    { id:"loans",  icon:"📋", label:"Loan Applications" },
    { id:"kyc",    icon:"🔐", label:"KYC Records" },
    { id:"payments",icon:"💳", label:"Payment Records" },
    { id:"users",  icon:"👥", label:"Users" },
  ];

  if (loading) return <div style={{padding:40,textAlign:"center"}}><span className="spinner"/></div>;

  return (
    <div>
      <h1>🛠 Admin Dashboard</h1>

      {/* Stats */}
      <div className="metrics-row">
        <div className="metric-box"><div className="metric-label">📋 Total Loans</div><div className="metric-value">{loans.length}</div></div>
        <div className="metric-box"><div className="metric-label">✅ Approved</div><div className="metric-value" style={{color:"#00ff88"}}>{loans.filter(l=>l["Loan Status"]==="Approved"||l["Loan Status"]==="Disbursed").length}</div></div>
        <div className="metric-box"><div className="metric-label">⏳ Under Review</div><div className="metric-value" style={{color:"#ffaa00"}}>{loans.filter(l=>l["Loan Status"]==="Under Review").length}</div></div>
        <div className="metric-box"><div className="metric-label">❌ Rejected</div><div className="metric-value" style={{color:"#ff3366"}}>{loans.filter(l=>l["Loan Status"]==="Rejected").length}</div></div>
        <div className="metric-box"><div className="metric-label">💰 Collections</div><div className="metric-value">₹{payData.total_collections?.toLocaleString()}</div></div>
        <div className="metric-box"><div className="metric-label">🔐 KYC Verified</div><div className="metric-value">{kycs.filter(k=>k.KYC_Status==="Verified").length}</div></div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:8,marginBottom:20,borderBottom:"1px solid rgba(0,255,224,0.15)",paddingBottom:0}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"10px 20px",background:"transparent",border:"none",
            borderBottom:tab===t.id?"2px solid #00ffe0":"2px solid transparent",
            color:tab===t.id?"#00ffe0":"rgba(0,255,224,0.4)",
            cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:0.5
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Loans Tab */}
      {tab==="loans" && (
        <div>
          <div className="card card-cyan" style={{marginBottom:16}}>
            <h3>📋 All Loan Applications</h3>
            <div style={{overflowX:"auto"}}>
              <table className="data-table">
                <thead><tr>
                  <th>#</th><th>Name</th><th>Username</th><th>Loan Type</th>
                  <th>Amount (₹)</th><th>EMI (₹)</th><th>Credit Score</th>
                  <th>Risk</th><th>Approval%</th><th>Status</th><th>Applied</th><th>Actions</th>
                </tr></thead>
                <tbody>{loans.map((l,i)=>(
                  <tr key={i}>
                    <td>{l._index}</td>
                    <td>{l.Name||"—"}</td>
                    <td>{l.Username}</td>
                    <td>{l["Loan Type"]}</td>
                    <td>{parseFloat(l["Loan Amount"]||0).toLocaleString()}</td>
                    <td>{parseFloat(l.EMI||0).toLocaleString()}</td>
                    <td>{l["Credit Score"]}</td>
                    <td><span className={`badge ${l.Risk==="Low"?"badge-green":l.Risk==="Medium"?"badge-yellow":"badge-red"}`}>{l.Risk}</span></td>
                    <td>{l["Approval Probability"]}%</td>
                    <td>
                      <span className={`badge ${l["Loan Status"]==="Approved"||l["Loan Status"]==="Disbursed"||l["Loan Status"]==="Closed"?"badge-green":l["Loan Status"]==="Rejected"?"badge-red":"badge-yellow"}`}>
                        {l["Loan Status"]}
                      </span>
                    </td>
                    <td style={{fontSize:10}}>{(l["Applied Date"]||"").slice(0,10)}</td>
                    <td>
                      <div style={{display:"flex",gap:4}}>
                        {["Approved","Rejected","Disbursed"].map(s=>(
                          <button key={s} disabled={!!actionLoading || l["Loan Status"]===s}
                            onClick={()=>updateStatus(l._index, s)}
                            style={{padding:"3px 8px",fontSize:10,borderRadius:6,border:"none",cursor:"pointer",opacity:l["Loan Status"]===s?0.4:1,
                              background:s==="Approved"?"rgba(0,255,136,0.2)":s==="Rejected"?"rgba(255,51,102,0.2)":"rgba(51,153,255,0.2)",
                              color:s==="Approved"?"#00ff88":s==="Rejected"?"#ff3366":"#66bbff"
                            }}>
                            {actionLoading===`${l._index}-${s}`?<span className="spinner"/>:
                              s==="Approved"?"✅ Approve":s==="Rejected"?"❌ Reject":"💰 Disburse"}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          {/* Document list */}
          <div className="card card-purple">
            <h3>📄 User Documents</h3>
            <div style={{overflowX:"auto"}}>
              <table className="data-table">
                <thead><tr><th>Name</th><th>Username</th><th>Aadhaar</th><th>PAN</th><th>Credit File</th><th>Bank File</th><th>EMI Day</th><th>Bank</th><th>A/c (last4)</th><th>IFSC</th></tr></thead>
                <tbody>{loans.map((l,i)=>(
                  <tr key={i}>
                    <td>{l.Name||"—"}</td><td>{l.Username}</td>
                    <td><span className={`badge ${l.Aadhaar?"badge-green":"badge-red"}`}>{l.Aadhaar?"✅ Yes":"❌ No"}</span></td>
                    <td><span className={`badge ${l.PAN?"badge-green":"badge-red"}`}>{l.PAN?"✅ Yes":"❌ No"}</span></td>
                    <td><span className={`badge ${l.CreditFile?"badge-green":"badge-red"}`}>{l.CreditFile?"✅ Yes":"❌ No"}</span></td>
                    <td><span className={`badge ${l.BankFile?"badge-green":"badge-red"}`}>{l.BankFile?"✅ Yes":"❌ No"}</span></td>
                    <td>{l.EMI_Day||"—"}</td><td>{l.Bank_Name||"—"}</td>
                    <td>{l.Account_Number?"*".repeat(4)+(l.Account_Number||"").slice(-4):"—"}</td>
                    <td>{l.IFSC_Code||"—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* KYC Tab */}
      {tab==="kyc" && (
        <div className="card card-green">
          <h3>🔐 KYC Verification Records</h3>
          {kycs.length===0 ? (
            <div className="alert alert-info">No KYC records yet.</div>
          ) : (
            <div style={{overflowX:"auto"}}>
              <table className="data-table">
                <thead><tr><th>Username</th><th>Phone</th><th>OTP Verified</th><th>Bank</th><th>IFSC</th><th>A/c (last 4)</th><th>KYC Status</th><th>Verified At</th></tr></thead>
                <tbody>{kycs.map((k,i)=>(
                  <tr key={i}>
                    <td>{k.Username}</td><td>{k.Phone}</td>
                    <td><span className={`badge ${k.OTP_Verified==="true"?"badge-green":"badge-red"}`}>{k.OTP_Verified==="true"?"✅ Yes":"❌ No"}</span></td>
                    <td>{k.Bank_Name}</td><td>{k.IFSC_Code}</td>
                    <td>{"*".repeat(4)+(k.Account_Number||"").slice(-4)}</td>
                    <td><span className={`badge ${k.KYC_Status==="Verified"?"badge-green":"badge-yellow"}`}>{k.KYC_Status}</span></td>
                    <td>{k.Verified_At}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {tab==="payments" && (
        <div>
          <div className="metrics-row" style={{marginBottom:16}}>
            <div className="metric-box"><div className="metric-label">💰 Total Collections</div><div className="metric-value">₹{payData.total_collections?.toLocaleString()}</div></div>
            <div className="metric-box"><div className="metric-label">✅ Successful Txns</div><div className="metric-value">{payData.payments?.filter(p=>p.Status==="Success").length}</div></div>
          </div>
          <div className="card card-blue">
            <h3>💳 All Payment Records</h3>
            {payData.payments?.length===0 ? (
              <div className="alert alert-info">No payment records yet.</div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table className="data-table">
                  <thead><tr><th>Username</th><th>Loan#</th><th>Month</th><th>Paid Date</th><th>EMI (₹)</th><th>Late Fee</th><th>Total (₹)</th><th>Method</th><th>Txn ID</th><th>Status</th></tr></thead>
                  <tbody>{payData.payments?.map((p,i)=>(
                    <tr key={i}>
                      <td>{p.Username}</td><td>{p.Loan_Index}</td><td>{p.Month}</td><td>{p.Paid_Date}</td>
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
        </div>
      )}

      {/* Users Tab */}
      {tab==="users" && (
        <div className="card card-cyan">
          <h3>👥 Registered Users</h3>
          <div style={{overflowX:"auto"}}>
            <table className="data-table">
              <thead><tr><th>Username</th><th>Role</th><th>Created At</th></tr></thead>
              <tbody>{users.map((u,i)=>(
                <tr key={i}>
                  <td>{u.username}</td>
                  <td><span className={`badge ${u.role==="admin"?"badge-blue":"badge-green"}`}>{u.role}</span></td>
                  <td>{u.created_at?.slice(0,10)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
