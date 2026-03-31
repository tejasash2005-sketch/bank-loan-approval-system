import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/global.css";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout";
import LoanApplication from "./pages/LoanApplication";
import KYCVerification from "./pages/KYCVerification";
import EMIPaymentCenter from "./pages/EMIPaymentCenter";
import LoanDetails from "./pages/LoanDetails";
import AdminDashboard from "./pages/AdminDashboard";
import LoanDashboard from "./pages/LoanDashboard";

function PrivateRoute({ children, adminOnly = false }) {
  const { isLoggedIn, user } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== "admin") return <Navigate to="/loan" replace />;
  return children;
}

function AppRoutes() {
  const { isLoggedIn, user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to={user?.role === "admin" ? "/admin" : "/loan"} replace /> : <LoginPage />} />
      <Route path="/" element={<Navigate to={isLoggedIn ? (user?.role === "admin" ? "/admin" : "/loan") : "/login"} replace />} />
      <Route path="/loan" element={<PrivateRoute><Layout><LoanApplication /></Layout></PrivateRoute>} />
      <Route path="/kyc" element={<PrivateRoute><Layout><KYCVerification /></Layout></PrivateRoute>} />
      <Route path="/payments" element={<PrivateRoute><Layout><EMIPaymentCenter /></Layout></PrivateRoute>} />
      <Route path="/details" element={<PrivateRoute><Layout><LoanDetails /></Layout></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute adminOnly><Layout><AdminDashboard /></Layout></PrivateRoute>} />
      <Route path="/loan-system" element={<PrivateRoute><Layout><LoanDashboard /></Layout></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          theme="dark"
          toastStyle={{ background: "#0d0d2b", border: "1px solid #00ffe040", color: "#00ffe0" }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
