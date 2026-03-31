import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import API from "../utils/api";
import { toast } from "react-toastify";

const LOAN_TYPES = [
  "Personal Loan","Home Loan","Car Loan","Education Loan","Gold Loan",
  "Business Loan","Startup Loan","Travel Loan","Medical Loan","Agriculture Loan",
  "10Y Plan","15Y Plan","20Y Plan","25Y Plan","30Y Plan"
];
const FEATURES = [
  "Applicant Income","Coapplicant Income","Loan Amount","Credit History",
  "Total Income","Loan-to-Income Ratio","Log Applicant Income","Log Coapplicant Income",
  "Log Total Income","Loan per Coapplicant","DTI Ratio","Credit-Income Interaction",
  "Applicant Income Squared","Loan Amount Squared","Income Ratio","Loan-Credit Interaction",
  "High Loan Flag","High Income Flag","Coapplicant Flag","Loan Income Log Ratio",
  "Sqrt Applicant Income","Sqrt Coapplicant Income","Applicant-Loan Interaction",
  "Coapplicant-Loan Interaction","Marital Status Flag","Gender Flag","Age",
  "Nationality Flag","Employment Status Flag"
];
const LC_STEPS = [
  ["Application Submitted","📋"],["Document Verification","🔍"],["AI Risk Assessment","🤖"],
  ["Credit Bureau Check","🏦"],["Underwriting Review","📝"],["Final Approval","✅"],
  ["Loan Disbursement","💰"],["Active Repayment","🔄"],["Loan Closed","🎉"]
];

function calcEMI(principal, annualRate, months) {
  const r = annualRate / 12;
  if (!r) return Math.round(principal / months * 100) / 100;
  return Math.round(principal * r * Math.pow(1+r,months) / (Math.pow(1+r,months)-1) * 100) / 100;
}

const LOAN_INFO = {
  "Personal Loan":{rate:0.12,tenure:24},"Home Loan":{rate:0.08,tenure:240},
  "Car Loan":{rate:0.10,tenure:60},"Education Loan":{rate:0.09,tenure:120},
  "Gold Loan":{rate:0.11,tenure:12},"Business Loan":{rate:0.13,tenure:60},
  "Startup Loan":{rate:0.15,tenure:72},"Travel Loan":{rate:0.14,tenure:12},
  "Medical Loan":{rate:0.10,tenure:36},"Agriculture Loan":{rate:0.07,tenure:60},
  "10Y Plan":{rate:0.09,tenure:120},"15Y Plan":{rate:0.085,tenure:180},
  "20Y Plan":{rate:0.08,tenure:240},"25Y Plan":{rate:0.078,tenure:300},"30Y Plan":{rate:0.075,tenure:360}
};

