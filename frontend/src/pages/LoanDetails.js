import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import API from "../utils/api";

const LOAN_TYPES_INFO = {
  "Personal Loan":{rate:0.12,tenure:24},"Home Loan":{rate:0.08,tenure:240},
  "Car Loan":{rate:0.10,tenure:60},"Education Loan":{rate:0.09,tenure:120},
  "Gold Loan":{rate:0.11,tenure:12},"Business Loan":{rate:0.13,tenure:60},
  "Startup Loan":{rate:0.15,tenure:72},"Travel Loan":{rate:0.14,tenure:12},
  "Medical Loan":{rate:0.10,tenure:36},"Agriculture Loan":{rate:0.07,tenure:60},
  "10Y Plan":{rate:0.09,tenure:120},"15Y Plan":{rate:0.085,tenure:180},
  "20Y Plan":{rate:0.08,tenure:240},"25Y Plan":{rate:0.078,tenure:300},"30Y Plan":{rate:0.075,tenure:360}
};

export default function LoanDetails() {
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [kyc, setKyc] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [simIncome, setSimIncome] = useState(50000);
  const [simScore, setSimScore] = useState(700);
  const [simPay, setSimPay] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get("/loans"),
      API.get("/payments/user/all"),
      API.get("/kyc/status")
    ]).then(([lr, pr, kr]) => {
      setLoans(lr.data);
      setPayments(pr.data);
      setKyc(kr.data.kyc);
      if (lr.data.length > 0) {
        const idx = lr.data[lr.data.length-1]._index;
        API.get(`/loans/schedule/${idx}`).then(r=>setSchedule(r.data.schedule.slice(0,12))).catch(()=>{});
        const inc = parseFloat(lr.data[lr.data.length-1]["Applicant Income"]||50000);
        const sc = parseFloat(lr.data[lr.data.length-1]["Credit Score"]||700);
        setSimIncome(isNaN(inc)?50000:inc);
        setSimScore(isNaN(sc)?700:sc);
      }
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  if (loading) return <div style={{padding:40,textAlign:"center"}}><span className="spinner"/></div>;
  if (loans.length === 0) return (
    <div><h1>📄 Loan Details</h1><div className="alert alert-warning">No loan applications found. Apply for a loan first.</div></div>
  );

  const latest = loans[loans.length - 1];
  const loanInfo = LOAN_TYPES_INFO[latest["Loan Type"]] || LOAN_TYPES_INFO["Personal Loan"];
  const loanAmount = parseFloat(latest["Loan Amount"]||0);
  const emi = parseFloat(latest.EMI||0);
  const creditScore = parseFloat(latest["Credit Score"]||600);
  const appIncome = parseFloat(latest["Applicant Income"]||0);
  const approvalProb = parseFloat(latest["Approval Probability"]||0);

  const simProb = Math.min(100, (simScore-300)/600*50 + (simIncome/200000)*50);

  const bg = "#050d1a";
  const chartLayout = (title) => ({
    paper_bgcolor:bg, plot_bgcolor:bg,
    font:{color:"#00ffe0",family:"Orbitron",size:11},
    title:{text:title,font:{color:"#00ffe0",size:12}},
    xaxis:{showgrid:true,gridcolor:"rgba(0,255,224,0.15)",tickfont:{color:"#00ffe0"},zeroline:false},
    yaxis:{showgrid:true,gridcolor:"rgba(0,255,224,0.15)",tickfont:{color:"#00ffe0"},zeroline:false},
    margin:{l:50,r:20,t:50,b:50}, height:300
  });

  const totalPaidAmt = payments.filter(p=>p.Status==="Success").reduce((s,p)=>s+parseFloat(p.Total_Paid||0),0);

  const statusColor = (s) => s==="Approved"||s==="Disbursed"||s==="Active"||s==="Closed"?"#00ff88":s==="Rejected"?"#ff3366":"#ffaa00";
  const steps = ["Application","Verification","Credit Check","Risk Analysis","Approval"];

  return (
    <div>
      <h1>🏦 Loan Dashboard — Cyber Banking View</h1>

      {kyc ? (
        <div className="alert alert-success">✅ KYC Verified | Bank: {kyc.Bank_Name} | A/c: {"*".repeat(8)+(kyc.Account_Number||"").slice(-4)}</div>
      ) : (
        <div className="alert alert-warning">⚠️ KYC Pending — Go to KYC Verification to complete.</div>
      )}

      {/* Header card */}
      <div className="card card-cyan" style={{marginBottom:20}}>
        <h2>👤 {latest.Name}</h2>
        <div style={{fontSize:13,color:"rgba(0,255,224,0.7)"}}>
          Loan Type: {latest["Loan Type"]} &nbsp;|&nbsp; Status: <b style={{color:statusColor(latest["Loan Status"])}}>{latest["Loan Status"]}</b>
        </div>
        {latest.Account_Number && (
          <div style={{marginTop:10,fontSize:12,color:"rgba(51,153,255,0.8)"}}>
            🏦 {latest.Bank_Name} &nbsp;|&nbsp; A/c: {"*".repeat(8)+(latest.Account_Number||"").slice(-4)} &nbsp;|&nbsp; IFSC: {latest.IFSC_Code}
          </div>
        )}
      </div>

      {/* Main metrics */}
      <div className="metrics-row">
        <div className="metric-box"><div className="metric-label">💰 Loan Amount</div><div className="metric-value">₹{loanAmount.toLocaleString()}</div></div>
        <div className="metric-box"><div className="metric-label">📆 Monthly EMI</div><div className="metric-value">₹{emi.toLocaleString()}</div></div>
        <div className="metric-box"><div className="metric-label">📊 Credit Score</div><div className="metric-value">{creditScore}</div></div>
        <div className="metric-box"><div className="metric-label">🎯 Approval</div><div className="metric-value">{approvalProb}%</div></div>
        <div className="metric-box"><div className="metric-label">⚠️ Risk</div><div className="metric-value" style={{color:latest.Risk==="Low"?"#00ff88":latest.Risk==="Medium"?"#ffaa00":"#ff3366"}}>{latest.Risk}</div></div>
        <div className="metric-box"><div className="metric-label">💳 Total Paid</div><div className="metric-value">₹{totalPaidAmt.toLocaleString()}</div></div>
      </div>

      {/* AI Decision */}
      <div className="grid-2" style={{marginBottom:20}}>
        <div className={`card ${latest.Risk==="Low"?"card-green":"card-orange"}`}>
          <h3>🤖 AI Risk Assessment</h3>
          <div className="alert alert-info" style={{marginBottom:8}}>Risk Level: <b>{latest.Risk}</b></div>
          <div className={`alert ${latest.Fraud==="true"?"alert-error":"alert-success"}`}>
            Fraud Check: {latest.Fraud==="true"?"⚠️ Risk Detected":"✅ Safe"}
          </div>
        </div>
        <div className="card card-blue">
          <h3>🧬 Loan Timeline</h3>
          <div style={{background:"rgba(0,0,0,0.3)",borderRadius:8,height:8,marginBottom:12,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${approvalProb}%`,background:"linear-gradient(90deg,#00ffe0,#3399ff)",borderRadius:8,transition:"width 0.5s"}}/>
          </div>
          {steps.map((step,i)=>(
            <div key={step} style={{padding:"5px 0",fontSize:12,color:i<approvalProb/20?"#00ff88":"rgba(0,255,224,0.4)"}}>
              {i<approvalProb/20?"✔":"⏳"} {step}
            </div>
          ))}
        </div>
      </div>

      {/* Credit Score Gauge */}
      <div className="card card-cyan">
        <h3>📊 Credit Score Gauge</h3>
        <Plot
          data={[{
            type:"indicator", mode:"gauge+number", value:creditScore,
            title:{text:"Credit Score",font:{color:"#00ffe0"}},
            gauge:{
              axis:{range:[300,900],tickcolor:"#00ffe0",tickfont:{color:"#00ffe0"}},
              bar:{color:"#00ffe0"},
              steps:[{range:[300,600],color:"#330000"},{range:[600,750],color:"#663300"},{range:[750,900],color:"#003322"}],
              bordercolor:"rgba(0,255,224,0.3)"
            },
            number:{font:{color:"#00ffe0",family:"Orbitron"}}
          }]}
          layout={{paper_bgcolor:bg,plot_bgcolor:bg,font:{color:"#00ffe0",family:"Orbitron"},margin:{l:40,r:40,t:30,b:30},height:280}}
          config={{responsive:true,displayModeBar:false}} style={{width:"100%"}}
        />
      </div>

      {/* EMI Schedule */}
      {schedule.length > 0 && (
        <div className="card card-purple">
          <h3>💰 EMI Schedule (First 12 months)</h3>
          <div style={{overflowX:"auto"}}>
            <table className="data-table">
              <thead><tr><th>Month</th><th>Due Date</th><th>Principal (₹)</th><th>Interest (₹)</th><th>Balance (₹)</th></tr></thead>
              <tbody>{schedule.map(row=>(
                <tr key={row.month}>
                  <td>{row.month}</td><td>{row.due_date}</td>
                  <td>{row.principal.toLocaleString()}</td><td>{row.interest.toLocaleString()}</td><td>{row.balance.toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      {schedule.length > 0 && (
        <>
          <div className="grid-2">
            {/* EMI Breakdown Bar */}
            <div className="card card-cyan">
              <h3>💰 EMI Breakdown — Principal vs Interest</h3>
              <Plot
                data={[
                  {type:"bar",name:"Principal",x:schedule.map(r=>r.month),y:schedule.map(r=>r.principal),marker:{color:"#00ffe0"}},
                  {type:"bar",name:"Interest",x:schedule.map(r=>r.month),y:schedule.map(r=>r.interest),marker:{color:"#ff007f"}}
                ]}
                layout={{...chartLayout("Monthly EMI Split"),barmode:"stack",legend:{font:{color:"#00ffe0"}}}}
                config={{responsive:true,displayModeBar:false}} style={{width:"100%"}}
              />
            </div>

            {/* Balance trend */}
            <div className="card card-blue">
              <h3>📉 Loan Balance Trend</h3>
              <Plot
                data={[{type:"scatter",mode:"lines+markers",name:"Balance",
                  x:schedule.map(r=>r.month),y:schedule.map(r=>r.balance),
                  line:{color:"#00ffe0",width:3},marker:{size:5}
                }]}
                layout={{...chartLayout("Loan Balance Over Time")}}
                config={{responsive:true,displayModeBar:false}} style={{width:"100%"}}
              />
            </div>
          </div>

          <div className="grid-2">
            {/* Risk component analysis */}
            <div className="card card-orange">
              <h3>⚠️ Risk Component Analysis</h3>
              <Plot
                data={[{
                  type:"bar",
                  x:["Credit Strength","Income Strength","Approval"],
                  y:[creditScore/900*100,Math.min(appIncome/200000*100,100),approvalProb],
                  marker:{color:["#00ffe0","#ffaa00","#ff007f"]},
                  text:[`${(creditScore/900*100).toFixed(1)}%`,`${Math.min(appIncome/200000*100,100).toFixed(1)}%`,`${approvalProb}%`],
                  textposition:"outside"
                }]}
                layout={{...chartLayout("Risk Component Scores"),yaxis:{...chartLayout("").yaxis,range:[0,120]}}}
                config={{responsive:true,displayModeBar:false}} style={{width:"100%"}}
              />
            </div>

            {/* Income vs EMI */}
            <div className="card card-green">
              <h3>💼 Income vs EMI Burden</h3>
              <Plot
                data={[{
                  type:"bar",x:["Monthly Income","Monthly EMI"],y:[appIncome,emi],
                  marker:{color:["#00ffe0","#ff007f"]},
                  text:[`₹${appIncome.toLocaleString()}`,`₹${emi.toLocaleString()}`],
                  textposition:"outside"
                }]}
                layout={{...chartLayout("Income vs EMI Comparison"),yaxis:{...chartLayout("").yaxis,range:[0,appIncome*1.3]}}}
                config={{responsive:true,displayModeBar:false}} style={{width:"100%"}}
              />
            </div>
          </div>
        </>
      )}

      {/* Loan Simulator */}
      <div className="card card-purple">
        <h3>🧠 Loan Simulator</h3>
        <div className="grid-2">
          <div className="form-group">
            <label>Adjust Income: ₹{simIncome.toLocaleString()}</label>
            <input type="range" min={10000} max={500000} step={1000} value={simIncome} onChange={e=>setSimIncome(+e.target.value)} />
          </div>
          <div className="form-group">
            <label>Adjust Credit Score: {simScore}</label>
            <input type="range" min={300} max={900} value={simScore} onChange={e=>setSimScore(+e.target.value)} />
          </div>
        </div>
        <div style={{background:"rgba(0,0,0,0.3)",borderRadius:8,height:12,marginBottom:10,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${simProb}%`,background:`linear-gradient(90deg,${simProb>70?"#00ff88":simProb>40?"#ffaa00":"#ff3366"},#00ffe0)`,borderRadius:8,transition:"width 0.3s"}}/>
        </div>
        <div style={{fontSize:14}}>⚡ New Approval Probability: <b style={{color:"#00ffe0",fontSize:18}}>{simProb.toFixed(1)}%</b></div>
      </div>

      {/* Payment simulation */}
      <div className="card card-cyan">
        <h3>💳 Payment Simulation</h3>
        <div className="form-group">
          <label>Enter Payment Amount (₹)</label>
          <input type="number" min={0} max={loanAmount} value={simPay} onChange={e=>setSimPay(+e.target.value)} />
        </div>
        <div className="metric-box" style={{maxWidth:300}}>
          <div className="metric-label">Remaining Balance</div>
          <div className="metric-value">₹{Math.max(0,loanAmount-simPay).toLocaleString()}</div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="card card-green">
        <h3>💳 Payment Summary</h3>
        {payments.length > 0 ? (
          <>
            <div className="metrics-row" style={{marginBottom:16}}>
              <div className="metric-box"><div className="metric-label">💰 Total Paid</div><div className="metric-value">₹{totalPaidAmt.toLocaleString()}</div></div>
              <div className="metric-box"><div className="metric-label">✅ Transactions</div><div className="metric-value">{payments.filter(p=>p.Status==="Success").length}</div></div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table className="data-table">
                <thead><tr><th>Month</th><th>Paid Date</th><th>Total (₹)</th><th>Method</th><th>Txn ID</th><th>Status</th></tr></thead>
                <tbody>{payments.map((p,i)=>(
                  <tr key={i}>
                    <td>{p.Month}</td><td>{p.Paid_Date}</td>
                    <td>{parseFloat(p.Total_Paid||0).toLocaleString()}</td>
                    <td>{p.Payment_Method}</td><td style={{fontSize:10}}>{p.Transaction_ID}</td>
                    <td><span className={`badge ${p.Status==="Success"?"badge-green":"badge-red"}`}>{p.Status}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        ) : <div className="alert alert-info">No payments recorded yet.</div>}
      </div>

      {/* Loan Report Download */}
      <div className="card card-blue">
        <h3>📄 Loan Report</h3>
        <button className="btn btn-cyan" onClick={()=>{
          const report = `LOAN REPORT\n===========\nName           : ${latest.Name}\nLoan Type      : ${latest["Loan Type"]}\nLoan Amount    : ${loanAmount}\nEMI            : ${emi}\nEMI Due Day    : ${latest.EMI_Day}\nRisk           : ${latest.Risk}\nCredit Score   : ${creditScore}\nApproval Prob  : ${approvalProb}%\nStatus         : ${latest["Loan Status"]}\nApplied Date   : ${latest["Applied Date"]}\n${kyc?`\nKYC Status     : ${kyc.KYC_Status}\nPhone          : ${kyc.Phone}\nBank           : ${kyc.Bank_Name}\nIFSC           : ${kyc.IFSC_Code}\nAccount        : ${"*".repeat(8)+(kyc.Account_Number||"").slice(-4)}`:""}`;
          const a=document.createElement("a"); a.href="data:text/plain;charset=utf-8,"+encodeURIComponent(report); a.download="loan_report.txt"; a.click();
        }}>⬇ Download Report</button>
      </div>

      {/* Final decision */}
      <div style={{marginTop:16}}>
        {approvalProb > 70 ? (
          <div className="alert alert-success" style={{textAlign:"center",fontSize:16,letterSpacing:2}}>✅ LOAN APPROVED</div>
        ) : approvalProb > 40 ? (
          <div className="alert alert-warning" style={{textAlign:"center",fontSize:16,letterSpacing:2}}>⚠️ UNDER REVIEW</div>
        ) : (
          <div className="alert alert-error" style={{textAlign:"center",fontSize:16,letterSpacing:2}}>❌ LOAN REJECTED</div>
        )}
      </div>
    </div>
  );
}
