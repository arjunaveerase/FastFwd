"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [authUrl, setAuthUrl] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("user_email");
    if (email) {
      setUserEmail(email);
      localStorage.setItem("fastfwd_user_email", email);
    } else {
      const saved = localStorage.getItem("fastfwd_user_email");
      if (saved) setUserEmail(saved);
    }
  }, []);

  const handleLogin = async () => {
    const res = await fetch("http://localhost:8000/auth/google/login");
    const data = await res.json();
    setAuthUrl(data.auth_url);
    window.location.href = data.auth_url;
  };

  const go = (path: string) => {
    window.location.href = path;
  };

  return (
    <main style={{ minHeight: "100vh", padding: 32, background: "linear-gradient(135deg,#0b1020,#111827)" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 42 }}>FastFwd</h1>
          {userEmail && (
            <div style={{ padding: "10px 14px", background: "#111827", border: "1px solid #374151", borderRadius: 12 }}>
              Signed in as: <b>{userEmail}</b>
            </div>
          )}
        </div>

        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: 20,
            padding: 28,
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 28 }}>Gmail + Sheets workflow SaaS</h2>
          <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
            Connect your Google account, link a sheet, choose a tab, map fields, preview the message, send, and track logs.
          </p>

          {!userEmail ? (
            <div style={{ marginTop: 24 }}>
              <button
                onClick={handleLogin}
                style={{
                  padding: "14px 20px",
                  borderRadius: 12,
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                Sign in with Google
              </button>
              {authUrl && <p style={{ marginTop: 16, color: "#94a3b8", fontSize: 12 }}>{authUrl}</p>}
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                  gap: 16,
                  marginTop: 24,
                }}
              >
                {[
                  { label: "Connect Sheet", path: "/connect-sheet" },
                  { label: "Column Mapping", path: "/mapping" },
                  { label: "Preview & Send", path: "/preview" },
                  { label: "Sent Logs", path: "/logs" },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    style={{
                      padding: "18px 16px",
                      borderRadius: 16,
                      border: "1px solid #374151",
                      background: "#0f172a",
                      color: "#e5e7eb",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 24, padding: 16, background: "#0f172a", borderRadius: 16, border: "1px solid #334155" }}>
                <b>Fast flow:</b> Connect Sheet → Select Tab → Mapping → Preview → Send → Logs
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}