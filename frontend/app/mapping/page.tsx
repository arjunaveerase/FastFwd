"use client";

import { useState } from "react";

export default function MappingPage() {
  const [vendorNameCol, setVendorNameCol] = useState("vendor_name");
  const [templateTypeCol, setTemplateTypeCol] = useState("template_type");
  const [toEmailCol, setToEmailCol] = useState("to_email_ids");
  const [ccEmailCol, setCcEmailCol] = useState("cc_email_ids");
  const [threadIdCol, setThreadIdCol] = useState("thread_id");
  const [messageIdCol, setMessageIdCol] = useState("message_id");
  const [subjectCol, setSubjectCol] = useState("sub_line");
  const [remarksCol, setRemarksCol] = useState("remarks");
  const [status, setStatus] = useState("");

  const saveMapping = async () => {
    const connectionId = localStorage.getItem("fastfwd_connection_id");
    if (!connectionId) {
      setStatus("No sheet connection found. Connect sheet first.");
      return;
    }

    const res = await fetch("https://fastfwd.onrender.com/sheets/mapping", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sheet_connection_id: Number(connectionId),
        vendor_name_col: vendorNameCol,
        template_type_col: templateTypeCol,
        to_email_col: toEmailCol,
        cc_email_col: ccEmailCol,
        thread_id_col: threadIdCol,
        message_id_col: messageIdCol,
        subject_col: subjectCol,
        remarks_col: remarksCol
      })
    });

    const data = await res.json();
    if (data.ok) {
      setStatus("Mapping saved.");
      window.location.href = "/preview";
    } else {
      setStatus(data.detail || "Failed to save mapping");
    }
  };

  return (
    <main style={{ minHeight: "100vh", padding: 32, background: "#0b1020" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", background: "#111827", padding: 28, borderRadius: 20, border: "1px solid #1f2937" }}>
        <h1 style={{ marginTop: 0 }}>Column Mapping</h1>
        <p style={{ color: "#cbd5e1" }}>Use your current sheet headers. Defaults below match your current structure.</p>

        <Field label="Vendor Name Column" value={vendorNameCol} setValue={setVendorNameCol} />
        <Field label="Template Type Column" value={templateTypeCol} setValue={setTemplateTypeCol} />
        <Field label="To Email Column" value={toEmailCol} setValue={setToEmailCol} />
        <Field label="CC Email Column" value={ccEmailCol} setValue={setCcEmailCol} />
        <Field label="Thread ID Column" value={threadIdCol} setValue={setThreadIdCol} />
        <Field label="Message ID Column" value={messageIdCol} setValue={setMessageIdCol} />
        <Field label="Subject Column" value={subjectCol} setValue={setSubjectCol} />
        <Field label="Remarks Column" value={remarksCol} setValue={setRemarksCol} />

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button onClick={saveMapping} style={primaryBtn}>Save Mapping</button>
          <button onClick={() => (window.location.href = "/connect-sheet")} style={ghostBtn}>Back</button>
        </div>

        {status && <p style={{ color: "#93c5fd", marginTop: 16 }}>{status}</p>}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>{label}</label>
      <input value={value} onChange={(e) => setValue(e.target.value)} style={inputStyle} />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #374151",
  background: "#0f172a",
  color: "#e5e7eb",
  boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #374151",
  background: "#111827",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};
