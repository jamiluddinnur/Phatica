"use client";
import { useEffect, useState } from "react";

type User = { id: string; name: string; email: string };
type Scenario = { id: string; title: string; pillar: string; personaName: string; personaRole: string; context: string; opening: string; goal: string; baseDifficulty: number; durationLabel: string; evaluatorMode: string; fourthLabel: string; rubric: Array<{ key: string; label: string; rubric: string; weight: number }>; verdictHint: string };
type Dash = { user: User; plan: string; subscription: any; memory: any; brandProfile: any; usedThisMonth: number; limitMonthly: number | null; progress: Array<{ id: string; scenarioId: string; overall: number | null; createdAt: string }>; recentSessions: Array<{ id: string; scenarioId: string; pillar: string; status: string; level: number; createdAt: string; overall: number | null }> };

const PLANS_UI: Record<string, { name: string; monthly: number; annualMonthly: number; annualTotal: number; desc: string; features: string[] }> = {
  free: { name: "Free", monthly: 0, annualMonthly: 0, annualTotal: 0, desc: "Coba dulu: 3 simulasi/bulan, 1 pilar (Interpersonal), evaluasi dasar.", features: ["3 simulasi / bulan", "Pilar Interpersonal saja", "Evaluasi dasar", "Tanpa Brand Audit & Content Coach"] },
  pro: { name: "Pro", monthly: 99000, annualMonthly: 79200, annualTotal: 950400, desc: "Latihan tanpa batas harian, semua 4 pilar, evaluasi lengkap + riwayat progres, Brand Audit dan Content Coach.", features: ["Simulasi tanpa batas harian", "Semua 4 pilar", "Evaluasi lengkap + riwayat progres", "Brand Audit & Content Coach", "Mode evaluator Jujur Keras / Supportif / Detail Teknis"] },
  tim: { name: "Tim / Institusi", monthly: 1500000, annualMonthly: 1500000, annualTotal: 18000000, desc: "Semua fitur Pro untuk satu tim (sampai 10 anggota), dashboard admin, laporan progres anggota, skenario custom.", features: ["Semua fitur Pro", "Sampai 10 anggota per tim", "Dashboard admin", "Laporan progres anggota", "Skenario custom"] },
};
const fmtRp = (n: number) => "Rp" + n.toLocaleString("id-ID");
const PILLARS = ["Interpersonal", "PR / Krisis", "Marketing & Sales", "Personal Branding"];

