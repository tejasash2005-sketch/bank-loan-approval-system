import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import API from "../utils/api";
import { toast } from "react-toastify";

export default function LoginPage() {
  const auth = useAuth(); // 🔥 safer (prevents "not a function" crash)
  const login = auth?.login;

  const [tab, setTab] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Enter username and password");
      return;
    }

    if (typeof login !== "function") {
      toast.error("Auth not ready");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/login", { username, password });

      // 🔥 safe response handling
      const token = res.data?.token;
      const user = {
        username: res.data?.username || username,
        role: res.data?.role || "user",
      };

      if (!token) {
        toast.error("Invalid server response");
        return;
      }

      login(token, user);
      toast.success("Login successful!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Enter username and password");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await API.post("/auth/register", { username, password });

      toast.success("Account created! Go login.");
      setTab("login");
      setPassword("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #03001e, #07002e, #0a0a2e)"
    }}>
      <div style={{ width: 420, padding: 40 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🤖</div>
          <h1 style={{ fontSize: 20, marginBottom: 4 }}>BANK LOAN AI</h1>
          <div style={{ fontSize: 11, color: "rgba(0,255,224,0.4)", letterSpacing: 3 }}>
            APPROVAL PREDICTION SYSTEM
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          marginBottom: 24,
          borderBottom: "1px solid rgba(0,255,224,0.2)"
        }}>
          {["login", "register"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setUsername("");
                setPassword("");
              }}
              style={{
                flex: 1,
                padding: "10px 0",
                background: "transparent",
                border: "none",
                borderBottom: tab === t ? "2px solid #00ffe0" : "2px solid transparent",
                color: tab === t ? "#00ffe0" : "rgba(0,255,224,0.4)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1,
                textTransform: "uppercase",
                transition: "all 0.2s"
              }}
            >
              {t === "login" ? "🔐 Login" : "🆕 Register"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={tab === "login" ? handleLogin : handleRegister}>
          <div className="form-group">
            <label>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete={tab === "login" ? "current-password" : "new-password"}
            />
          </div>

          <button
            type="submit"
            className="btn btn-cyan"
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: 8
            }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : tab === "login" ? "🚀 Login" : "✨ Create Account"}
          </button>
        </form>

        {/* Demo credentials */}
        <div style={{
          marginTop: 24,
          padding: 16,
          background: "rgba(0,255,224,0.04)",
          borderRadius: 10,
          border: "1px solid rgba(0,255,224,0.15)"
        }}>
          <div style={{
            fontSize: 11,
            color: "rgba(0,255,224,0.5)",
            marginBottom: 8,
            letterSpacing: 1
          }}>
            DEMO CREDENTIALS
          </div>

          <div style={{
            fontSize: 12,
            color: "rgba(0,255,224,0.7)",
            lineHeight: 1.8
          }}>
            👤 User: <b>user</b> / <b>user123</b><br />
            🛠 Admin: <b>admin</b> / <b>admin123</b>
          </div>
        </div>
      </div>
    </div>
  );
}