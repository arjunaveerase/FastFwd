"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BootRow = {
  vendor_name: string;
  template_type: string;
  sub_line: string;
  to_email_ids: string;
  cc_email_ids: string;
  sent_date: string;
  sent_time: string;
  thread_id: string;
  message_id: string;
};

type BootData = {
  spreadsheet_name: string;
  tabs: string[];
  detected: {
    emailer_tab: string;
    sku_tab: string;
  };
  columns: string[];
  vendors: string[];
  rows: BootRow[];
  sku_columns: string[];
  vendor_defaults?: Record<string, string>;
};

type PreviewData = {
  subject: string;
  html_body: string;
  summary: {
    vendor_name: string;
    date: string;
    total_units_sold: string;
    total_suggested_reorder: string;
    sender_name?: string;
  };
  attachment_name: string;
};

type SendLog = {
  vendor: string;
  status: string;
  subject?: string;
  thread_id?: string;
  message_id?: string;
  error?: string;
};

type ApiLog = {
  id: number;
  vendor_name: string;
  subject: string;
  to_emails: string;
  cc_emails: string;
  gmail_thread_id: string;
  gmail_message_id: string;
  send_status: string;
};

type DraftRow = {
  rowId: string;
  vendor_name: string;
  template_type: string;
  to_email_ids: string;
  cc_email_ids: string;
  sub_line: string;
  using_previous_thread: boolean;
  prior_thread_exists: boolean;
};

const API_BASE = "http://127.0.0.1:8000";
const DEFAULT_SHEET =
  "https://docs.google.com/spreadsheets/d/1Q4VfL65ZlBnDfZAffmx9WFfPFMDbEKDxOdutebQX_PM/edit?gid=0#gid=0";

async function apiFetch(path: string, options?: RequestInit) {
  try {
    const res = await fetch(`${API_BASE}${path}`, options);
    const contentType = res.headers.get("content-type") || "";
    let data: any = null;

    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { detail: text || "Unknown server response" };
    }

    if (!res.ok) {
      throw new Error(data?.detail || `Request failed (${res.status})`);
    }

    return data;
  } catch (e: any) {
    if (e.message === "Failed to fetch") {
      throw new Error(
        "Cannot reach the backend service. Make sure the FastAPI server is running on http://127.0.0.1:8000."
      );
    }
    throw e;
  }
}

function uniqueEmails(value: string) {
  const parts = value
    .split(/[,\n;]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const low = p.toLowerCase();
    if (!seen.has(low)) {
      seen.add(low);
      out.push(p);
    }
  }
  return out;
}

function buildSubject(vendorName: string) {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `ReOrder SS FastFwd <> ${vendorName} ${dd}-${mm}-${yyyy}`;
}

