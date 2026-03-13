import React, { useState } from "react";
import axios from "axios";
import { User, Lock, LogIn, Stethoscope } from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api";

function DoctorLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/doctor/login`, {
        username,
        password,
      });

      if (response.data.success) {
        onLoginSuccess(response.data.doctor);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background:
          "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          width: "380px",
          padding: "40px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div
          style={{
            background: "#e8f3ff",
            width: "70px",
            height: "70px",
            borderRadius: "50%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            margin: "0 auto 20px",
          }}
        >
          <Stethoscope size={36} color="#4facfe" />
        </div>

        {/* Heading */}
        <h2 style={{ marginBottom: "5px" }}>Doctor Login</h2>
        <p style={{ color: "#777", fontSize: "14px", marginBottom: "30px" }}>
          Access patient queue and manage appointments
        </p>

        {/* Form */}
        <form onSubmit={handleLogin}>
          {/* Username */}
          <div style={{ marginBottom: "18px", textAlign: "left" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "14px",
                marginBottom: "6px",
                fontWeight: "500",
              }}
            >
              <User size={16} style={{ marginRight: "6px" }} />
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="doctor1, doctor2..."
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                outline: "none",
                fontSize: "14px",
                transition: "0.2s",
              }}
              onFocus={(e) =>
                (e.target.style.border = "1px solid #4facfe")
              }
              onBlur={(e) => (e.target.style.border = "1px solid #ddd")}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "18px", textAlign: "left" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "14px",
                marginBottom: "6px",
                fontWeight: "500",
              }}
            >
              <Lock size={16} style={{ marginRight: "6px" }} />
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                outline: "none",
                fontSize: "14px",
                transition: "0.2s",
              }}
              onFocus={(e) =>
                (e.target.style.border = "1px solid #4facfe")
              }
              onBlur={(e) => (e.target.style.border = "1px solid #ddd")}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "#ffecec",
                color: "#d63031",
                padding: "10px",
                borderRadius: "6px",
                marginBottom: "15px",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: "#4facfe",
              color: "white",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              transition: "0.2s",
            }}
            onMouseOver={(e) =>
              (e.target.style.background = "#2f8cff")
            }
            onMouseOut={(e) =>
              (e.target.style.background = "#4facfe")
            }
          >
            <LogIn size={18} />
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Demo Credentials */}
        <div
          style={{
            marginTop: "25px",
            padding: "15px",
            borderRadius: "10px",
            background: "#f7f9fc",
            fontSize: "13px",
            color: "#555",
          }}
        >
          <strong>Demo Credentials</strong>
          <p style={{ margin: "6px 0" }}>
            Username: doctor1 – doctor10
          </p>
          <p>Password: password123</p>
        </div>
      </div>
    </div>
  );
}

export default DoctorLogin;