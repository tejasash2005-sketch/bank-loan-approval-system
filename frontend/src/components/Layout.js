import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const userNav = [
  { path: "/loan",     icon: "🏠", label: "Loan Application" },
  { path: "/kyc",      icon: "🔐", label: "KYC Verification" },
  { path: "/payments", icon: "💳", label: "EMI Payment Center" },
  { path: "/details",  icon: "📄", label: "Loan Details" },
  { path: "/loan-system", icon: "🏦", label: "Loan Management System" },
];

const adminNav = [
  { path: "/admin", icon: "🛠", label: "Admin Dashboard" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const nav = user?.role === "admin" ? adminNav : userNav;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>🤖 LOAN AI</h2>
          <div style={{ fontSize: 10, color: "rgba(0,255,224,0.4)", marginTop: 4, letterSpacing: 2 }}>
            BANK PREDICTION SYSTEM
          </div>
        </div>
        <div className="sidebar-user">
          👤 {user?.username}&nbsp;&nbsp;
          <span style={{
            background: user?.role === "admin" ? "rgba(191,0,255,0.2)" : "rgba(0,255,136,0.2)",
            color: user?.role === "admin" ? "#bf00ff" : "#00ff88",
            padding: "2px 8px", borderRadius: 20, fontSize: 10
          }}>
            {user?.role?.toUpperCase()}
          </span>
        </div>
        <nav style={{ flex: 1, paddingTop: 8 }}>
          {nav.map((item) => (
            <div
              key={item.path}
              className={`nav-item ${pathname === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="logout-btn" onClick={() => { logout(); navigate("/login"); }}>
          <span>🚪</span> Logout
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