export default function LoanApplication() {
  const [form, setForm] = useState({
    name:"",age:25,gender:"Male",nationality:"Indian",marital_status:"Single",
    loan_type:"Personal Loan",credit_score:700,emi_day:5,
    applicant_income:50000,coapplicant_income:0,loan_amount:200000,
    credit_history:1,dti_ratio:0.3,lti_ratio:2,total_income:50000
  });
  const [files, setFiles] = useState({ aadhaar:null,pan:null,credit_report:null,bank_statement:null });
  const [loading, setLoading] = useState(false);
  const [kyc, setKyc] = useState(null);
  const [loans, setLoans] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [explainData, setExplainData] = useState(null);
  const [coneScores, setConeScores] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [showAdv, setShowAdv] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [advControls, setAdvControls] = useState({
    riskScore:40,fraudScore:10,approvalProb:70,deviceTrust:80,loginConsistency:75,
    dynamicInterest:10,geoRisk:50
  });

  const loanInfo = LOAN_INFO[form.loan_type] || LOAN_INFO["Personal Loan"];
  const emi = calcEMI(form.loan_amount, loanInfo.rate, loanInfo.tenure);
  const risk = form.credit_score > 750 ? "Low" : form.credit_score > 650 ? "Medium" : "High";

  useEffect(() => {
  API.get("/kyc/status").then(r => setKyc(r.data.kyc)).catch(()=>{});
  API.get("/loans").then(r => setLoans(r.data)).catch(()=>{});
  API.get("/ml/cone-scores").then(r => setConeScores(r.data)).catch(()=>{});
  API.get("/ml/heatmap-data").then(r => setHeatmapData(r.data)).catch(()=>{});

  // 🚀 ADD THIS REAL-TIME STREAMING SECTION
  const interval = setInterval(() => {
    API.get("/loans/analytics-stream")
      .then(res => setAnalytics(res.data))
      .catch(err => console.log("analytics error", err));
  }, 3000);

  return () => clearInterval(interval);
}, []);

  useEffect(() => {
    // Auto-compute prediction on form change
    const t = setTimeout(() => {
      API.post("/ml/predict", {
        applicant_income: form.applicant_income,
        coapplicant_income: form.coapplicant_income,
        loan_amount: form.loan_amount,
        credit_history: form.credit_history,
        credit_score: form.credit_score,
        dti_ratio: form.dti_ratio,
        loan_to_income_ratio: form.lti_ratio,
      }).then(r => {
        setPrediction(r.data);
        API.post("/ml/explain", {
          features: form, credit_score: form.credit_score, loan_amount: form.loan_amount
        }).then(re => setExplainData(re.data)).catch(()=>{});
      }).catch(()=>{});
    }, 400);
    return () => clearTimeout(t);
  }, [form]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name) { toast.error("Enter your full name"); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      if (files.aadhaar) fd.append("aadhaar", files.aadhaar);
      if (files.pan) fd.append("pan", files.pan);
      if (files.credit_report) fd.append("credit_report", files.credit_report);
      if (files.bank_statement) fd.append("bank_statement", files.bank_statement);
      await API.post("/loans/apply", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("✅ Loan application submitted!");
      const r = await API.get("/loans");
      setLoans(r.data);
      // Load schedule for last loan
      if (r.data.length > 0) {
        const lastIdx = r.data[r.data.length - 1]._index;
        const sr = await API.get(`/loans/schedule/${lastIdx}`);
        setSchedule(sr.data.schedule);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Submission failed");
    } finally { setLoading(false); }
  };

  const lastLoan = loans.length > 0 ? loans[loans.length - 1] : null;
  const lcIdx = lastLoan ? (() => {
    const mp = {"Under Review":2,"Approved":5,"Disbursed":6,"Active":7,"Closed":8,"Rejected":3};
    return mp[lastLoan["Loan Status"]] || 0;
  })() : 0;

  // Build zigzag chart data
  const mths = Array.from({length: loanInfo.tenure}, (_, i) => i + 1);
  const r = loanInfo.rate / 12;
  let bal = form.loan_amount;
  const bals = [], pris = [], ints = [], cums = [];
  let cpaid = 0;
  mths.forEach(() => {
    const it = bal * r, pt = emi - it;
    bal = Math.max(bal - pt, 0);
    cpaid += emi;
    bals.push(Math.round(bal)); pris.push(Math.round(pt)); ints.push(Math.round(it)); cums.push(Math.round(cpaid));
  });

  const plotBg = "#000a1e";

  return (
    <div>
      <h1>⚡ Bank Loan Approval Prediction</h1>

      {/* Personal Info */}
      <div className="card card-cyan">
        <h3>👤 Personal Information</h3>
        <div className="grid-4">
          <div className="form-group"><label>Full Name</label><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Your name" /></div>
          <div className="form-group"><label>Age</label><input type="number" min={18} max={100} value={form.age} onChange={e=>set("age",+e.target.value)} /></div>
          <div className="form-group"><label>Gender</label><select value={form.gender} onChange={e=>set("gender",e.target.value)}><option>Male</option><option>Female</option></select></div>
          <div className="form-group"><label>Nationality</label><input value={form.nationality} onChange={e=>set("nationality",e.target.value)} /></div>
        </div>
        <div className="grid-4">
          <div className="form-group"><label>Marital Status</label><select value={form.marital_status} onChange={e=>set("marital_status",e.target.value)}><option>Single</option><option>Married</option></select></div>
          <div className="form-group"><label>Loan Type</label><select value={form.loan_type} onChange={e=>set("loan_type",e.target.value)}>{LOAN_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label>Credit Score: {form.credit_score}</label><input type="range" min={300} max={900} value={form.credit_score} onChange={e=>set("credit_score",+e.target.value)} /></div>
          <div className="form-group"><label>EMI Due Day: {form.emi_day}</label><input type="range" min={1} max={28} value={form.emi_day} onChange={e=>set("emi_day",+e.target.value)} /></div>
        </div>
      </div>

      {/* Financial Inputs */}
      <div className="card card-blue">
        <h3>💰 Financial Details</h3>
        <div className="grid-4">
          {[
            ["Applicant Income (₹)","applicant_income"],["Coapplicant Income (₹)","coapplicant_income"],
            ["Loan Amount (₹)","loan_amount"],["Total Income (₹)","total_income"]
          ].map(([label,key])=>(
            <div className="form-group" key={key}>
              <label>{label}</label>
              <input type="number" value={form[key]} onChange={e=>set(key,+e.target.value)} />
            </div>
          ))}
        </div>
        <div className="grid-4">
          <div className="form-group"><label>Credit History (0/1)</label><select value={form.credit_history} onChange={e=>set("credit_history",+e.target.value)}><option value={1}>1 - Good</option><option value={0}>0 - Bad</option></select></div>
          <div className="form-group"><label>DTI Ratio: {form.dti_ratio}</label><input type="range" min={0.05} max={0.9} step={0.01} value={form.dti_ratio} onChange={e=>set("dti_ratio",+e.target.value)} /></div>
          <div className="form-group"><label>Loan-to-Income Ratio: {form.lti_ratio}</label><input type="range" min={0.1} max={10} step={0.1} value={form.lti_ratio} onChange={e=>set("lti_ratio",+e.target.value)} /></div>
        </div>
      </div>

      {/* Documents */}
      <div className="card card-purple">
        <h3>📄 Document Uploads</h3>
        <div className="grid-4">
          {[["Aadhaar Card","aadhaar"],["PAN Card","pan"],["Credit Report","credit_report"],["Bank Statement","bank_statement"]].map(([label,key])=>(
            <div className="form-group" key={key}>
              <label>{label}</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>setFiles(f=>({...f,[key]:e.target.files[0]}))} style={{padding:"6px"}} />
              {files[key] && <div style={{fontSize:11,color:"#00ff88",marginTop:4}}>✅ {files[key].name}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* KYC notice */}
      {kyc ? (
        <div className="alert alert-success">✅ KYC Verified — Loan will be credited to {kyc.Bank_Name} A/c ending {String(kyc.Account_Number||"").slice(-4)}</div>
      ) : (
        <div className="alert alert-warning">⚠️ KYC not completed. Go to KYC Verification to enable disbursement.</div>
      )}

      {/* Real-time prediction */}
      {prediction && (
        <div className="metrics-row" style={{marginBottom:20}}>
          <div className="metric-box" style={{borderColor: prediction.prediction===1?"rgba(0,255,136,0.4)":"rgba(255,51,102,0.4)"}}>
            <div className="metric-label">AI Decision</div>
            <div className="metric-value" style={{color:prediction.prediction===1?"#00ff88":"#ff3366"}}>
              {prediction.prediction===1?"APPROVED ✅":"REVIEW ⚠️"}
            </div>
          </div>
          <div className="metric-box"><div className="metric-label">Approval Prob</div><div className="metric-value">{prediction.probability}%</div></div>
          <div className="metric-box"><div className="metric-label">Risk Level</div><div className="metric-value" style={{color:risk==="Low"?"#00ff88":risk==="Medium"?"#ffaa00":"#ff3366"}}>{risk}</div></div>
          <div className="metric-box"><div className="metric-label">Monthly EMI</div><div className="metric-value">₹{emi.toLocaleString()}</div></div>
          <div className="metric-box"><div className="metric-label">Loan Amount</div><div className="metric-value">₹{form.loan_amount.toLocaleString()}</div></div>
          <div className="metric-box"><div className="metric-label">Tenure</div><div className="metric-value">{loanInfo.tenure} mo</div></div>
        </div>
      )}

      {/* Submit */}
      <button className="btn btn-green" onClick={handleSubmit} disabled={loading} style={{marginBottom:24,fontSize:14,padding:"14px 32px"}}>
        {loading ? <span className="spinner"/> : "🚀 Apply for Loan"}
      </button>

      {/* Lifecycle Tracker */}
      <div className="card card-cyan">
        <h3>🧬 Loan Lifecycle Tracker</h3>
        {LC_STEPS.map(([label,icon],i)=>(
          <div key={i} className={`lc-step ${i<lcIdx?"lc-done":i===lcIdx?"lc-active":"lc-wait"}`}>
            <span style={{fontSize:16}}>{icon}</span>
            <span style={{minWidth:28,fontWeight:"bold"}}>[{i<lcIdx?"✔":i===lcIdx?"▶":i+1}]</span>
            <span>{label}</span>
          </div>
        ))}
        {lastLoan && (
          <div className="metrics-row" style={{marginTop:16}}>
            <div className="metric-box"><div className="metric-label">Current Stage</div><div className="metric-value" style={{fontSize:12}}>{LC_STEPS[lcIdx][0]}</div></div>
            <div className="metric-box"><div className="metric-label">Approval Prob</div><div className="metric-value">{lastLoan["Approval Probability"]}%</div></div>
            <div className="metric-box"><div className="metric-label">Applied On</div><div className="metric-value" style={{fontSize:11}}>{lastLoan["Applied Date"]?.slice(0,10)}</div></div>
          </div>
        )}
      </div>

      {/* AI Light Cone */}
      {coneScores && (
        <div className="card card-blue">
          <h3>🔮 AI Light Cone Decision Engine</h3>
          <Plot
            data={[{
              type:"scatterpolar", r:coneScores.scores, theta:coneScores.labels,
              fill:"toself", fillcolor:"rgba(0,234,255,0.08)",
              line:{color:"#00eaff",width:2}, marker:{size:8,color:coneScores.scores,colorscale:"Turbo"},
              mode:"lines+markers+text", text:coneScores.scores.map(s=>s+"%"), textposition:"top center"
            }]}
            layout={{
              polar:{bgcolor:"#001a33",radialaxis:{visible:true,range:[0,100],gridcolor:"rgba(0,234,255,0.2)",tickfont:{color:"#00eaff"}},angularaxis:{tickfont:{color:"#00eaff"},gridcolor:"rgba(0,234,255,0.2)"}},
              paper_bgcolor:"#001a33", font:{color:"#00eaff",family:"Orbitron"},
              title:{text:"🤖 AI Decision Radar",font:{color:"#00eaff",size:13}},
              margin:{l:60,r:60,t:50,b:60}, height:380
            }}
            config={{responsive:true,displayModeBar:false}}
            style={{width:"100%"}}
          />
          <div style={{textAlign:"center",marginTop:12,fontSize:18,color:"#00eaff",padding:"12px",background:"rgba(0,234,255,0.05)",borderRadius:10,fontFamily:"Orbitron",letterSpacing:2}}>
            🧠 FINAL AI DECISION: <b style={{color:coneScores.scores[9]>70?"#00ff88":"#ffaa00"}}>{coneScores.scores[9]>70?"APPROVED ✅":"REVIEW ⚠️"}</b>
          </div>
        </div>
      )}

      {/* AI Explainability */}
      {explainData && (
        <div className="card card-pink">
          <h3>🔬 AI Explainability — Feature Impact Analysis</h3>
          <div className="grid-2">
            <Plot
              data={[{
                type:"bar", orientation:"h",
                x:Object.values(explainData.scores), y:Object.keys(explainData.scores),
                marker:{color:Object.values(explainData.scores),colorscale:[[0,"#ff3366"],[0.5,"#ffff00"],[1,"#00ff88"]],cmin:0,cmax:1}
              }]}
              layout={{
                paper_bgcolor:"#1a0020",plot_bgcolor:"#1a0020",
                font:{color:"#ff88ff",family:"Orbitron"},
                title:{text:"📊 Feature Contribution",font:{color:"#ff88ff",size:12}},
                xaxis:{range:[0,1.2],tickformat:".0%",tickfont:{color:"#ff88ff"},showgrid:true,gridcolor:"rgba(255,0,204,0.1)"},
                yaxis:{tickfont:{color:"#ff88ff"},showgrid:false},
                margin:{l:20,r:60,t:40,b:20}, height:300
              }}
              config={{responsive:true,displayModeBar:false}} style={{width:"100%"}}
            />
            <Plot
              data={[{
                type:"scatterpolar",
                r:[...Object.values(explainData.scores), Object.values(explainData.scores)[0]],
                theta:[...Object.keys(explainData.scores), Object.keys(explainData.scores)[0]],
                fill:"toself",fillcolor:"rgba(255,0,204,0.1)",line:{color:"#ff00cc",width:2}
              }]}
              layout={{
                polar:{bgcolor:"#0d0020",radialaxis:{range:[0,1],gridcolor:"rgba(255,0,204,0.2)",tickfont:{color:"#ff88ff"},tickformat:".0%"},angularaxis:{tickfont:{color:"#ff88ff",size:9},gridcolor:"rgba(255,0,204,0.2)"}},
                paper_bgcolor:"#1a0020", font:{color:"#ff88ff",family:"Orbitron"},
                title:{text:"🕸 AI Risk Radar",font:{color:"#ff88ff",size:12}},
                margin:{l:40,r:40,t:40,b:40}, height:300
              }}
              config={{responsive:true,displayModeBar:false}} style={{width:"100%"}}
            />
          </div>
          <div style={{background:"rgba(255,0,204,0.07)",border:"1px solid rgba(255,0,204,0.2)",borderRadius:12,padding:"14px 18px",marginTop:12,fontSize:13}}>
            🟢 <b>Strongest factor:</b> {explainData.best_factor}<br/>
            🔴 <b>Weakest factor:</b> {explainData.worst_factor}<br/>
            🤖 <b>AI Tip:</b> {explainData.tip}
          </div>
        </div>
      )}

      {/* Heatmaps */}
      {heatmapData && (
        <div className="card card-orange">
          <h3>🔥 Risk & Approval Heatmaps</h3>
          <div className="grid-2">
            <Plot
              data={[{
                type:"heatmap", z:heatmapData.riskMatrix,
                x:heatmapData.loanBands, y:heatmapData.creditBands,
                colorscale:[[0,"#00ff88"],[0.4,"#ffff00"],[0.75,"#ff6600"],[1,"#ff0033"]],
                text:heatmapData.riskMatrix.map(row=>row.map(v=>v+"%")),texttemplate:"%{text}",
                textfont:{color:"white",size:11}, showscale:true
              }]}
              layout={{
                paper_bgcolor:"#1a0800",plot_bgcolor:"#1a0800",
                font:{color:"#ff8800",family:"Orbitron"},
                title:{text:"⚠️ Risk Matrix: Credit vs Loan Amount",font:{color:"#ff8800",size:12}},
                xaxis:{title:"Loan Amount",tickfont:{color:"#ff8800"},showgrid:false},
                yaxis:{title:"Credit Score Band",tickfont:{color:"#ff8800"},showgrid:false},
                margin:{l:20,r:20,t:40,b:40}, height:300
              }}
              config={{responsive:true,displayModeBar:false}} style={{width:"100%"}}
            />
            <Plot
              data={[{
                type:"heatmap", z:heatmapData.approvalMatrix,
                x:heatmapData.incomeBands, y:heatmapData.dtiBands,
                colorscale:[[0,"#ff0033"],[0.4,"#ff8800"],[0.7,"#ffff00"],[1,"#00ff88"]],
                text:heatmapData.approvalMatrix.map(row=>row.map(v=>v+"%")),texttemplate:"%{text}",
                textfont:{color:"white",size:11}, showscale:true
              }]}
              layout={{
                paper_bgcolor:"#1a0800",plot_bgcolor:"#1a0800",
                font:{color:"#ff8800",family:"Orbitron"},
                title:{text:"✅ Approval: DTI vs Income",font:{color:"#ff8800",size:12}},
                xaxis:{title:"Income Band",tickfont:{color:"#ff8800"},showgrid:false},
                yaxis:{title:"DTI Band",tickfont:{color:"#ff8800"},showgrid:false},
                margin:{l:20,r:20,t:40,b:40}, height:300
              }}
              config={{responsive:true,displayModeBar:false}} style={{width:"100%"}}
            />
          </div>
        </div>
      )}

      {/* EMI Schedule */}
      {schedule.length > 0 && (
        <div className="card card-purple">
          <h3>📅 EMI Repayment Schedule (First 12 months)</h3>
          <div style={{overflowX:"auto"}}>
            <table className="data-table">
              <thead><tr><th>Month</th><th>Due Date</th><th>EMI (₹)</th><th>Principal (₹)</th><th>Interest (₹)</th><th>Balance (₹)</th></tr></thead>
              <tbody>{schedule.slice(0,12).map(row=>(
                <tr key={row.month}>
                  <td>{row.month}</td><td>{row.due_date}</td>
                  <td>{row.emi.toLocaleString()}</td><td>{row.principal.toLocaleString()}</td>
                  <td>{row.interest.toLocaleString()}</td><td>{row.balance.toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ZigZag Dashboard Charts */}
      <div className="card card-green">
        <h3>🚀 Loan Dashboard — ZigZag Intelligence Charts</h3>
        <Plot
          data={[
            {x:mths,y:bals,mode:"lines+markers",name:"🔵 Outstanding Balance",line:{color:"#00eaff",width:2.5},fill:"tozeroy",fillcolor:"rgba(0,234,255,0.05)"},
            {x:mths,y:pris,mode:"lines+markers",name:"🟢 Principal/Month",line:{color:"#00ff88",width:2,dash:"dot"},marker:{symbol:"diamond",size:4}},
            {x:mths,y:ints,mode:"lines+markers",name:"🔴 Interest/Month",line:{color:"#ff3366",width:2,dash:"dash"},marker:{symbol:"triangle-up",size:4}},
            {x:mths,y:cums,mode:"lines",name:"🟡 Cumulative Paid",line:{color:"#ffff00",width:2,dash:"longdashdot"}}
          ]}
          layout={{
            paper_bgcolor:"#000f00",plot_bgcolor:"#000f00",
            font:{color:"#00ff88",family:"Orbitron"},
            title:{text:"📈 ZigZag — Balance · Principal · Interest · Cumulative",font:{color:"#00ff88",size:13}},
            xaxis:{title:"Month",showgrid:true,gridcolor:"rgba(0,255,100,0.08)",tickfont:{color:"#00ff88"},zeroline:false},
            yaxis:{title:"Amount (₹)",showgrid:true,gridcolor:"rgba(0,255,100,0.08)",tickfont:{color:"#00ff88"},zeroline:false},
            legend:{bgcolor:"rgba(0,0,0,0.6)",font:{color:"#00ff88",size:10}},
            hovermode:"x unified", margin:{l:60,r:20,t:50,b:50}, height:360
          }}
          config={{responsive:true,displayModeBar:false}} style={{width:"100%"}}
        />
      </div>
      {/*charts*/}
     {analytics && (
      <div
        style={{
          background: "#0b1220",
          borderRadius: "14px",
          padding: "16px",
          border: "1px solid #22314a",
          color: "white"
        }}
      >
        <h3 style={{ marginBottom: "10px", color: "#00d4ff" }}>
          💰 Financial Intelligence Panel
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px"
          }}
        >

          {/* 1. COMBINED FINANCIAL FLOW */}
          <Plot
            data={[
              {
                x: analytics?.months || [],
                y: analytics?.approval || [],
                type: "scatter",
                mode: "lines+markers",
                line: { color: "#00d4ff", width: 3 },
                marker: { size: 5 }
              },
              {
                x: analytics?.months || [],
                y: analytics?.loanCounts || [],
                type: "scatter",
                mode: "lines",
                line: { color: "#5ee6a8", width: 2, dash: "dot" }
              }
            ]}
            layout={{
              title: "Cash Flow vs Approval",
              height: 260,
              margin: { t: 30, l: 30, r: 10, b: 30 },
              paper_bgcolor: "#0b1220",
              plot_bgcolor: "#0f1a2e",
              font: { color: "white" }
            }}
            config={{ displayModeBar: false }}
          />

          {/* 2. LOAN STRUCTURE + RISK */}
          <Plot
            data={[
              {
                x: analytics?.loanTypes || [],
                y: analytics?.loanCounts || [],
                type: "bar",
                marker: {
                  color: (analytics?.risk || []).map((r) =>
                    r === "High"
                      ? "#ff4d4d"
                      : r === "Medium"
                      ? "#ffb84d"
                      : "#5ee6a8"
                  )
                }
              }
            ]}
            layout={{
              title: "Loan Structure + Risk",
              height: 260,
              margin: { t: 30, l: 30, r: 10, b: 30 },
              paper_bgcolor: "#0b1220",
              plot_bgcolor: "#0f1a2e",
              font: { color: "white" }
            }}
            config={{ displayModeBar: false }}
          />

          {/* 3. INCOME vs LOAN */}
          <Plot
            data={[
              {
                x: analytics?.income || [],
                y: analytics?.loanAmount || [],
                mode: "markers",
                type: "scatter",
                marker: {
                  size: (analytics?.creditScores || []).map((v) =>
                    v ? v / 40 : 8
                  ),
                  color: analytics?.riskScore || [],
                  colorscale: [
                    [0, "#ff4d4d"],
                    [0.5, "#ffb84d"],
                    [1, "#00d4ff"]
                  ],
                  opacity: 0.85,
                  showscale: false
                }
              }
            ]}
            layout={{
              title: "Income • Loan • Risk Fusion",
              height: 260,
              margin: { t: 30, l: 30, r: 10, b: 30 },
              paper_bgcolor: "#0b1220",
              plot_bgcolor: "#0f1a2e",
              font: { color: "white" }
            }}
            config={{ displayModeBar: false }}
          />

          {/* 4. CREDIT + RISK SUMMARY */}
          <Plot
            data={[
              {
                x: analytics?.risk || [],
                y: analytics?.loanCounts || [],
                type: "bar",
                marker: {
                  color: ["#5ee6a8", "#ffb84d", "#ff4d4d"]
                }
              },
              {
                x: analytics?.risk || [],
                y:
                  analytics?.creditScores ||
                  analytics?.loanCounts ||
                  [],
                type: "scatter",
                mode: "lines+markers",
                line: { color: "#00d4ff", width: 2 }
              }
            ]}
            layout={{
              title: "Risk + Credit Fusion View",
              height: 260,
              margin: { t: 30, l: 30, r: 10, b: 30 },
              paper_bgcolor: "#0b1220",
              plot_bgcolor: "#0f1a2e",
              font: { color: "white" }
            }}
            config={{ displayModeBar: false }}
          />

        </div>
      </div>
    )}
      {/* Advanced AI Panel */}
      <div className="card card-orange">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3>🧠 Advanced AI Control Panel</h3>
          <button className="btn btn-cyan" onClick={()=>setShowAdv(v=>!v)}>{showAdv?"❌ Close":"⚡ Open"} Advanced Panel</button>
        </div>
        {showAdv && (
          <div>
            <div className="grid-2">
              <div>
                <h3 style={{color:"#ff8800"}}>🤖 AI Risk Engine</h3>
                {[["Risk Score","riskScore",0,100],["Fraud Score","fraudScore",0,100],["Approval Probability","approvalProb",0,100]].map(([label,key,min,max])=>(
                  <div className="form-group" key={key}>
                    <label>{label}: {advControls[key]}</label>
                    <input type="range" min={min} max={max} value={advControls[key]} onChange={e=>setAdvControls(a=>({...a,[key]:+e.target.value}))} />
                  </div>
                ))}
              </div>
              <div>
                <h3 style={{color:"#3399ff"}}>🔐 Security & Intelligence</h3>
                {[["Device Trust","deviceTrust",0,100],["Login Consistency","loginConsistency",0,100],["Geo Risk Score","geoRisk",0,100],["Dynamic Interest Rate","dynamicInterest",1,20]].map(([label,key,min,max])=>(
                  <div className="form-group" key={key}>
                    <label>{label}: {advControls[key]}</label>
                    <input type="range" min={min} max={max} value={advControls[key]} onChange={e=>setAdvControls(a=>({...a,[key]:+e.target.value}))} />
                  </div>
                ))}
              </div>
            </div>
            {/* Final AI Score */}
            <div style={{background:"rgba(255,102,0,0.07)",border:"1px solid rgba(255,102,0,0.3)",borderRadius:12,padding:"16px 20px",marginTop:12}}>
              {(() => {
                const fscore = advControls.riskScore*0.3 + (100-advControls.fraudScore)*0.2 + advControls.approvalProb*0.3 + advControls.deviceTrust*0.2;
                return (
                  <>
                    <div style={{marginBottom:8,fontSize:13}}>🎯 Final AI Score: <b style={{fontSize:18}}>{Math.round(fscore)}</b></div>
                    <div className={fscore>70?"alert alert-success":fscore>40?"alert alert-warning":"alert alert-error"}>
                      {fscore>70?"✅ HIGH APPROVAL CHANCE":fscore>40?"⚠️ MEDIUM RISK — FURTHER REVIEW":"❌ HIGH RISK — NOT RECOMMENDED"}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
