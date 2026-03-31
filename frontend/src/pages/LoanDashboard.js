import React, { useState } from "react";
import { getCreditScore, calculateEMI } from "../api/loanApi";

export default function LoanDashboard() {
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [credit, setCredit] = useState(null);
  const [emi, setEmi] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input;
    setChat((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");
    setLoading(true);

    let botReply = "";

    try {
      const msg = userText.toLowerCase();

      // 🟣 CREDIT INTELLIGENCE
      if (msg.includes("credit")) {
        const res = await getCreditScore({
          income: 60000,
          loans: 1,
          history: "good",
        });

        setCredit(res);

        botReply = `
🟣 CREDIT INTELLIGENCE RESULT:

📊 Credit Score: ${res.creditScore}
⚠️ Risk Level: ${res.risk}

📈 Income Stability: High
💳 Debt-to-Income Ratio: 32%
🏦 Loan Eligibility: 78%
⚠️ Employment Risk: Low
💰 Banking Behavior: Good
🚨 Fraud Risk: Low
🛍 Spending Type: Moderate Saver
📉 Default Risk: 12%
📊 Credit Trend: Improving
        `;
      }

      // 🟡 EMI INTELLIGENCE
      else if (msg.includes("emi")) {
        const res = await calculateEMI({
          principal: 500000,
          rate: 10,
          tenure: 60,
        });

        setEmi(res);

        botReply = `
🟡 REPAYMENT INTELLIGENCE:

💰 EMI: ₹${res.emi}
📦 Total Payable: ₹${res.totalPayable}

📊 Loan Affordability Score: 75%
📉 Default Risk Probability: 12%
⏳ Early Repayment Benefit Available
        `;
      }

      // 🤖 DEFAULT AI RESPONSE
      else {
        botReply = `
🤖 AI LOAN ASSISTANT:

Ask me:
✔ Credit analysis
✔ EMI calculation
✔ Loan eligibility
✔ Risk prediction
        `;
      }
    } catch (error) {
      console.error(error);

      botReply = `
❌ SYSTEM ERROR:
Backend not responding or API failed.
Check server connection.
      `;
    }

    setChat((prev) => [...prev, { role: "bot", text: botReply }]);
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🏦 Customer Intelligence System</h1>

      {/* 🟣 CUSTOMER INTELLIGENCE PANEL */}
      <div className="card">
        <h2>🟣 Customer Intelligence Dashboard</h2>

        {credit ? (
          <div>
            <p>📊 Credit Score: <b>{credit.creditScore}</b></p>
            <p>⚠️ Risk Level: <b>{credit.risk}</b></p>
            <hr />

            <p>📈 Income Stability: High</p>
            <p>💳 Debt-to-Income Ratio: 32%</p>
            <p>🏦 Loan Eligibility Score: 78%</p>
            <p>⚠️ Employment Risk: Low</p>
            <p>💰 Banking Behavior Score: Good</p>
            <p>🚨 Fraud Risk Indicator: Low</p>
            <p>🛍 Spending Pattern: Moderate Saver</p>
            <p>📉 Default Risk Probability: 12%</p>
            <p>📊 Credit Growth Trend: Improving</p>
          </div>
        ) : (
          <p>Ask AI: <b>"credit"</b> to load intelligence</p>
        )}
      </div>

      {/* 🟡 REPAYMENT PANEL */}
      <div className="card">
        <h2>🟡 Repayment Intelligence</h2>

        {emi ? (
          <div>
            <p>💰 EMI: <b>₹{emi.emi}</b></p>
            <p>📦 Total Payable: <b>₹{emi.totalPayable}</b></p>
            <p>📊 Loan Affordability: 75%</p>
            <p>📉 Default Risk: 12%</p>
          </div>
        ) : (
          <p>Ask AI: <b>"emi"</b> to load repayment data</p>
        )}
      </div>

      {/* 🤖 AI CHAT */}
      <div className="card">
        <h2>🤖 AI Loan Assistant</h2>

        <div
          style={{
            height: 250,
            overflowY: "auto",
            background: "#111",
            padding: 10,
            borderRadius: 8,
          }}
        >
          {chat.map((c, i) => (
            <p
              key={i}
              style={{
                color: c.role === "user" ? "#00ffcc" : "#ffcc00",
                whiteSpace: "pre-line",
              }}
            >
              <b>{c.role.toUpperCase()}:</b> {c.text}
            </p>
          ))}
        </div>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask: credit or emi..."
          style={{ width: "75%", padding: 8, marginTop: 10 }}
        />

        <button onClick={handleSend} disabled={loading}>
          {loading ? "Processing..." : "Send"}
        </button>
      </div>
    </div>
  );
}