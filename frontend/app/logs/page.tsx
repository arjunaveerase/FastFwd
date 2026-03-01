"use client";

import { useEffect, useState } from "react";

type LogItem = {
  id: number;
  vendor_name: string;
  subject: string;
  to_emails: string;
  cc_emails: string;
  gmail_thread_id: string;
  gmail_message_id: string;
  send_status: string;
};

export default function LogsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const email = localStorage.getItem("fastfwd_user_email") || "";
    setUserEmail(email);
    if (email) {
      fetch(`https://fastfwd.onrender.com/workflows/logs?user_email=${encodeURIComponent(email)}`)
        .then((r) => r.json())
        .then((data) => setLogs(data.logs || []))
        .catch(() => setErrorText("Could not load logs"));
    }
  }, []);

  return (
    <main className="page">
      <div className="shell grid" style={{ gap: 18 }}>
        <section className="hero">
          <div className="badge">FastFwd • Send History</div>
          <div className="spacer" />
          <h1 className="title" style={{ fontSize: 34 }}>Recent sends</h1>
          <p className="subtitle">Review what was sent, to whom, and the Gmail thread references created by FastFwd.</p>
        </section>

        {errorText ? <section className="card">{errorText}</section> : null}

        <section className="card">
          <div className="small">Signed in as {userEmail || "—"}</div>
          <div className="spacer" />
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Subject</th>
                  <th>To</th>
                  <th>Status</th>
                  <th>Thread ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.length ? logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.vendor_name}</td>
                    <td>{log.subject}</td>
                    <td>{log.to_emails}</td>
                    <td>{log.send_status}</td>
                    <td>{log.gmail_thread_id || "—"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="muted">No logs yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