export default function HomePage() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [userEmail, setUserEmail] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [senderName, setSenderName] = useState("Arjun SE");
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET);
  const [connectionId, setConnectionId] = useState<number | null>(null);
  const [bootData, setBootData] = useState<BootData | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [step, setStep] = useState<1 | 2>(1);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [vendorToAdd, setVendorToAdd] = useState("");

  const [activePreview, setActivePreview] = useState<PreviewData | null>(null);
  const [previewVendorName, setPreviewVendorName] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const [recentLogs, setRecentLogs] = useState<ApiLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [sending, setSending] = useState(false);
  const [sendLogs, setSendLogs] = useState<SendLog[]>([]);

  const [errorText, setErrorText] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedTheme = (localStorage.getItem("fastfwd_theme") as "dark" | "light") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    const params = new URLSearchParams(window.location.search);
    const email = params.get("user_email");
    if (email) {
      setUserEmail(email);
      localStorage.setItem("fastfwd_user_email", email);
      window.history.replaceState({}, "", "/");
    } else {
      const savedEmail = localStorage.getItem("fastfwd_user_email") || "";
      if (savedEmail) setUserEmail(savedEmail);
    }

    const savedSheet = localStorage.getItem("fastfwd_sheet_url");
    if (savedSheet) setSheetUrl(savedSheet);

    const savedSender = localStorage.getItem("fastfwd_sender_name");
    if (savedSender) setSenderName(savedSender);
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("fastfwd_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleLogout = () => {
    localStorage.removeItem("fastfwd_user_email");
    localStorage.removeItem("fastfwd_sender_name");
    setUserEmail("");
    setBootData(null);
    setConnectionId(null);
    setDraftRows([]);
    setVendorToAdd("");
    setActivePreview(null);
    setPreviewVendorName("");
    setSendLogs([]);
    setRecentLogs([]);
    setStep(1);
    setMenuOpen(false);
    window.location.href = "/";
  };

  const handleLogin = async () => {
    setLoadingLogin(true);
    setErrorText("");
    try {
      const data = await apiFetch("/auth/google/login");
      window.location.href = data.auth_url;
    } catch (e: any) {
      setLoadingLogin(false);
      setErrorText(e.message || "Could not start sign-in");
    }
  };

  const loadLogs = async () => {
    if (!userEmail) return;
    setLoadingLogs(true);
    try {
      const data = await apiFetch(`/workflows/logs?user_email=${encodeURIComponent(userEmail)}`);
      setRecentLogs(data.logs || []);
    } catch (e: any) {
      setErrorText(e.message || "Could not load logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  const connectAndLoad = async () => {
    if (!userEmail || !sheetUrl) {
      setErrorText("User email and sheet URL are required.");
      return;
    }
    if (!senderName.trim()) {
      setErrorText("Please enter the sender name to use.");
      return;
    }

    setConnecting(true);
    setErrorText("");
    setActivePreview(null);
    setPreviewVendorName("");
    setSendLogs([]);

    try {
      localStorage.setItem("fastfwd_sheet_url", sheetUrl);
      localStorage.setItem("fastfwd_sender_name", senderName.trim());

      const connectData = await apiFetch("/sheets/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: userEmail, spreadsheet_url: sheetUrl }),
      });

      setConnectionId(connectData.connection_id);

      const boot = await apiFetch(
        `/workflows/bootstrap?user_email=${encodeURIComponent(userEmail)}&connection_id=${connectData.connection_id}`
      );

      setBootData(boot);
      setDraftRows([]);
      setVendorToAdd(boot.vendors?.[0] || "");
      setStep(1);
      await loadLogs();
    } catch (e: any) {
      setErrorText(e.message || "Could not load the sheet.");
    } finally {
      setConnecting(false);
    }
  };

  const findAllRowsForVendor = (vendorName: string) => {
    const rows = bootData?.rows || [];
    return rows.filter((r) => r.vendor_name === vendorName);
  };

  const findLatestRowForVendor = (vendorName: string) => {
    const rows = findAllRowsForVendor(vendorName);
    if (!rows.length) return null;
    return rows[rows.length - 1];
  };

  const getPriorThreadExists = (vendorName: string) => {
    const rows = findAllRowsForVendor(vendorName);
    return rows.some((r) => String(r.thread_id || "").trim());
  };

  const getDefaultTemplateForVendor = (vendorName: string) => {
    return (
      bootData?.vendor_defaults?.[vendorName] ||
      (getPriorThreadExists(vendorName) ? "RO_FOLLOWUP" : "RO_INITIAL")
    );
  };

  const buildRowForVendor = (vendorName: string): DraftRow => {
    const base = findLatestRowForVendor(vendorName);
    const defaultTemplate = getDefaultTemplateForVendor(vendorName);
    const priorThreadExists = getPriorThreadExists(vendorName);
    const shouldUsePreviousThread =
      priorThreadExists && defaultTemplate !== "RO_INITIAL";

    return {
      rowId: `${vendorName}-${Date.now()}-${Math.random()}`,
      vendor_name: vendorName,
      template_type: defaultTemplate,
      to_email_ids: base?.to_email_ids || "",
      cc_email_ids: base?.cc_email_ids || "",
      sub_line: base?.sub_line || buildSubject(vendorName),
      using_previous_thread: shouldUsePreviousThread,
      prior_thread_exists: priorThreadExists,
    };
  };

  const addVendorRow = () => {
    if (!vendorToAdd) return;
    const newRow = buildRowForVendor(vendorToAdd);
    setDraftRows((prev) => [...prev, newRow]);
  };

  const updateDraftRow = (rowId: string, patch: Partial<DraftRow>) => {
    setDraftRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;

        let next = { ...row, ...patch };

        if (patch.vendor_name) {
          return buildRowForVendor(patch.vendor_name);
        }

        if (patch.template_type) {
          const normalized = patch.template_type;
          const shouldUsePrevious =
            row.prior_thread_exists && normalized !== "RO_INITIAL";

          next = {
            ...next,
            template_type: normalized,
            using_previous_thread: shouldUsePrevious,
          };

          if (shouldUsePrevious) {
            const base = findLatestRowForVendor(row.vendor_name);
            next.to_email_ids = base?.to_email_ids || next.to_email_ids;
            next.cc_email_ids = base?.cc_email_ids || next.cc_email_ids;
            next.sub_line = base?.sub_line || next.sub_line;
          } else {
            next.sub_line = buildSubject(row.vendor_name);
          }
        }

        return next;
      })
    );
  };

  const removeDraftRow = (rowId: string) => {
    setDraftRows((prev) => prev.filter((row) => row.rowId !== rowId));
  };

  const previewVendor = async (row: DraftRow) => {
    if (!connectionId) return;

    setPreviewLoading(true);
    setErrorText("");
    try {
      const data = await apiFetch("/workflows/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: userEmail,
          connection_id: connectionId,
          vendor_name: row.vendor_name,
          template_type: row.template_type || "RO_INITIAL",
          sender_name: senderName.trim(),
        }),
      });

      setPreviewVendorName(row.vendor_name);
      setActivePreview(data);
    } catch (e: any) {
      setErrorText(e.message || "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  const sendSelected = async () => {
    if (!connectionId) {
      setErrorText("Connect the sheet first.");
      return;
    }
    if (!draftRows.length) {
      setErrorText("Add at least one vendor row.");
      return;
    }

    setSending(true);
    setErrorText("");
    setSendLogs([]);

    const results: SendLog[] = [];

    for (const row of draftRows) {
      try {
        const toList = uniqueEmails(row.to_email_ids);
        const ccList = uniqueEmails(row.cc_email_ids);

        if (!toList.length) {
          results.push({
            vendor: row.vendor_name,
            status: "failed",
            error: "No recipient email found in To",
          });
          setSendLogs([...results]);
          continue;
        }

        const data = await apiFetch("/workflows/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_email: userEmail,
            connection_id: connectionId,
            vendor_name: row.vendor_name,
            template_type: row.template_type || "RO_INITIAL",
            to_emails: toList,
            cc_emails: ccList,
            sender_name: senderName.trim(),
          }),
        });

        results.push({
          vendor: row.vendor_name,
          status: "sent",
          subject: data.subject,
          thread_id: data.thread_id,
          message_id: data.message_id,
        });
      } catch (e: any) {
        results.push({
          vendor: row.vendor_name,
          status: "failed",
          error: e.message || "Send failed",
        });
      }

      setSendLogs([...results]);
    }

    setSending(false);
    await loadLogs();
  };

  const canGoNext = !!bootData;
  const vendorOptions = useMemo(() => bootData?.vendors || [], [bootData]);

  return (
    <main className="page">
      <div className="shell">
        <section className="hero">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h1 className="title" style={{ margin: 0 }}>FastFwd</h1>
                <div className="badge" style={{ marginTop: 4 }}>Email Automation solution</div>
              </div>

              <div className="spacer" />

              <div className="subtitle" style={{ display: "grid", gap: 6 }}>
                <div><strong>1.</strong> Connect your Google Sheet and confirm sender name.</div>
                <div><strong>2.</strong> Add vendors, review recipients, and choose Initial or Follow-up.</div>
                <div><strong>3.</strong> Preview the exact email, then send in one batch.</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="iconButton" onClick={toggleTheme}>
                {theme === "dark" ? "☀" : "☾"}
              </button>

              {userEmail ? (
                <div style={{ position: "relative" }} ref={menuRef}>
                  <button
                    className="iconButton"
                    onClick={() => setMenuOpen((v) => !v)}
                    style={{ width: 44, height: 44, borderRadius: 999 }}
                    title={userEmail}
                  >
                    {userEmail.charAt(0).toUpperCase() || "A"}
                  </button>

                  {menuOpen ? (
                    <div
                      className="card"
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 52,
                        width: 320,
                        zIndex: 10,
                        padding: 14,
                      }}
                    >
                      <div className="small">Signed in as</div>
                      <div style={{ fontWeight: 700, marginTop: 6, wordBreak: "break-word" }}>{userEmail}</div>

                      <div className="spacer" />
                      <div className="small">Sender name used in app</div>
                      <input
                        className="input"
                        value={senderName}
                        onChange={(e) => {
                          setSenderName(e.target.value);
                          localStorage.setItem("fastfwd_sender_name", e.target.value);
                        }}
                        style={{ marginTop: 6 }}
                      />

                      <div className="spacer" />
                      <button className="button secondary" onClick={handleLogout} style={{ width: "100%" }}>
                        Log out
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {!userEmail ? (
            <div className="actions">
              <button className="button" onClick={handleLogin} disabled={loadingLogin}>
                {loadingLogin ? "Redirecting..." : "Sign in with Google"}
              </button>
            </div>
          ) : null}
        </section>

        <div className="spacer" />

        {errorText ? (
          <>
            <section className="card" style={{ borderColor: "rgba(255,93,115,0.45)" }}>
              <strong style={{ color: "#ff6b81" }}>Error</strong>
              <div className="spacer" />
              <div>{errorText}</div>
            </section>
            <div className="spacer" />
          </>
        ) : null}

        {userEmail ? (
          <>
            {step === 1 ? (
              <section className="card">
                <h3 style={{ marginTop: 0 }}>Step 1 • Connect Sheet</h3>

                <div className="grid two">
                  <div>
                    <div className="label">Sender Name</div>
                    <input
                      className="input"
                      value={senderName}
                      onChange={(e) => {
                        setSenderName(e.target.value);
                        localStorage.setItem("fastfwd_sender_name", e.target.value);
                      }}
                      placeholder="Enter sender name"
                    />
                  </div>

                  <div>
                    <div className="label">Google Sheet URL</div>
                    <input
                      className="input"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="actions">
                  <button className="button" onClick={connectAndLoad} disabled={connecting}>
                    {connecting ? "Loading..." : "Connect & Load"}
                  </button>

                  <button
                    className="button secondary"
                    disabled={!canGoNext}
                    onClick={() => setStep(2)}
                  >
                    Next
                  </button>
                </div>

                {bootData ? (
                  <>
                    <div className="spacer" />
                    <div className="kv">
                      <div><strong>Sheet:</strong> {bootData.spreadsheet_name}</div>
                      <div><strong>Emailer Tab:</strong> {bootData.detected.emailer_tab}</div>
                      <div><strong>SKU Tab:</strong> {bootData.detected.sku_tab}</div>
                      <div><strong>Vendors Loaded:</strong> {bootData.vendors.length}</div>
                    </div>
                  </>
                ) : null}
              </section>
            ) : (
              <>
                <section className="card">
                  <h3 style={{ marginTop: 0 }}>Step 2 • Build Vendor Rows</h3>

                  <div className="grid two">
                    <div>
                      <div className="label">Add Vendor</div>
                      <select
                        className="select"
                        value={vendorToAdd}
                        onChange={(e) => setVendorToAdd(e.target.value)}
                      >
                        {vendorOptions.map((vendor) => (
                          <option key={vendor} value={vendor}>
                            {vendor}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "flex", alignItems: "end", gap: 12 }}>
                      <button className="button" onClick={addVendorRow}>
                        Add Vendor Row
                      </button>
                      <button className="button secondary" onClick={() => setStep(1)}>
                        Back
                      </button>
                    </div>
                  </div>
                </section>

                <div className="spacer" />

                <section className="card">
                  <h3 style={{ marginTop: 0 }}>Selected Vendor Rows</h3>
                  <div className="tableWrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Vendor</th>
                          <th>Template</th>
                          <th>To</th>
                          <th>CC</th>
                          <th>Subject</th>
                          <th>Thread</th>
                          <th>Preview</th>
                          <th>Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftRows.length ? (
                          draftRows.map((row) => (
                            <tr key={row.rowId}>
                              <td style={{ minWidth: 220, whiteSpace: "normal", wordBreak: "break-word" }} title={row.vendor_name}>
                                <select
                                  className="select"
                                  value={row.vendor_name}
                                  onChange={(e) => updateDraftRow(row.rowId, { vendor_name: e.target.value })}
                                  style={{ minWidth: 210 }}
                                >
                                  {vendorOptions.map((vendor) => (
                                    <option key={vendor} value={vendor}>
                                      {vendor}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td>
                                <select
                                  className="select"
                                  value={row.template_type || "RO_INITIAL"}
                                  onChange={(e) =>
                                    updateDraftRow(row.rowId, { template_type: e.target.value })
                                  }
                                >
                                  <option value="RO_INITIAL">RO_INITIAL</option>
                                  <option value="RO_FOLLOWUP">RO_FOLLOWUP</option>
                                  <option value="RO_FINAL">RO_FINAL</option>
                                </select>
                              </td>

                              <td style={{ minWidth: 220 }}>
                                <textarea
                                  className="input"
                                  value={row.to_email_ids}
                                  onChange={(e) =>
                                    updateDraftRow(row.rowId, { to_email_ids: e.target.value })
                                  }
                                  rows={2}
                                  style={{ minWidth: 210, resize: "vertical" }}
                                  title={row.to_email_ids}
                                />
                              </td>

                              <td style={{ minWidth: 220 }}>
                                <textarea
                                  className="input"
                                  value={row.cc_email_ids}
                                  onChange={(e) =>
                                    updateDraftRow(row.rowId, { cc_email_ids: e.target.value })
                                  }
                                  rows={2}
                                  style={{ minWidth: 210, resize: "vertical" }}
                                  title={row.cc_email_ids}
                                />
                              </td>

                              <td style={{ minWidth: 280, whiteSpace: "normal", wordBreak: "break-word" }} title={row.sub_line}>
                                {row.sub_line || buildSubject(row.vendor_name)}
                              </td>

                              <td>
                                {row.using_previous_thread ? (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "8px 12px",
                                      borderRadius: 999,
                                      background: "#22c55e",
                                      color: "#fff",
                                      fontWeight: 700,
                                      fontSize: 12,
                                    }}
                                  >
                                    Using previous thread
                                  </span>
                                ) : row.prior_thread_exists ? (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "8px 12px",
                                      borderRadius: 999,
                                      background: "#f59e0b",
                                      color: "#fff",
                                      fontWeight: 700,
                                      fontSize: 12,
                                    }}
                                  >
                                    New thread
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "8px 12px",
                                      borderRadius: 999,
                                      background: "#64748b",
                                      color: "#fff",
                                      fontWeight: 700,
                                      fontSize: 12,
                                    }}
                                  >
                                    First email
                                  </span>
                                )}
                              </td>

                              <td>
                                <button
                                  className="button secondary"
                                  onClick={() => previewVendor(row)}
                                >
                                  Preview
                                </button>
                              </td>

                              <td>
                                <button
                                  onClick={() => removeDraftRow(row.rowId)}
                                  title="Remove row"
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 999,
                                    border: "1px solid #cbd5e1",
                                    background: "transparent",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="muted">
                              Add at least one vendor row.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="actions">
                    <button
                      className="button success"
                      onClick={sendSelected}
                      disabled={sending || !draftRows.length}
                    >
                      {sending ? "Sending..." : "Send Selected Vendors"}
                    </button>
                  </div>
                </section>

                <div className="spacer" />

                <section className="grid two">
                  <div className="card">
                    <h3 style={{ marginTop: 0 }}>Preview</h3>
                    {previewLoading ? (
                      <div className="small">Loading preview...</div>
                    ) : activePreview ? (
                      <>
                        <div className="kv">
                          <div><strong>From:</strong> {senderName}</div>
                          <div><strong>Vendor:</strong> {previewVendorName}</div>
                          <div><strong>Subject:</strong> {activePreview.subject}</div>
                          <div><strong>Attachment:</strong> {activePreview.attachment_name}</div>
                          <div><strong>Units Sold:</strong> {activePreview.summary.total_units_sold}</div>
                          <div><strong>Suggested Reorder:</strong> {activePreview.summary.total_suggested_reorder}</div>
                        </div>
                        <div className="spacer" />
                        <div className="previewBox" dangerouslySetInnerHTML={{ __html: activePreview.html_body }} />
                      </>
                    ) : (
                      <div className="small">Click Preview for any selected vendor row.</div>
                    )}
                  </div>

                  <div className="card">
                    <h3 style={{ marginTop: 0 }}>Send Status</h3>
                    <div className="grid" style={{ gap: 12 }}>
                      {sendLogs.length ? (
                        sendLogs.map((log, idx) => (
                          <div key={`${log.vendor}-${idx}`} className="queueItem">
                            <div><strong>{log.vendor}</strong></div>
                            <div className="small">Status: {log.status}</div>
                            {log.subject ? <div className="small">Subject: {log.subject}</div> : null}
                            {log.thread_id ? <div className="small">Thread ID: {log.thread_id}</div> : null}
                            {log.message_id ? <div className="small">Message ID: {log.message_id}</div> : null}
                            {log.error ? (
                              <div className="small" style={{ color: "#ff6b81" }}>{log.error}</div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="small">No emails sent yet in this session.</div>
                      )}
                    </div>
                  </div>
                </section>

                <div className="spacer" />

                <section className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <h3 style={{ marginTop: 0, marginBottom: 0 }}>Recent Logs</h3>
                    <button className="button secondary" onClick={loadLogs} disabled={loadingLogs}>
                      {loadingLogs ? "Refreshing..." : "Refresh Logs"}
                    </button>
                  </div>

                  <div className="spacer" />

                  {!recentLogs.length ? (
                    <div className="small">No logs available yet.</div>
                  ) : (
                    <div className="grid" style={{ gap: 12 }}>
                      {recentLogs.map((log) => (
                        <div key={log.id} className="queueItem">
                          <div><strong>{log.vendor_name}</strong></div>
                          <div className="small">Status: {log.send_status}</div>
                          <div className="small" style={{ wordBreak: "break-word" }}>Subject: {log.subject}</div>
                          <div className="small" style={{ wordBreak: "break-word" }}>To: {log.to_emails}</div>
                          <div className="small" style={{ wordBreak: "break-word" }}>CC: {log.cc_emails}</div>
                          <div className="small">Thread ID: {log.gmail_thread_id}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}