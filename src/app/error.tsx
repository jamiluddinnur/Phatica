"use client";

// Halaman error per-route — pesan ramah berbahasa Indonesia, tanpa
// stack trace atau detail teknis ke pengguna.
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div style={{ maxWidth: 560, margin: "80px auto", padding: "0 16px", textAlign: "center", fontFamily: "system-ui, sans-serif", color: "#191641" }}>
      <h1 style={{ fontSize: 28 }}>Ada yang tidak beres — coba muat ulang.</h1>
      <p style={{ color: "#5b5878" }}>Kalau terus terjadi, coba lagi nanti.</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
        <button
          onClick={() => reset()}
          style={{ background: "#14b8a6", color: "#fff", border: 0, borderRadius: 10, padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}
        >
          Coba Lagi
        </button>
        <a
          href="/"
          style={{ background: "#191641", color: "#fff", borderRadius: 10, padding: "10px 16px", fontWeight: 600, textDecoration: "none" }}
        >
          Kembali ke Beranda
        </a>
      </div>
    </div>
  );
}
