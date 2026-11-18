"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

// Halaman reset password — dibuka dari tautan di email reset (?token=...).
// Token sekali pakai, berlaku 1 jam. Bila token tidak ada / tidak valid,
// server menjawab dengan pesan yang jelas; tidak ada token yang ditampilkan.
function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (password.length < 8) { setMsg("Password minimal 8 karakter."); return; }
    if (password !== confirm) { setMsg("Konfirmasi password tidak sama."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Gagal (${res.status})`);
      setDone(true);
      setMsg(data.message || "Password berhasil diubah.");
    } catch (err: any) {
      setMsg(err.message || "Ada yang tidak beres — coba lagi nanti.");
    }
    setBusy(false);
  }

  return (
    <div className="wrap" style={{ maxWidth: 520 }}>
      <header className="top" style={{ margin: "-24px -16px 24px" }}>
        <img className="logo" src="/logo.webp" alt="Logo Phatica" />
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Phatica</div>
          <div className="tagline">AI-Powered Strategic Communication Skills.</div>
        </div>
      </header>
      <div className="card">
        <h1 style={{ marginTop: 0, fontSize: 24 }}>Atur Password Baru</h1>
        {!token ? (
          <div>
            <p>Tautan reset tidak lengkap — token tidak ditemukan di alamat ini.</p>
            <p className="small">Minta tautan baru dari halaman Masuk → “Lupa password?”.</p>
            <a className="btn" href="/" style={{ display: "inline-block", textDecoration: "none" }}>Kembali ke Beranda</a>
          </div>
        ) : done ? (
          <div>
            <p>{msg}</p>
            <a className="btn" href="/" style={{ display: "inline-block", textDecoration: "none" }}>Masuk dengan Password Baru</a>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label className="small">Password baru (minimal 8 karakter)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" required minLength={8} />
            <label className="small">Ulangi password baru</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ulangi password baru" required minLength={8} />
            {msg && <p style={{ color: "var(--danger)", fontSize: 14 }}>{msg}</p>}
            <div style={{ marginTop: 12 }}>
              <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
                {busy ? "Memproses…" : "Simpan Password Baru"}
              </button>
            </div>
            <p className="small" style={{ marginTop: 12 }}>
              Setelah berhasil, semua perangkat yang sedang masuk akan diminta masuk lagi dengan password baru.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="wrap"><p>Memuat…</p></div>}>
      <ResetForm />
    </Suspense>
  );
}