async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gagal (${res.status})`);
  return data;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [dash, setDash] = useState<Dash | null>(null);
  const [tab, setTab] = useState("beranda");
  const [msg, setMsg] = useState("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [pillarFilter, setPillarFilter] = useState("Semua");
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  // auth email + password
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  function scrollToAuth() { document.getElementById("auth")?.scrollIntoView({ behavior: "smooth" }); }
  async function doLogin(e?: React.FormEvent) {
    e?.preventDefault(); setAuthError(""); setAuthBusy(true);
    try {
      await api("/api/auth/login", "POST", { email: authEmail, password: authPassword });
      loadAll();
    } catch (err: any) { setAuthError(err.message || "Email atau password salah. Coba lagi."); }
    setAuthBusy(false);
  }
  async function doLogout() {
    try { await api("/api/auth/logout", "POST"); } catch { /* abaikan */ }
    setUser(null); setDash(null); setTab("beranda");
  }
  async function doRegister(e: React.FormEvent) {
    e.preventDefault(); setAuthError(""); setAuthBusy(true);
    try {
      await api("/api/auth/register", "POST", { name: authName, email: authEmail, password: authPassword });
      loadAll();
    } catch (err: any) { setAuthError(err.message); }
    setAuthBusy(false);
  }
  // branding
  const [brandTools, setBrandTools] = useState<any>(null);
  const [bp, setBp] = useState({ niche: "", audience: "", values: "", tone: "", credibility: "" });
  const [auditForm, setAuditForm] = useState({ bio: "", posts: "" });
  const [auditResult, setAuditResult] = useState<any>(null);
  const [coachForm, setCoachForm] = useState({ draft: "", platform: "Threads" });
  const [coachResult, setCoachResult] = useState<any>(null);

  async function loadAll() {
    try {
      const me = await api("/api/auth/me");
      if (!me.user) { setUser(null); return; }
      setUser(me.user);
      const d = await api("/api/dashboard"); setDash(d);
      const s = await api("/api/scenarios"); setScenarios(s.scenarios || []);
      const b = await api("/api/brand/tools"); setBrandTools(b);
      if (b.profile) setBp({ niche: b.profile.niche || "", audience: b.profile.audience || "", values: b.profile.values || "", tone: b.profile.tone || "", credibility: b.profile.credibility || "" });
    } catch { setUser(null); }
  }
  useEffect(() => { loadAll(); }, []);

  async function startScenario(sc: Scenario) {
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/sessions", "POST", { scenarioId: sc.id });
      setActiveSession({ ...r.session, scenario: sc });
      const d = await api(`/api/sessions/detail?id=${r.session.id}`); setSessionDetail(d.session);
      setTab("latihan");
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }
  async function resumeSession(s: { id: string; scenarioId: string }) {
    setBusy(true); setMsg("");
    try {
      const sc = scenarios.find((x) => x.id === s.scenarioId);
      const d = await api(`/api/sessions/detail?id=${s.id}`);
      setActiveSession({ ...d.session, scenario: sc });
      setSessionDetail(d.session);
      setTab("latihan");
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }
  async function sendChat() {
    if (!chatInput.trim() || !activeSession) return;
    setBusy(true);
    try {
      const r = await api(`/api/sessions/message?id=${activeSession.id}`, "POST", { content: chatInput });
      setChatInput("");
      const d = await api(`/api/sessions/detail?id=${activeSession.id}`); setSessionDetail(d.session);
      if (r.adaptation) setMsg(`Adaptasi: Level ${r.adaptation.fromLevel} → ${r.adaptation.toLevel}. ${r.adaptReason || ""}`);
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }
  async function endSession() {
    if (!activeSession) return;
    setBusy(true);
    try {
      const r = await api(`/api/sessions/end?id=${activeSession.id}`, "POST", {});
      const d = await api(`/api/sessions/detail?id=${activeSession.id}`); setSessionDetail(d.session);
      setMsg("Sesi selesai — laporan evaluasi 5 bagian sudah siap di bawah.");
      loadAll();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }
  async function choosePlan(plan: string, trial = false) {
    setBusy(true); setMsg("");
    try {
      await api("/api/subscription", "POST", { plan, billing, trial });
      setMsg(trial ? "Trial Pro 14 hari aktif (SIMULASI — tidak ada tagihan nyata)." : `Paket ${PLANS_UI[plan]?.name} dipilih (SIMULASI — tidak ada tagihan nyata).`);
      loadAll();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }
  async function deleteHistory() {
    if (!confirm("Hapus SEMUA riwayat latihan, evaluasi, memori, dan Brand Profile?")) return;
    await api("/api/history", "DELETE"); loadAll(); setMsg("Riwayat dan memori sudah dihapus.");
  }

  if (!user) {
    return (
      <div>
        <header className="top">
          <img className="logo" src="/logo.webp" alt="Logo Phatica" />
          <div><div style={{ fontSize: 22, fontWeight: 800 }}>Phatica</div><div className="tagline">AI-Powered Strategic Communication Skills.</div></div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn-ghost" onClick={scrollToAuth}>Masuk</button>
            <button className="btn" onClick={scrollToAuth}>Mulai Latihan</button>
          </div>
        </header>
        <div className="wrap">
          <section className="hero">
            <h1>AI-Powered <em>Strategic Communication</em> Skills.</h1>
            <p className="lead">Komunikasi Strategis, Dilatih dengan Kecerdasan Buatan. Latihan komunikasi dengan sparring partner AI — bukan video satu arah: Roleplay Agent jadi lawan bicaramu, lalu Evaluation Agent menilaimu dengan rubrik per skenario, bukti kutipan, dan 1 kalimat alternatif yang bisa langsung dipakai.</p>
            <div className="card" id="auth" style={{ maxWidth: 480, margin: "0 auto 16px", textAlign: "left" }}>
              <div className="tabs" style={{ marginTop: 0 }}>
                <button className={authMode === "login" ? "on" : ""} onClick={() => setAuthMode("login")}>Masuk</button>
                <button className={authMode === "register" ? "on" : ""} onClick={() => setAuthMode("register")}>Daftar dengan Email</button>
              </div>
              <form onSubmit={authMode === "login" ? doLogin : doRegister}>
                {authMode === "register" && (<><label className="small">Nama</label><input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Nama lengkapmu" required /></>)}
                <label className="small">Email</label><input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="nama@email.com" required />
                <label className="small">Password {authMode === "register" ? "(minimal 8 karakter)" : ""}</label><input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Minimal 8 karakter" required minLength={8} />
                {authError && <p style={{ color: "var(--danger)", fontSize: 14 }}>{authError}</p>}
                <div style={{ marginTop: 12 }}><button className="btn" type="submit" disabled={authBusy} style={{ width: "100%" }}>{authBusy ? "Memproses…" : authMode === "login" ? "Masuk" : "Buat Akun & Mulai Latihan"}</button></div>
              </form>
              <p className="small" style={{ marginTop: 12 }}>{authMode === "login" ? "Belum punya akun? Pindah ke tab Daftar dengan Email — akun baru otomatis jadi paket Free." : "Sudah punya akun? Pindah ke tab Masuk."} Lupa password? Saat ini belum ada reset password mandiri — simpan passwordmu baik-baik.</p>
            </div>
            <p className="small" style={{ marginTop: 12 }}>Mulai Latihan Gratis — Free Rp0 (3 simulasi/bulan). Daftar dengan email dan passwordmu — password hanya disimpan sebagai hash, tidak pernah sebagai teks biasa. Data latihan hanya bisa dilihat oleh akunmu sendiri.</p>
            <p className="small">Paket: <b>Free Rp0</b> (3 simulasi/bulan) · <b>Pro Rp99.000/bulan</b> atau Rp79.200/bulan tahunan · <b>Tim/Institusi mulai Rp1.500.000/bulan</b> · Trial Pro 14 hari gratis.</p>
          </section>
          <div className="grid g3">
            <div className="card"><b>Latih.</b><p className="small">Pilih 1 dari 24 skenario — wawancara kerja, hoax viral, pembeli sinis, negosiasi endorsement — dan hadapi persona AI yang menekan.</p></div>
            <div className="card"><b>Dinilai.</b><p className="small">Evaluation Agent menilai dengan rubrik per skenario, tepat 3 kutipan bukti, 1 blind spot, dan 1 kalimat alternatif.</p></div>
            <div className="card"><b>Naik Level.</b><p className="small">Adaptation Engine level 1–5 naik saat kamu kuat, turun saat kamu kewalahan. Memorimu tersimpan dan dipakai di sesi berikutnya.</p></div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h2 style={{ marginTop: 0 }}>Semua Latihanmu, di Satu Layar</h2>
            <p className="small">Beranda menampilkan progres, memori, dan pemakaian paketmu — dari data latihanmu sendiri. Belum ada sesi? Beranda akan jujur menampilkan keadaan kosong sampai kamu menyelesaikan satu sesi latihan.</p>
            <div className="grid g3">
              <div><div className="small">Skor rata-rata</div><div className="stat">—</div><p className="small">0 sesi selesai</p></div>
              <div><div className="small">Simulasi bulan ini</div><div className="stat">0 / 3</div><p className="small">Paket Free — batas 3/bulan.</p></div>
              <div><div className="small">Sesi terakhir</div><p>Belum ada sesi. Mulai dari Pilih Skenario setelah login.</p></div>
            </div>
          </div>
          <div style={{ marginTop: 24 }}><h2>4 pilar, 24 skenario</h2></div>
          <div className="grid g4" style={{ marginTop: 12 }}>
            <div className="card"><b>Interpersonal</b><div className="stat">13</div><p className="small">Wawancara kerja &amp; beasiswa, orang tua, minta maaf, PHK, teguran atasan.</p></div>
            <div className="card"><b>PR / Krisis</b><div className="stat">3</div><p className="small">Hoax viral, review bintang 1, klarifikasi di live TikTok/IG.</p></div>
            <div className="card"><b>Marketing &amp; Sales</b><div className="stat">3</div><p className="small">Pembeli “di Shopee lebih murah”, pitch investor 2 menit, closing WA/DM.</p></div>
            <div className="card"><b>Personal Branding</b><div className="stat">5</div><p className="small">Elevator pitch, hater, cancel culture, endorsement, podcast expert.</p></div>
          </div>
          <div className="card" style={{ marginTop: 24 }}>
            <h2 style={{ marginTop: 0 }}>Pertanyaan yang sering ditanya</h2>
            <p><b>Apakah Phatica itu video belajar?</b><br /><span className="small">Bukan. Phatica adalah simulasi roleplay: kamu berlatih menjawab lawan bicara AI, lalu dinilai.</span></p>
            <p><b>Apa yang saya dapat di paket Free?</b><br /><span className="small">3 simulasi/bulan, pilar Interpersonal, evaluasi dasar. Pro Rp99.000/bulan (atau Rp79.200/bulan tahunan, Rp950.400/tahun) membuka semua 4 pilar, Brand Audit, dan Content Coach. Tim/Institusi mulai Rp1.500.000/bulan per tim.</span></p>
            <p><b>Apakah pembayaran sudah nyata?</b><br /><span className="small">Belum. Pembayaran masih SIMULASI — belum ada pembayaran sungguhan, Midtrans belum live.</span></p>
            <p><b>Apakah data saya aman?</b><br /><span className="small">Ya. Kamu masuk dengan email dan password — password hanya disimpan sebagai hash, tidak pernah sebagai teks biasa — dan data latihan hanya bisa dilihat oleh akunmu sendiri.</span></p>
          </div>
          <section className="closing">
            <h2>WAKTUMU LEBIH BERHARGA DARIPADA TERUS GUGUP SAAT BICARA.</h2>
            <button className="btn" onClick={scrollToAuth}>Mulai Latihan Gratis</button>
          </section>
        </div>
        <footer className="foot">
          <div className="wrap" style={{ padding: 0, display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <img className="logo" src="/logo.webp" alt="Logo Phatica" />
            <div><div style={{ fontSize: 20, fontWeight: 800 }}>Phatica</div><div style={{ fontSize: 13, opacity: .85 }}>AI-Powered Strategic Communication Skills.</div><p className="small" style={{ color: "#c7c5e0" }}>Komunikasi Strategis, Dilatih dengan Kecerdasan Buatan.</p></div>
            <div style={{ marginLeft: "auto" }}><button className="btn" onClick={scrollToAuth}>Masuk</button></div>
          </div>
        </footer>
      </div>
    );
  }

  const planKey = dash?.plan || "free";
  const shown = pillarFilter === "Semua" ? scenarios : scenarios.filter((s) => s.pillar === pillarFilter);
  return (
    <div>
      <header className="top">
        <img className="logo" src="/logo.webp" alt="Logo Phatica" />
        <div><div style={{ fontSize: 20, fontWeight: 800 }}>Phatica</div><div className="tagline">AI-Powered Strategic Communication Skills.</div></div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="badge ok">Paket: {PLANS_UI[planKey]?.name || planKey}</span>
          <button className="btn" onClick={() => setTab("skenario")}>Mulai Latihan</button>
          <button className="btn-ghost" onClick={() => setTab("paket")}>Paket Langganan</button>
          <span className="small">{user.name || user.email}</span>
          <button className="btn-ghost" onClick={doLogout}>Keluar</button>
        </div>
      </header>
      <div className="wrap">
        {msg && <div className="card" style={{ marginBottom: 12 }}><pre>{msg}</pre></div>}
        <div className="tabs">
          {[["beranda", "Beranda"], ["skenario", "Pilih Skenario"], ["latihan", "Ruang Latihan"], ["memori", "Memori Saya"], ["branding", "Personal Branding"], ["paket", "Paket Langganan"]].map(([k, label]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        {tab === "beranda" && dash && (
          <div className="grid">
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Semua Latihanmu, di Satu Layar</h2>
              <p className="small">Komunikasi Strategis, Dilatih dengan Kecerdasan Buatan. Progres, memori, dan pemakaian paketmu — dari data latihanmu sendiri, bukan data contoh.</p>
              <div className="grid g3">
                <div><b>Latih.</b><p className="small">24 skenario di 4 pilar.</p></div>
                <div><b>Dinilai.</b><p className="small">Laporan 5 bagian + tepat 3 kutipan bukti.</p></div>
                <div><b>Naik Level.</b><p className="small">Adaptasi level 1–5 dengan alasan tercatat.</p></div>
              </div>
            </div>
            <div className="grid g3">
              <div className="card"><div className="small">Skor rata-rata</div><div className="stat">{dash.progress.length ? Math.round(dash.progress.reduce((a, p) => a + (p.overall || 0), 0) / dash.progress.length) : "—"}</div><p className="small">{dash.progress.length} sesi selesai</p></div>
              <div className="card"><div className="small">Simulasi bulan ini</div><div className="stat">{dash.usedThisMonth}{dash.limitMonthly ? ` / ${dash.limitMonthly}` : ""}</div>
                {dash.limitMonthly ? <div className="bar indigo" style={{ marginTop: 8 }}><div style={{ width: `${Math.min(100, (dash.usedThisMonth / dash.limitMonthly) * 100)}%` }} /></div> : null}
                <p className="small">{dash.limitMonthly ? (dash.usedThisMonth >= dash.limitMonthly ? "Batas Free bulan ini sudah habis — upgrade ke Pro di Paket Langganan untuk lanjut berlatih." : `Paket ${PLANS_UI[planKey]?.name} — batas Free 3/bulan. Upgrade di Paket Langganan.`) : "Paket Pro/Tim — tanpa batas harian."}</p></div>
              <div className="card"><div className="small">Sesi terakhir</div><p>{dash.memory?.lastRecap || "Belum ada sesi. Mulai dari Pilih Skenario."}</p></div>
            </div>
            <div className="card"><h3 style={{ marginTop: 0 }}>Tren skor</h3>
              {dash.progress.length === 0 ? <p className="small">Belum ada data — selesaikan satu sesi latihan dulu.</p> :
                dash.progress.map((p) => (<div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><span className="small" style={{ width: 220 }}>{p.scenarioId}</span><div className="bar" style={{ flex: 1 }}><div style={{ width: `${p.overall || 0}%` }} /></div><b>{p.overall}</b></div>))}
            </div>
            <div className="card"><h3 style={{ marginTop: 0 }}>Sesi terakhir</h3>
              {dash.recentSessions.length === 0 ? <p className="small">Belum ada sesi.</p> :
                dash.recentSessions.map((s) => (<div key={s.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span><b>{s.scenarioId}</b> · {s.pillar} · Level {s.level} · {s.status}{s.overall !== null ? ` · Skor ${s.overall}` : ""}</span>{s.status === "active" && <button className="btn" disabled={busy} onClick={() => resumeSession(s)}>Lanjutkan sesi aktif →</button>}</div>))}
            </div>
          </div>
        )}

        {tab === "skenario" && (
          <div>
            <div className="tabs">{["Semua", ...PILLARS].map((p) => (<button key={p} className={pillarFilter === p ? "on" : ""} onClick={() => setPillarFilter(p)}>{p}</button>))}</div>
            <p className="small">{scenarios.length} skenario · Paketmu: <b>{PLANS_UI[planKey]?.name}</b> — pilar di luar paketmu akan ditolak saat memulai sesi (Free: Interpersonal saja).</p>
            <div className="grid g2">
              {shown.map((sc) => (
                <div key={sc.id} className="card">
                  <span className="tag">{sc.pillar}</span> <span className="badge info">Level dasar {sc.baseDifficulty}</span> <span className="badge warn">{sc.evaluatorMode}</span>
                  <h3>{sc.title}</h3>
                  <p className="small">{sc.context}</p>
                  <p><b>{sc.personaName}</b> — {sc.personaRole}</p>
                  <p className="small">Tujuan: {sc.goal} · Durasi {sc.durationLabel}</p>
                  <button className="btn" disabled={busy} onClick={() => startScenario(sc)}>Mulai Latihan</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "latihan" && (
          <div>
            {!sessionDetail ? <div className="card"><p>Belum ada sesi aktif. Pilih skenario dulu di tab <b>Pilih Skenario</b>.</p></div> : (
              <div className="grid">
                <div className="card">
                  <b>{activeSession?.scenario?.title || sessionDetail.scenarioId}</b> · Level {sessionDetail.level} · Status {sessionDetail.status}
                  <p className="small">{activeSession?.scenario?.goal || ""}</p>
                  <p className="small">Mode evaluator: {activeSession?.scenario?.evaluatorMode || ""} · Rubrik: {(activeSession?.scenario?.rubric || []).map((r: any) => r.label).join(", ")}</p>
                </div>
                <div className="chat">
                  {(sessionDetail.messages || []).map((m: any, i: number) => (<div key={i} className={`msg ${m.role === "user" ? "user" : "persona"}`}><pre>{m.content}</pre></div>))}
                </div>
                {sessionDetail.status === "active" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }} placeholder="Tulis jawabanmu di sini…" />
                    <button className="btn" disabled={busy} onClick={sendChat}>Kirim</button>
                    <button className="btn-ghost" disabled={busy} onClick={endSession}>Akhiri &amp; Evaluasi</button>
                  </div>
                )}
                {(sessionDetail.adaptations || []).length > 0 && (
                  <div className="card"><h3 style={{ marginTop: 0 }}>Adaptasi otonom</h3>
                    {sessionDetail.adaptations.map((a: any) => (<p key={a.id} className="small">Level {a.fromLevel} → {a.toLevel} ({a.signal}): {a.reason}</p>))}
                  </div>
                )}
                {sessionDetail.evaluation && (() => {
                  const ev = sessionDetail.evaluation;
                  const scores = JSON.parse(ev.scores || "[]");
                  const quotes = JSON.parse(ev.quotes || "[]");
                  const trace = JSON.parse(ev.toolTrace || "[]");
                  return (
                    <div className="card">
                      <h3 style={{ marginTop: 0 }}>Hasil Evaluasi — Skor {ev.overall}</h3>
                      <p><b>Putusan:</b> {ev.verdict}</p>
                      {scores.map((s: any) => (<div key={s.key} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><span className="small" style={{ width: 220 }}>{s.label}</span><div className="bar" style={{ flex: 1 }}><div style={{ width: `${s.score}%` }} /></div><b>{s.score}</b></div>))}
                      <p><b>3 bukti kutipan:</b></p>
                      <ol>{quotes.map((q: string, i: number) => (<li key={i}><i>“{q}”</i></li>))}</ol>
                      <p><b>1 blind spot:</b> {ev.blindSpot}</p>
                      <p><b>Kalimat alternatif:</b> {ev.alternative}</p>
                      <p><b>Latihan 2 menit:</b> {ev.drill}</p>
                      <p><b>Perbandingan:</b> {ev.comparison}</p>
                      {ev.patterns && <p><span className="badge bad">Pola berbahaya: {ev.patterns}</span></p>}
                      {ev.recurring && <p className="small">Kelemahan berulang dari memori: {ev.recurring}</p>}
                      <details><summary className="small">Jejak tool evaluator (bisa diperiksa)</summary>
                        <pre className="small">{JSON.stringify(trace, null, 2)}</pre>
                      </details>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {tab === "memori" && dash && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Memori Saya</h3>
            {dash.memory?.lastRecap ? (
              <div>
                <p><b>Gaya bicara:</b> {dash.memory.styleTraits || "-"}</p>
                <p><b>Kekuatan:</b> {dash.memory.strengths || "-"}</p>
                <p><b>Kelemahan berulang:</b> {dash.memory.weaknesses || "-"}</p>
                <p><b>Rekap sesi terakhir:</b> {dash.memory.lastRecap}</p>
                <p className="small">Total {dash.memory.totalSessions} sesi · {dash.memory.totalTurns} giliran bicara · Level per pilar: {JSON.stringify(dash.memory.levels || {})}</p>
              </div>
            ) : <p>Belum ada memori — selesaikan satu sesi latihan dulu.</p>}
            <button className="btn-danger" onClick={deleteHistory}>Hapus Semua Riwayat &amp; Memori</button>
          </div>
        )}

        {tab === "branding" && (
          <div className="grid">
            <div className="card"><h3 style={{ marginTop: 0 }}>Brand Profile (tersimpan di memori)</h3>
              <label className="small">Niche</label><input value={bp.niche} onChange={(e) => setBp({ ...bp, niche: e.target.value })} placeholder="mis. dosen komunikasi untuk fresh graduate" />
              <label className="small">Audiens</label><input value={bp.audience} onChange={(e) => setBp({ ...bp, audience: e.target.value })} placeholder="mis. mahasiswa & pencari kerja" />
              <label className="small">Nilai (maks 3, pisah koma)</label><input value={bp.values} onChange={(e) => setBp({ ...bp, values: e.target.value })} placeholder="mis. jujur, praktis, empatik" />
              <label className="small">Nada bicara</label><input value={bp.tone} onChange={(e) => setBp({ ...bp, tone: e.target.value })} placeholder="mis. santai tapi tegas" />
              <label className="small">Bukti kredibilitas</label><textarea rows={2} value={bp.credibility} onChange={(e) => setBp({ ...bp, credibility: e.target.value })} placeholder="mis. 10 tahun mengajar, 30+ seminar" />
              <div style={{ marginTop: 10 }}><button className="btn" onClick={async () => { await api("/api/brand/profile", "POST", bp); setMsg("Brand Profile tersimpan."); loadAll(); }}>Simpan Brand Profile</button></div>
              <p className="small">Profil ini dipakai persona &amp; evaluator di Pilar IV. Tidak ada scheduler posting, auto-DM, atau analitik follower.</p>
            </div>
            <div className="card"><h3 style={{ marginTop: 0 }}>Brand Audit</h3>
              <label className="small">Bio kamu</label><textarea rows={3} value={auditForm.bio} onChange={(e) => setAuditForm({ ...auditForm, bio: e.target.value })} placeholder="Tempel bio Instagram/LinkedIn/Threads kamu" />
              <label className="small">3 postingan terakhir (satu per baris)</label><textarea rows={3} value={auditForm.posts} onChange={(e) => setAuditForm({ ...auditForm, posts: e.target.value })} placeholder="Tempel sampai 3 postingan" />
              <div style={{ marginTop: 10 }}><button className="btn" disabled={busy} onClick={async () => { setBusy(true); try { const r = await api("/api/brand/audit", "POST", { bio: auditForm.bio, posts: auditForm.posts.split("\n").filter(Boolean) }); setAuditResult(r.audit); } catch (e: any) { setMsg(e.message); } setBusy(false); }}>Jalankan Brand Audit</button></div>
              {auditResult && (<div style={{ marginTop: 12 }}>
                {(JSON.parse(auditResult.scores)).map((s: any) => (<div key={s.key} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><span className="small" style={{ width: 200 }}>{s.label}</span><div className="bar" style={{ flex: 1 }}><div style={{ width: `${s.score}%` }} /></div><b>{s.score}</b></div>))}
                <p><b>Bio baru:</b> {auditResult.rewrite}</p>
              </div>)}
            </div>
            <div className="card"><h3 style={{ marginTop: 0 }}>Content Coach</h3>
              <label className="small">Draf konten (Threads/LinkedIn)</label><textarea rows={4} value={coachForm.draft} onChange={(e) => setCoachForm({ ...coachForm, draft: e.target.value })} placeholder="Tempel draf postinganmu" />
              <label className="small">Platform</label><select value={coachForm.platform} onChange={(e) => setCoachForm({ ...coachForm, platform: e.target.value })}><option>Threads</option><option>LinkedIn</option><option>Instagram</option><option>TikTok</option></select>
              <div style={{ marginTop: 10 }}><button className="btn" disabled={busy} onClick={async () => { setBusy(true); try { const r = await api("/api/brand/content", "POST", coachForm); setCoachResult(r.review); } catch (e: any) { setMsg(e.message); } setBusy(false); }}>Nilai Draf Saya</button></div>
              {coachResult && (<div style={{ marginTop: 12 }}>
                {(JSON.parse(coachResult.scores)).map((s: any) => (<div key={s.key} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><span className="small" style={{ width: 200 }}>{s.label}</span><div className="bar" style={{ flex: 1 }}><div style={{ width: `${s.score}%` }} /></div><b>{s.score}</b></div>))}
                <p><b>3 hook rewrite:</b></p>
                <ol>{(JSON.parse(coachResult.hooks)).map((h: string, i: number) => (<li key={i}>{h}</li>))}</ol>
              </div>)}
            </div>
          </div>
        )}

        {tab === "paket" && (
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <b>Paketmu saat ini: {PLANS_UI[planKey]?.name}</b>
              {dash?.subscription?.status === "trialing" && dash?.subscription?.trialEndsAt ? <span className="badge warn" style={{ marginLeft: 8 }}>Trial Pro sampai {new Date(dash.subscription.trialEndsAt).toLocaleDateString("id-ID")}</span> : null}
              <p className="small">Pembayaran masih <b>SIMULASI</b> — tidak ada tagihan nyata sampai Midtrans live dipasang. Harga sama dengan ruang Muse.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={billing === "monthly" ? "btn" : "btn-ghost"} onClick={() => setBilling("monthly")}>Bulanan</button>
                <button className={billing === "annual" ? "btn" : "btn-ghost"} onClick={() => setBilling("annual")}>Tahunan (hemat 20% untuk Pro)</button>
              </div>
            </div>
            <div className="grid g3">
              {(Object.keys(PLANS_UI) as Array<keyof typeof PLANS_UI>).map((k) => {
                const p = PLANS_UI[k];
                const price = billing === "annual" ? p.annualMonthly : p.monthly;
                return (
                  <div key={k} className="card" style={planKey === k ? { border: "2px solid #14b8a6" } : {}}>
                    <h3>{p.name} {planKey === k && <span className="badge ok">Paket saat ini</span>}</h3>
                    <div className="stat">{price === 0 ? "Rp0" : fmtRp(price)}<span className="small">/bulan</span></div>
                    {billing === "annual" && k === "pro" && <p className="small">Total {fmtRp(p.annualTotal)}/tahun — hemat 20% dari Rp99.000/bulan.</p>}
                    <p className="small">{p.desc}</p>
                    <ul className="small">{p.features.map((f) => (<li key={f}>{f}</li>))}</ul>
                    {planKey === k ? <button className="btn-ghost" disabled>Paket aktif</button> : (
                      <button className="btn" disabled={busy} onClick={() => choosePlan(k)}>Pilih {p.name}</button>
                    )}
                  </div>
                );
              })}
            </div>
            {planKey === "free" && (
              <div className="card" style={{ marginTop: 16 }}>
                <b>Coba Pro gratis 14 hari</b>
                <p className="small">Tanpa kartu, tanpa tagihan — simulasi saja. Setelah 14 hari kamu kembali ke Free kalau tidak upgrade.</p>
                <button className="btn" disabled={busy} onClick={() => choosePlan("pro", true)}>Mulai Trial Pro 14 Hari (Gratis)</button>
              </div>
            )}
          </div>
        )}
      </div>
      <footer className="foot">
        <div className="wrap" style={{ padding: 0, display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <img className="logo" src="/logo.webp" alt="Logo Phatica" />
          <div><div style={{ fontSize: 20, fontWeight: 800 }}>Phatica</div><div style={{ fontSize: 13, opacity: .85 }}>AI-Powered Strategic Communication Skills.</div><p className="small" style={{ color: "#c7c5e0" }}>Komunikasi Strategis, Dilatih dengan Kecerdasan Buatan.</p></div>
        </div>
      </footer>
    </div>
  );
}
