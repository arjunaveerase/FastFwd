"use client";

import { useEffect } from "react";

export default function ConnectSheetRedirect() {
  useEffect(() => {
    window.location.replace("/");
  }, []);

  return (
    <main className="page">
      <div className="shell">
        <section className="card">Redirecting…</section>
      </div>
    </main>
  );
}