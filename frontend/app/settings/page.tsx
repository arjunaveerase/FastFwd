"use client";

export default function SettingsPage() {
  return (
    <main className="page">
      <div className="shell grid" style={{ gap: 18 }}>
        <section className="hero">
          <div className="badge">FastFwd • Advanced</div>
          <div className="spacer" />
          <h1 className="title" style={{ fontSize: 34 }}>Advanced options</h1>
          <p className="subtitle">
            Manual mapping and other power-user controls can live here. For the submission build, the default workflow stays fully auto-detected to reduce friction.
          </p>
        </section>

        <section className="card">
          <div className="small">
            Hidden-by-default features intentionally moved out of the main workflow:
          </div>
          <ul className="small">
            <li>Manual column remapping</li>
            <li>Manual tab overrides</li>
            <li>Raw thread/message field editing</li>
            <li>Custom subject overrides</li>
          </ul>
        </section>
      </div>
    </main>
  );
}