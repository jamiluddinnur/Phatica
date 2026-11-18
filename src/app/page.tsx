"use client";
import { useEffect, useRef, useState } from "react";
import { TRAITS, CUSTOM_TEMPLATES } from "@/lib/custom-roleplay";
import { PILLAR_COLORS, PILLAR_ICONS, RUBRIC_DIMENSION_LIBRARY, duplicatePrefillFromScenario, personaCardForCustomScenario, pillarLabelForKey, validateWizardStep } from "@/lib/custom-library";

type User = { id: string; name: string; email: string };
type Scenario = { id: string; title: string; pillar: string; personaName: string; personaRole: string; context: string; opening: string; goal: string; baseDifficulty: number; durationLabel: string; evaluatorMode: string; fourthLabel: string; rubric: Array<{ key: string; label: string; rubric: string; weight: number }>; verdictHint: string; modelAnswer: string; tip: string };
type Dash = { user: User; plan: string; subscription: any; memory: any; brandProfile: any; usedThisMonth: number; limitMonthly: number | null; progress: Array<{ id: string; scenarioId: string; overall: number | null; createdAt: string }>; recentSessions: Array<{ id: string; scenarioId: string | null; customRoleplayId: string | null; customScenarioId: string | null; customized: boolean; sourceScenarioId: string | null; displayTitle: string; pillar: string; status: string; level: number; createdAt: string; overall: number | null }> };

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
  // auth email + password
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  // Lupa password (reset mandiri — butuh layanan email, lihat README)
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(true);
  // Batas AI harian (LLM) — ditampilkan jujur saat tercapai
  const [llmNotice, setLlmNotice] = useState("");
  // Ganti password (pengguna yang sudah masuk)
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpMsg, setCpMsg] = useState("");
  const [cpBusy, setCpBusy] = useState(false);
  async function doForgot(e?: React.FormEvent) {
    e?.preventDefault(); setForgotMsg(""); setForgotBusy(true);
    try {
      const r = await api("/api/auth/forgot", "POST", { email: forgotEmail });
      setForgotMsg(r.message || "Permintaan terkirim.");
      setEmailConfigured(r.emailConfigured !== false);
    } catch (err: any) { setForgotMsg(err.message || "Ada yang tidak beres — coba lagi nanti."); }
    setForgotBusy(false);
  }
  async function doChangePassword(e?: React.FormEvent) {
    e?.preventDefault(); setCpMsg("");
    if (cpNew.length < 8) { setCpMsg("Password baru minimal 8 karakter."); return; }
    if (cpNew !== cpConfirm) { setCpMsg("Konfirmasi password baru tidak sama."); return; }
    setCpBusy(true);
    try {
      const r = await api("/api/auth/change-password", "POST", { currentPassword: cpCurrent, newPassword: cpNew });
      setCpMsg(r.message || "Password berhasil diubah.");
      setCpCurrent(""); setCpNew(""); setCpConfirm("");
    } catch (err: any) { setCpMsg(err.message || "Ada yang tidak beres — coba lagi nanti."); }
    setCpBusy(false);
  }
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
  // Roleplay Bebas / Skenario Buatanmu
  const [customForm, setCustomForm] = useState({ personaName: "", personaRole: "", trait: "Skeptis", situation: "", goal: "", level: 3 });
  const [oneSentence, setOneSentence] = useState("");
  const [customPreview, setCustomPreview] = useState<any>(null);
  const [customSource, setCustomSource] = useState<{ scenarioId: string; title: string } | null>(null);
  const [myCustoms, setMyCustoms] = useState<any[]>([]);
  const [lastEngine, setLastEngine] = useState("");
  const [customStage, setCustomStage] = useState("");
  const [customTurns, setCustomTurns] = useState(0);
  // Skenarioku + Pilarku
  const [library, setLibrary] = useState<any[]>([]);
  const [myPillars, setMyPillars] = useState<any[]>([]);
  const [maxScenarios, setMaxScenarios] = useState(20);
  const [showPillarForm, setShowPillarForm] = useState(false);
  const [editingPillar, setEditingPillar] = useState<any>(null);
  const [pillarForm, setPillarForm] = useState<{ name: string; description: string; color: string; icon: string }>({ name: "", description: "", color: PILLAR_COLORS[0], icon: "chat" });
  const [pillarDeleteTarget, setPillarDeleteTarget] = useState<any>(null);
  const [pillarDeleteFallback, setPillarDeleteFallback] = useState("interpersonal");
  const [wizOpen, setWizOpen] = useState(false);
  const [wizReview, setWizReview] = useState(false);
  const [wiz, setWiz] = useState({ step: 1, id: "", pillarKey: "interpersonal", title: "", personaName: "", personaRole: "", trait: "Skeptis", situation: "", goal: "", level: 3, openingLine: "", rubricKeys: ["bukti", "struktur"] as string[], customDimension: "", sourceScenarioId: "" });
  const [saveFromRoleplayMsg, setSaveFromRoleplayMsg] = useState("");
  async function loadLibrary() {
    try { const r = await api("/api/library"); setLibrary(r.items || []); setMyPillars(r.pillars || []); if (r.maxCustomScenarios) setMaxScenarios(r.maxCustomScenarios); } catch { /* abaikan */ }
  }
  function openWizardNew() {
    setWiz({ step: 1, id: "", pillarKey: "interpersonal", title: "", personaName: "", personaRole: "", trait: "Skeptis", situation: "", goal: "", level: 3, openingLine: "", rubricKeys: ["bukti", "struktur"], customDimension: "", sourceScenarioId: "" });
    setWizReview(false); setWizOpen(true); setMsg("");
  }
  // "Duplikasi & Sesuaikan": isi wizard dari skenario bawaan — TIDAK ada yang
  // dibuat di server sampai pengguna menekan Simpan (tidak memakan kuota 20).
  function duplicateScenario(sc: Scenario) {
    const pre = duplicatePrefillFromScenario(sc);
    setWiz({ step: 1, id: "", pillarKey: "interpersonal", title: pre.title, personaName: pre.personaName, personaRole: pre.personaRole, trait: pre.trait, situation: pre.situation, goal: pre.goal, level: pre.level, openingLine: pre.openingLine, rubricKeys: pre.rubricKeys.length >= 2 ? pre.rubricKeys : ["bukti", "struktur"], customDimension: "", sourceScenarioId: pre.sourceScenarioId });
    setWizReview(false); setWizOpen(true);
    setMsg(`Menduplikasi "${sc.title}" — ubah apa pun di wizard, lalu simpan. Salinan baru dihitung ke batas 20 skenario hanya setelah kamu simpan.${pre.rubricSlotFull ? " Rubrik aslinya sudah 4 dimensi, jadi tidak ada slot kosong — hapus satu dimensi di langkah 3 bila mau menambah dimensimu sendiri." : ""}`);
    setTab("skenarioku"); loadLibrary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function openWizardEdit(id: string) {
    setBusy(true);
    try {
      const r = await api(`/api/library/detail?id=${id}`);
      const s = r.scenario;
      const rubric = (s.rubric || []) as any[];
      setWiz({ step: 1, id: s.id, pillarKey: s.pillarKey, title: s.title, personaName: s.personaName, personaRole: s.personaRole, trait: s.trait, situation: s.situation, goal: s.goal, level: s.level, openingLine: s.openingLine || "", rubricKeys: rubric.filter((x) => !String(x.key).startsWith("custom_")).map((x) => x.key), customDimension: (rubric.find((x) => String(x.key).startsWith("custom_")) || {}).label || "", sourceScenarioId: s.sourceScenarioId || "" });
      setWizReview(false); setWizOpen(true); setMsg(`Mengedit "${s.title}" — simpan untuk menerapkan perubahanmu.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }
  function openWizardDuplicateLib(s: any) {
    setWiz({ step: 1, id: "", pillarKey: s.pillarKey, title: `Salinan dari ${s.title}`.slice(0, 80), personaName: s.personaName, personaRole: s.personaRole, trait: s.trait, situation: s.situation, goal: s.goal, level: s.level, openingLine: s.openingLine || "", rubricKeys: (s.rubric || []).filter((x: any) => !String(x.key).startsWith("custom_")).map((x: any) => x.key), customDimension: ((s.rubric || []).find((x: any) => String(x.key).startsWith("custom_")) || {}).label || "", sourceScenarioId: s.sourceScenarioId || "" });
    setWizReview(false); setWizOpen(true); setMsg(`Menduplikasi "${s.title}" — salinan baru dihitung ke batas 20 skenario hanya setelah kamu simpan.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function wizNext() {
    const err = validateWizardStep(wiz.step as 1 | 2 | 3, { personaName: wiz.personaName, personaRole: wiz.personaRole, trait: wiz.trait, level: wiz.level, situation: wiz.situation, goal: wiz.goal, title: wiz.title, rubricKeys: wiz.rubricKeys, customDimension: wiz.customDimension });
    if (err) { setMsg(err); return; }
    if (wiz.step < 3) { setWiz({ ...wiz, step: wiz.step + 1 }); setMsg(""); }
    else setWizReview(true);
  }
  async function saveWizard(playAfter: boolean) {
    const err = validateWizardStep(3, { personaName: wiz.personaName, personaRole: wiz.personaRole, trait: wiz.trait, level: wiz.level, situation: wiz.situation, goal: wiz.goal, title: wiz.title, rubricKeys: wiz.rubricKeys, customDimension: wiz.customDimension });
    if (err) { setMsg(err); return; }
    setBusy(true); setMsg("");
    try {
      const body = { title: wiz.title, personaName: wiz.personaName, personaRole: wiz.personaRole, trait: wiz.trait, situation: wiz.situation, goal: wiz.goal, level: wiz.level, openingLine: wiz.openingLine, pillarKey: wiz.pillarKey, rubricKeys: wiz.rubricKeys, customDimension: wiz.customDimension, sourceScenarioId: wiz.sourceScenarioId || undefined };
      const r = wiz.id ? await api(`/api/library/manage?id=${wiz.id}`, "POST", body) : await api("/api/library", "POST", body);
      setWizReview(false); setWizOpen(false);
      setMsg(wiz.id ? `Skenario "${r.scenario.title}" sudah diperbarui.` : `Skenario "${r.scenario.title}" tersimpan di Skenarioku.`);
      await loadLibrary();
      if (playAfter) startLibraryScenario(r.scenario.id);
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }
  async function deleteLibraryScenario(s: any) {
    if (!confirm(`Hapus skenario "${s.title}"? Riwayat sesi yang memakai skenario ini tetap tersimpan.`)) return;
    setBusy(true);
    try { const r = await api(`/api/library/delete?id=${s.id}`, "POST", {}); setMsg(r.message || "Skenario dihapus."); loadLibrary(); } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }
  async function savePillar(e?: React.FormEvent) {
    e?.preventDefault(); setBusy(true); setMsg("");
    try {
      const r = editingPillar ? await api(`/api/pillars/manage?id=${editingPillar.id}`, "POST", pillarForm) : await api("/api/pillars", "POST", pillarForm);
      setMsg(editingPillar ? `Pilar "${r.pillar.name}" diperbarui.` : `Pilar "${r.pillar.name}" dibuat — sekarang kamu bisa menyimpan skenario di pilar ini.`);
      setEditingPillar(null); setShowPillarForm(false); setPillarForm({ name: "", description: "", color: PILLAR_COLORS[0], icon: "chat" });
      loadLibrary();
    } catch (err: any) { setMsg(err.message); }
    setBusy(false);
  }
  async function deletePillar() {
    if (!pillarDeleteTarget) return;
    setBusy(true);
    try {
      const r = await api(`/api/pillars/manage?id=${pillarDeleteTarget.id}&fallback=${pillarDeleteFallback}`, "DELETE");
      setMsg(r.message || "Pilar dihapus.");
      setPillarDeleteTarget(null); loadLibrary();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }
  async function startLibraryScenario(id: string) {
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/sessions", "POST", { customScenarioId: id, register });
      const lib = r.customScenario;
      const card = lib?.personaCard;
      setActiveSession({ ...r.session, isCustom: true, customScenario: lib, scenario: { title: `Skenarioku: ${lib?.title || ""}`, goal: lib?.goal, evaluatorMode: "Seimbang", rubric: lib?.rubric || [] } });
      const d = await api(`/api/sessions/detail?id=${r.session.id}`); setSessionDetail(d.session);
      setLastEngine(""); setCustomStage("Pembuka"); setCustomTurns(0);
      setTab("latihan");
    } catch (err: any) { setMsg(err.message); }
    setBusy(false);
  }
  async function saveRoleplayAsScenario() {
    const cr = sessionDetail?.customRoleplay;
    if (!cr?.id) return;
    setBusy(true); setSaveFromRoleplayMsg("");
    try {
      const r = await api("/api/library/save-from-roleplay", "POST", { customRoleplayId: cr.id });
      setSaveFromRoleplayMsg(r.message || `Tersimpan sebagai "${r.scenario.title}" di Skenarioku.`);
      loadLibrary();
    } catch (e: any) { setSaveFromRoleplayMsg(e.message); }
    setBusy(false);
  }
  // Tes Awal + Jalur Belajar
  const [diag, setDiag] = useState<any>(null);
  const [diagAnswers, setDiagAnswers] = useState(["", "", ""]);
  const [diagDoneCount, setDiagDoneCount] = useState(0);
  // Latihan Hari Ini (drill)
  const [drillsPending, setDrillsPending] = useState<any[]>([]);
  const [drillsDone, setDrillsDone] = useState<any[]>([]);
  const [drillAttempts, setDrillAttempts] = useState<Record<string, string>>({});
  // Laporan Perkembangan
  const [report, setReport] = useState<any>(null);
  // Formal / Santai
  const [register, setRegister] = useState<"formal" | "santai">("santai");
  // Suara (Web Speech API — transkripsi di browser, audio tidak diunggah)
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState("");
  const [speakOn, setSpeakOn] = useState(false);
  const [lastVoice, setLastVoice] = useState<{ used: boolean; durationSec: number } | null>(null);
  const voiceStartRef = useRef(0);
  const recogRef = useRef<any>(null);
  useEffect(() => {
    setVoiceSupported(typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
  }, []);
  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setVoiceMsg("Browser ini belum mendukung input suara — ketik jawabanmu."); return; }
    if (voiceOn && recogRef.current) { recogRef.current.stop(); return; }
    const rec = new SR();
    rec.lang = "id-ID"; rec.interimResults = false; rec.continuous = false;
    voiceStartRef.current = Date.now();
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(" ").trim();
      if (text) setChatInput((prev) => (prev ? prev + " " : "") + text);
    };
    rec.onend = () => { setVoiceOn(false); const dur = (Date.now() - voiceStartRef.current) / 1000; if (dur > 0.5) setLastVoice({ used: true, durationSec: dur }); };
    rec.onerror = () => { setVoiceOn(false); setVoiceMsg("Mikrofon tidak bisa dipakai — periksa izin mikrofon di browser, lalu ketik jawabanmu."); };
    recogRef.current = rec;
    try { rec.start(); setVoiceOn(true); setVoiceMsg("Mendengarkan… bicara sekarang, lalu tekan lagi untuk berhenti."); } catch { setVoiceMsg("Mikrofon tidak bisa dipakai — ketik jawabanmu."); }
  }
  function speakText(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    window.speechSynthesis.speak(u);
  }
  async function loadDiag() {
    try { const r = await api("/api/diagnostic"); setDiag(r.diagnostic || null); setDiagDoneCount(r.doneCount || 0); } catch { /* abaikan */ }
  }
  async function loadDrills() {
    try { const r = await api("/api/drills"); setDrillsPending(r.pending || []); setDrillsDone(r.done || []); } catch { /* abaikan */ }
  }
  async function loadReport() {
    try { const r = await api("/api/report"); setReport(r); } catch { /* abaikan */ }
  }
  async function submitDiagnostic(e?: React.FormEvent) {
    e?.preventDefault(); setBusy(true); setMsg("");
    try {
      const r = await api("/api/diagnostic", "POST", { answers: diagAnswers });
      setDiag(r.diagnostic); setDiagDoneCount(0); loadDrills();
      setMsg("Tes Awal selesai — jalur belajarmu sudah jadi di bawah. Mulai dari skenario pertama.");
    } catch (err: any) { setMsg(err.message); }
    setBusy(false);
  }
  async function loadCustoms() {
    try { const r = await api("/api/custom-roleplay"); setMyCustoms(r.items || []); } catch { /* abaikan */ }
  }
  async function createCustom(e?: React.FormEvent) {
    e?.preventDefault(); setBusy(true); setMsg("");
    try {
      const r = await api("/api/custom-roleplay/create", "POST", { ...customForm, sourceScenarioId: customSource?.scenarioId || undefined });
      setCustomPreview(r.customRoleplay);
      setMsg(customSource ? `Versi yang disesuaikan dari "${customSource.title}" sudah jadi — cek kartu persona dan rubrik penilaiannya di bawah sebelum mulai.` : "Skenario buatanmu sudah jadi — cek kartu persona dan rubrik penilaiannya di bawah sebelum mulai.");
      loadCustoms(); loadDiag(); loadDrills();
    } catch (err: any) { setMsg(err.message); }
    setBusy(false);
  }
  // "Duplikasi & Sesuaikan": isi wizard Skenarioku dari skenario tetap,
  // lalu pengguna boleh mengubah field apa pun sebelum menyimpan versinya.
  // (Dulu: "Sesuaikan & Mainkan" yang mengisi form Roleplay Bebas.)
  function customizeScenario(sc: Scenario) {
    duplicateScenario(sc);
  }
  async function startCustom(customId: string) {
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/sessions", "POST", { customRoleplayId: customId, register });
      const card = r.customRoleplay?.personaCard;
      setActiveSession({ ...r.session, isCustom: true, customRoleplay: r.customRoleplay, scenario: { title: `Roleplay Bebas: ${card?.personaName || ""}`, goal: r.customRoleplay?.goal, evaluatorMode: "Seimbang", rubric: r.customRoleplay?.rubric || [] } });
      const d = await api(`/api/sessions/detail?id=${r.session.id}`); setSessionDetail(d.session);
      setLastEngine(""); setCustomStage("Pembuka"); setCustomTurns(0);
      setTab("latihan");
    } catch (err: any) { setMsg(err.message); }
    setBusy(false);
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
      loadCustoms();
      loadLibrary();
      if (b.profile) setBp({ niche: b.profile.niche || "", audience: b.profile.audience || "", values: b.profile.values || "", tone: b.profile.tone || "", credibility: b.profile.credibility || "" });
    } catch { setUser(null); }
  }
  useEffect(() => { loadAll(); }, []);

  async function startScenario(sc: Scenario) {
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/sessions", "POST", { scenarioId: sc.id, register });
      setActiveSession({ ...r.session, scenario: sc });
      const d = await api(`/api/sessions/detail?id=${r.session.id}`); setSessionDetail(d.session);
      setTab("latihan");
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }
  async function resumeSession(s: { id: string; scenarioId: string | null; customRoleplayId?: string | null }) {
    setBusy(true); setMsg("");
    try {
      const sc = scenarios.find((x) => x.id === s.scenarioId);
      const d = await api(`/api/sessions/detail?id=${s.id}`);
      const custom = d.session.customRoleplay;
      const lib = d.session.customScenario;
      const card = custom ? (typeof custom.personaCard === "string" ? JSON.parse(custom.personaCard) : custom.personaCard) : null;
      const rubric = custom ? (typeof custom.rubric === "string" ? JSON.parse(custom.rubric) : custom.rubric) : [];
      const libRubric = lib ? (typeof lib.rubric === "string" ? JSON.parse(lib.rubric) : lib.rubric) : [];
      setActiveSession({ ...d.session, scenario: sc || (lib ? { title: `Skenarioku: ${lib.title}`, goal: lib.goal, evaluatorMode: "Seimbang", rubric: libRubric } : (card ? { title: `Roleplay Bebas: ${card.personaName}`, goal: custom.goal, evaluatorMode: "Seimbang", rubric } : undefined)), isCustom: !!(custom || lib), customRoleplay: custom ? { ...custom, personaCard: card, rubric } : undefined, customScenario: lib || undefined });
      setSessionDetail(d.session);
      const userTurns = (d.session.messages || []).filter((m: any) => m.role === "user").length;
      setCustomTurns(userTurns);
      setCustomStage(userTurns <= 2 ? "Pembuka" : userTurns <= 5 ? "Digali" : "Keberatan & Penutup");
      setTab("latihan");
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }
  async function sendChat() {
    if (!chatInput.trim() || !activeSession) return;
    setBusy(true);
    try {
      const r = await api(`/api/sessions/message?id=${activeSession.id}`, "POST", { content: chatInput, voice: lastVoice || undefined });
      setLastVoice(null);
      setChatInput("");
      if (r.engine) setLastEngine(r.engine);
      if (r.llmNotice) setLlmNotice(r.llmNotice); else setLlmNotice("");
      if (r.stage) setCustomStage(r.stage);
      if (typeof r.userTurns === "number") setCustomTurns(r.userTurns);
      const d = await api(`/api/sessions/detail?id=${activeSession.id}`); setSessionDetail(d.session);
      if (speakOn) { const last = (d.session.messages || []).filter((m: any) => m.role === "persona").pop(); if (last) speakText(String(last.content).replace(/^[^:]+:\s*/, "")); }
      if (r.maxReached) setMsg(`Kamu sudah memakai ${r.maxTurns} giliran — batas Roleplay Bebas. Akhiri sesi ini untuk melihat evaluasimu.`);
      else if (r.adaptation) setMsg(`Adaptasi: Level ${r.adaptation.fromLevel} → ${r.adaptation.toLevel}. ${r.adaptReason || ""}`);
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
              {authMode === "login" && !showForgot && (
                <p className="small" style={{ marginTop: 12 }}>
                  <button type="button" className="btn-ghost" onClick={() => { setShowForgot(true); setForgotEmail(authEmail); setForgotMsg(""); }}>Lupa password?</button>
                </p>
              )}
              {authMode === "login" && showForgot && (
                <form onSubmit={doForgot} style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <b>Reset password</b>
                  <p className="small">Masukkan email akunmu — tautan reset (berlaku 1 jam, sekali pakai) akan dikirim ke email itu.</p>
                  <label className="small">Email</label>
                  <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="nama@email.com" required />
                  {forgotMsg && <p className="small" style={{ marginTop: 8 }}>{forgotMsg}</p>}
                  {!emailConfigured && <p className="small" style={{ color: "var(--danger)" }}>Layanan email belum dipasang — hubungi pemilik aplikasi untuk reset manual.</p>}
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <button className="btn" type="submit" disabled={forgotBusy}>{forgotBusy ? "Mengirim…" : "Kirim Tautan Reset"}</button>
                    <button className="btn-ghost" type="button" onClick={() => setShowForgot(false)}>Batal</button>
                  </div>
                </form>
              )}
              <p className="small" style={{ marginTop: 12 }}>{authMode === "login" ? "Belum punya akun? Pindah ke tab Daftar dengan Email — akun baru langsung bisa mulai latihan." : "Sudah punya akun? Pindah ke tab Masuk."}</p>
            </div>
            <p className="small" style={{ marginTop: 12 }}>Mulai Latihan Gratis. Daftar dengan email dan passwordmu — password hanya disimpan sebagai hash, tidak pernah sebagai teks biasa. Data latihan hanya bisa dilihat oleh akunmu sendiri.</p>
          </section>
          <div className="grid g3">
            <div className="card"><b>Latih.</b><p className="small">Mulai dengan Tes Awal — 3 situasi singkat yang menunjukkan kelemahanmu — lalu ikuti Jalur Belajarmu: 3 skenario berurutan. Atau pilih 1 dari 24 skenario — wawancara kerja, hoax viral, pembeli sinis, negosiasi endorsement — dan hadapi persona AI yang menekan. Atau buat skenariomu sendiri di Roleplay Bebas, duplikasi skenario bawaan dengan &ldquo;Duplikasi &amp; Sesuaikan&rdquo;, dan simpan semuanya di Skenarioku — perpustakaan latihanmu sendiri, dengan pilar buatanmu (Pilarku).</p></div>
            <div className="card"><b>Dinilai.</b><p className="small">Evaluation Agent menilai dengan rubrik per skenario, tepat 3 kutipan bukti, 1 blind spot, dan 1 kalimat alternatif.</p></div>
            <div className="card"><b>Naik Level.</b><p className="small">Adaptation Engine level 1–5 naik saat kamu kuat, turun saat kamu kewalahan. Memorimu tersimpan dan dipakai di sesi berikutnya.</p></div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h2 style={{ marginTop: 0 }}>Semua Latihanmu, di Satu Layar</h2>
            <p className="small">Beranda menampilkan progres dan memori — dari data latihanmu sendiri. Belum ada sesi? Beranda akan jujur menampilkan keadaan kosong sampai kamu menyelesaikan satu sesi latihan.</p>
            <div className="grid g3">
              <div><div className="small">Skor rata-rata</div><div className="stat">—</div><p className="small">0 sesi selesai</p></div>
              <div><div className="small">Simulasi bulan ini</div><div className="stat">0</div><p className="small">Semua 24 skenario bisa dicoba.</p></div>
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
            <p><b>Berapa skenario yang bisa saya latih?</b><br /><span className="small">Semua 24 skenario di 4 pilar bisa dicoba — Interpersonal, PR/Krisis, Marketing &amp; Sales, dan Personal Branding — lengkap dengan Brand Audit dan Content Coach.</span></p>
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
            <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}><a href="/privasi" style={{ color: "#c7c5e0", fontSize: 13 }}>Kebijakan Privasi</a><a href="/syarat" style={{ color: "#c7c5e0", fontSize: 13 }}>Syarat Layanan</a><button className="btn" onClick={scrollToAuth}>Masuk</button></div>
          </div>
        </footer>
      </div>
    );
  }

  const shown = pillarFilter === "Semua" ? scenarios : scenarios.filter((s) => s.pillar === pillarFilter);
  return (
    <div>
      <header className="top">
        <img className="logo" src="/logo.webp" alt="Logo Phatica" />
        <div><div style={{ fontSize: 20, fontWeight: 800 }}>Phatica</div><div className="tagline">AI-Powered Strategic Communication Skills.</div></div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" onClick={() => setTab("skenario")}>Mulai Latihan</button>
          <span className="small">{user.name || user.email}</span>
          <button className="btn-ghost" onClick={doLogout}>Keluar</button>
        </div>
      </header>
      <div className="wrap">
        {msg && <div className="card" style={{ marginBottom: 12 }}><pre>{msg}</pre></div>}
        <div className="tabs">
          {[["beranda", "Beranda"], ["tes", "Tes Awal"], ["skenario", "Pilih Skenario"], ["skenarioku", "Skenarioku"], ["bebas", "Roleplay Bebas"], ["latihan", "Ruang Latihan"], ["memori", "Memori Saya"], ["branding", "Personal Branding"], ["laporan", "Laporan"]].map(([k, label]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); if (k === "laporan") loadReport(); if (k === "beranda") { loadDiag(); loadDrills(); } if (k === "skenarioku") loadLibrary(); }}>{label}</button>
          ))}
        </div>

        {tab === "beranda" && dash && (
          <div className="grid">
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Semua Latihanmu, di Satu Layar</h2>
              <p className="small">Komunikasi Strategis, Dilatih dengan Kecerdasan Buatan. Progres dan memori — dari data latihanmu sendiri, bukan data contoh.</p>
              <div style={{ marginTop: 12 }}><button className="btn-ghost" onClick={() => { loadReport(); setTab("laporan"); }}>Unduh / Cetak Laporan Perkembangan</button></div>
              <div className="grid g3">
                <div><b>Latih.</b><p className="small">24 skenario di 4 pilar.</p></div>
                <div><b>Dinilai.</b><p className="small">Laporan 5 bagian + tepat 3 kutipan bukti.</p></div>
                <div><b>Naik Level.</b><p className="small">Adaptasi level 1–5 dengan alasan tercatat.</p></div>
              </div>
            </div>
            <div className="grid g3">
              <div className="card"><div className="small">Skor rata-rata</div><div className="stat">{dash.progress.length ? Math.round(dash.progress.reduce((a, p) => a + (p.overall || 0), 0) / dash.progress.length) : "—"}</div><p className="small">{dash.progress.length} sesi selesai</p></div>
              <div className="card"><div className="small">Simulasi bulan ini</div><div className="stat">{dash.usedThisMonth}</div>
                <p className="small">Semua skenario bisa dicoba.</p></div>
              <div className="card"><div className="small">Sesi terakhir</div><p>{dash.memory?.lastRecap || "Belum ada sesi. Mulai dari Pilih Skenario."}</p></div>
            </div>
            <div className="card"><h3 style={{ marginTop: 0 }}>Tren skor</h3>
              {dash.progress.length === 0 ? <p className="small">Belum ada data — selesaikan satu sesi latihan dulu.</p> :
                dash.progress.map((p) => (<div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><span className="small" style={{ width: 220 }}>{p.scenarioId}</span><div className="bar" style={{ flex: 1 }}><div style={{ width: `${p.overall || 0}%` }} /></div><b>{p.overall}</b></div>))}
            </div>
            <div className="card"><h3 style={{ marginTop: 0 }}>Sesi terakhir</h3>
              {dash.recentSessions.length === 0 ? <p className="small">Belum ada sesi.</p> :
                dash.recentSessions.map((s) => (<div key={s.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span><b>{s.displayTitle || s.scenarioId}</b> · {s.pillar} · Level {s.level} · {s.status}{s.overall !== null ? ` · Skor ${s.overall}` : ""}</span>{s.customized ? <span className="badge warn">Disesuaikan olehmu</span> : s.customScenarioId ? <span className="badge info">Skenarioku</span> : s.customRoleplayId ? <span className="badge info">Roleplay Bebas</span> : <span className="badge info">Skenario asli</span>}{s.status === "active" && <button className="btn" disabled={busy} onClick={() => resumeSession(s)}>Lanjutkan sesi aktif →</button>}</div>))}
            </div>
          </div>
        )}

        {tab === "beranda" && (
          <div className="grid" style={{ marginTop: 12 }}>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Jalur Belajarmu</h3>
              {!diag ? (
                <div>
                  <p className="small">Kamu belum Tes Awal. Tes singkat 3 situasi ini menunjukkan di mana letak kelemahanmu — lalu Phatica menyusun 3 skenario latihan berurutan untukmu. Bisa dilewati, bisa diulang kapan saja.</p>
                  <button className="btn" onClick={() => setTab("tes")}>Ikuti Tes Awal (3 situasi)</button>
                </div>
              ) : (
                <div>
                  <p className="small"><b>Skor awalmu:</b> {diag.scores.map((sc: any) => `${sc.label} ${sc.score}`).join(" · ")}</p>
                  <p className="small"><b>Yang paling perlu dilatih:</b> {diag.weakest.map((w: string) => ({ bukti: "Bukti", struktur: "Struktur", empati: "Empati", ketegasan: "Ketegasan" } as any)[w] || w).join(" dan ")}</p>
                  <p className="small">Aturan &ldquo;sudah bisa&rdquo; yang jujur: skor ≥75 pada dimensi terlemahmu di 2 sesi — bukan janji lolos, tapi tanda kamu sudah konsisten.</p>
                  {diag.path.map((it: any, i: number) => (
                    <div key={it.scenarioId} style={{ padding: "8px 0", borderBottom: "1px solid #eee", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span><b>{i + 1}. {it.title}</b> <span className="small">— melatih {it.dimension}</span></span>
                      {it.done ? <span className="badge info">✓ Selesai</span> : <button className="btn" disabled={busy} onClick={() => { const sc = scenarios.find((x) => x.id === it.scenarioId); if (sc) startScenario(sc); }}>Mulai</button>}
                    </div>
                  ))}
                  <p className="small">Progres jalur: {diagDoneCount}/{diag.path.length} selesai. {diagDoneCount >= diag.path.length && diag.path.length > 0 ? "Jalur selesai — ambil Tes Ulang untuk melihat perkembanganmu." : ""}</p>
                  <button className="btn-ghost" onClick={() => setTab("tes")}>Tes Ulang</button>
                </div>
              )}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Latihan Hari Ini</h3>
              {drillsPending.length === 0 ? (
                <p className="small">{drillsDone.length === 0 ? "Belum ada latihan — selesaikan satu sesi dulu, latihan 2 menitnya akan muncul di sini besok." : "Tidak ada latihan yang menunggu. Bagus — latihan terakhirmu sudah selesai."}</p>
              ) : drillsPending.map((d) => (
                <div key={d.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <p className="small" style={{ margin: "0 0 6px" }}><b>Latihan 2 menit</b> — dari sesi terakhirmu. Blind spot: {d.blindSpot}</p>
                  <p style={{ margin: "0 0 8px" }}>{d.text}</p>
                  <textarea rows={2} value={drillAttempts[d.id] || ""} onChange={(e) => setDrillAttempts({ ...drillAttempts, [d.id]: e.target.value })} placeholder="Tulis jawaban latihanmu di sini…" />
                  <div style={{ marginTop: 8 }}><button className="btn" disabled={busy} onClick={async () => { setBusy(true); try { await api("/api/drills", "POST", { drillId: d.id, attempt: drillAttempts[d.id] || "" }); loadDrills(); setMsg("Latihan selesai — bagus, kamu menagih dirimu sendiri."); } catch (e: any) { setMsg(e.message); } setBusy(false); }}>Tandai Selesai</button></div>
                </div>
              ))}
              {drillsDone.length > 0 && (
                <p className="small" style={{ marginTop: 10 }}>✓ {drillsDone.length} latihan sudah selesai sejauh ini.</p>
              )}
              <p className="small">Latihan ini hanya ada di aplikasi — belum ada pengingat email.</p>
            </div>
          </div>
        )}

        {tab === "skenario" && (
          <div>
            <div className="tabs">{["Semua", ...PILLARS].map((p) => (<button key={p} className={pillarFilter === p ? "on" : ""} onClick={() => setPillarFilter(p)}>{p}</button>))}</div>
            <p className="small">{scenarios.length} skenario · Semua pilar bisa dicoba.</p>
            <div className="card" style={{ marginBottom: 12 }}>
              <label className="small">Cara bicara di sesi ini (berlaku untuk semua skenario &amp; Roleplay Bebas): </label>
              <select value={register} onChange={(e) => setRegister(e.target.value as "formal" | "santai")} style={{ marginLeft: 8 }}>
                <option value="santai">Santai — bahasa sehari-hari</option>
                <option value="formal">Formal — bahasa baku, sapaan &ldquo;Anda&rdquo;</option>
              </select>
            </div>
            <div className="grid g2">
              {shown.map((sc) => (
                <div key={sc.id} className="card">
                  <span className="tag">{sc.pillar}</span> <span className="badge info">Level dasar {sc.baseDifficulty}</span> <span className="badge warn">{sc.evaluatorMode}</span> <span className="badge info">Skenario asli</span>
                  <h3>{sc.title}</h3>
                  <p className="small">{sc.context}</p>
                  <p><b>{sc.personaName}</b> — {sc.personaRole}</p>
                  <p className="small">Tujuan: {sc.goal} · Durasi {sc.durationLabel}</p>
                  <details><summary className="small">Pelajaran 2 menit sebelum mulai</summary><p className="small">{sc.tip}</p></details>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn" disabled={busy} onClick={() => startScenario(sc)}>Mulai Latihan</button>
                    <button className="btn-ghost" disabled={busy} onClick={() => customizeScenario(sc)}>Duplikasi &amp; Sesuaikan</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "skenarioku" && (
          <div className="grid">
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Skenarioku — Perpustakaan Latihanmu</h2>
              <p className="small">Di sini kamu yang punya perpustakaan latihan: buat pilar sendiri (mis. “Kerja Kantorku”), lalu simpan skenario buatanmu di dalamnya. Skenario yang kamu simpan bisa dimainkan kapan saja, dengan rubrik penilaianmu sendiri. Hanya kamu yang bisa melihat skenario ini.</p>
              <p className="small"><b>{library.length}/{maxScenarios} skenario</b> · <b>{myPillars.length}/5 pilar buatanmu</b>{library.length >= maxScenarios ? " — sudah penuh, hapus satu dulu sebelum membuat yang baru." : ""}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn" disabled={busy || library.length >= maxScenarios} onClick={openWizardNew}>+ Buat Skenario</button>
                <button className="btn-ghost" disabled={busy || myPillars.length >= 5} onClick={() => { setEditingPillar(null); setPillarForm({ name: "", description: "", color: PILLAR_COLORS[0], icon: "chat" }); setShowPillarForm(!showPillarForm); }}>{showPillarForm ? "Tutup Form Pilar" : "+ Buat Pilar"}</button>
              </div>
              {library.length === 0 && !wizOpen && (
                <div className="card" style={{ background: "#f0fdfa", marginTop: 16 }}>
                  <b>Belum ada skenario buatanmu — mulai dari template, duplikasi skenario bawaan, atau buat dari nol.</b>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <button className="btn-ghost" onClick={() => setTab("bebas")}>Mulai dari template Roleplay Bebas</button>
                    <button className="btn-ghost" onClick={() => setTab("skenario")}>Duplikasi skenario bawaan</button>
                    <button className="btn" disabled={busy} onClick={openWizardNew}>Buat dari nol</button>
                  </div>
                </div>
              )}
              {showPillarForm && (
                <form onSubmit={savePillar} style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <h3 style={{ marginTop: 0 }}>{editingPillar ? `Edit Pilar "${editingPillar.name}"` : "Pilar Baru"}</h3>
                  <label className="small">Nama pilar (2–40 karakter)</label>
                  <input value={pillarForm.name} onChange={(e) => setPillarForm({ ...pillarForm, name: e.target.value })} placeholder="mis. Kerja Kantorku, Keluarga, Jualan Online" maxLength={40} />
                  <label className="small">Deskripsi (opsional, maks 200 karakter)</label>
                  <input value={pillarForm.description} onChange={(e) => setPillarForm({ ...pillarForm, description: e.target.value })} placeholder="Untuk latihan apa pilar ini?" maxLength={200} />
                  <label className="small">Warna</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 12px" }}>
                    {PILLAR_COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setPillarForm({ ...pillarForm, color: c })} aria-label={`Warna ${c}`} style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: pillarForm.color === c ? "3px solid #191641" : "1px solid #ddd", cursor: "pointer" }} />
                    ))}
                  </div>
                  <label className="small">Ikon</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 12px" }}>
                    {PILLAR_ICONS.map((ic) => (
                      <button key={ic} type="button" className={pillarForm.icon === ic ? "btn" : "btn-ghost"} onClick={() => setPillarForm({ ...pillarForm, icon: ic })}>{ic}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" type="submit" disabled={busy}>{editingPillar ? "Simpan Perubahan" : "Buat Pilar"}</button>
                    <button className="btn-ghost" type="button" onClick={() => { setShowPillarForm(false); setEditingPillar(null); }}>Batal</button>
                  </div>
                </form>
              )}
              {pillarDeleteTarget && (
                <div className="card" style={{ background: "#fef2f2", marginTop: 16 }}>
                  <b>Hapus pilar “{pillarDeleteTarget.name}”?</b>
                  <p className="small">Skenario di pilar ini <b>tidak dihapus</b> — semuanya dipindah ke pilar bawaan yang kamu pilih di bawah.</p>
                  <label className="small">Pindah skenario ke pilar:</label>
                  <select value={pillarDeleteFallback} onChange={(e) => setPillarDeleteFallback(e.target.value)}>
                    {PILLARS.map((p) => (<option key={p} value={p === "Interpersonal" ? "interpersonal" : p === "PR / Krisis" ? "pr-krisis" : p === "Marketing & Sales" ? "marketing-sales" : "personal-branding"}>{p}</option>))}
                  </select>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="btn-danger" disabled={busy} onClick={deletePillar}>Ya, Hapus Pilar</button>
                    <button className="btn-ghost" onClick={() => setPillarDeleteTarget(null)}>Batal</button>
                  </div>
                </div>
              )}
            </div>

            {wizOpen && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>{wiz.id ? `Edit Skenario — “${wiz.title}”` : "Buat Skenario — 3 Langkah"}</h3>
                <p className="small">Langkah {wiz.step} dari 3: {wiz.step === 1 ? "Siapa lawan bicaramu?" : wiz.step === 2 ? "Situasi & tujuanmu" : "Cara dinilai"}</p>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {[1, 2, 3].map((n) => (<div key={n} style={{ flex: 1, height: 6, borderRadius: 3, background: wiz.step >= n ? "#14B8A6" : "#e5e7eb" }} />))}
                </div>
                {wiz.step === 1 && (
                  <div>
                    <label className="small">Nama / panggilan lawan bicaramu</label>
                    <input value={wiz.personaName} onChange={(e) => setWiz({ ...wiz, personaName: e.target.value })} placeholder="mis. Atasan saya, Bu Ratna, Klien saya" />
                    <p className="small" style={{ color: "var(--danger)" }}>Gunakan peran umum (mis. &apos;atasan saya&apos;), bukan nama orang nyata yang bisa dikenali.</p>
                    <label className="small">Peran / hubungan</label>
                    <input value={wiz.personaRole} onChange={(e) => setWiz({ ...wiz, personaRole: e.target.value })} placeholder="mis. atasan, calon mertua, klien kecewa" />
                    <label className="small">Sifatnya</label>
                    <select value={wiz.trait} onChange={(e) => setWiz({ ...wiz, trait: e.target.value })}>
                      {TRAITS.map((t) => (<option key={t}>{t}</option>))}
                    </select>
                    <label className="small">Level tekanan (1–5)</label>
                    <select value={wiz.level} onChange={(e) => setWiz({ ...wiz, level: Number(e.target.value) })}>
                      {[1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n} — {n === 1 ? "Lunak" : n === 2 ? "Ringan" : n === 3 ? "Sedang" : n === 4 ? "Menekan" : "Sangat menekan"}</option>))}
                    </select>
                    <label className="small">Simpan di pilar</label>
                    <select value={wiz.pillarKey} onChange={(e) => setWiz({ ...wiz, pillarKey: e.target.value })}>
                      {PILLARS.map((p) => (<option key={p} value={p === "Interpersonal" ? "interpersonal" : p === "PR / Krisis" ? "pr-krisis" : p === "Marketing & Sales" ? "marketing-sales" : "personal-branding"}>{p} (bawaan)</option>))}
                      {myPillars.map((p: any) => (<option key={p.id} value={`custom:${p.id}`}>{p.name} (Pilarku)</option>))}
                    </select>
                  </div>
                )}
                {wiz.step === 2 && (
                  <div>
                    <label className="small">Judul skenario (3–80 karakter)</label>
                    <input value={wiz.title} onChange={(e) => setWiz({ ...wiz, title: e.target.value })} placeholder="mis. Minta Naik Gaji" maxLength={80} />
                    <label className="small">Situasi (2–3 kalimat, minimal 20 karakter)</label>
                    <textarea rows={3} value={wiz.situation} onChange={(e) => setWiz({ ...wiz, situation: e.target.value })} placeholder="Ceritakan apa yang terjadi, siapa saja yang terlibat, kenapa ini penting buatmu." />
                    <label className="small">Tujuanmu — apa yang mau kamu capai di akhir percakapan?</label>
                    <textarea rows={2} value={wiz.goal} onChange={(e) => setWiz({ ...wiz, goal: e.target.value })} placeholder="Contoh: mendapat kenaikan gaji yang wajar tanpa merusak hubungan." />
                    <label className="small">Kalimat pembuka (opsional — kosong = dibuat otomatis dari situasimu)</label>
                    <textarea rows={2} value={wiz.openingLine} onChange={(e) => setWiz({ ...wiz, openingLine: e.target.value })} placeholder="Apa yang dikatakan lawan bicaramu untuk membuka percakapan?" />
                    <div style={{ marginTop: 6 }}><button className="btn-ghost" type="button" onClick={() => {
                      try {
                        const card = personaCardForCustomScenario({ personaName: wiz.personaName || "Lawan bicaramu", personaRole: wiz.personaRole || "", trait: wiz.trait as any, situation: wiz.situation });
                        setWiz({ ...wiz, openingLine: card.opening });
                      } catch { setMsg("Isi dulu nama, sifat, dan situasimu supaya kalimat pembuka bisa dibuat."); }
                    }}>Buat kalimat pembuka otomatis dari situasiku</button></div>
                  </div>
                )}
                {wiz.step === 3 && !wizReview && (
                  <div>
                    <p className="small">Pilih <b>2–4 cara penilaian</b> — ini yang akan dinilai evaluator dari jawabanmu. Setiap cara penilaian sudah ada contohnya dalam bahasa sehari-hari.</p>
                    {RUBRIC_DIMENSION_LIBRARY.map((d) => {
                      const on = wiz.rubricKeys.includes(d.key);
                      return (
                        <label key={d.key} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                          <input type="checkbox" checked={on} onChange={() => {
                            const next = on ? wiz.rubricKeys.filter((k) => k !== d.key) : [...wiz.rubricKeys, d.key];
                            setWiz({ ...wiz, rubricKeys: next });
                          }} style={{ marginTop: 4 }} />
                          <span><b>{d.label}</b><br /><span className="small">{d.example}</span></span>
                        </label>
                      );
                    })}
                    <label className="small" style={{ marginTop: 12 }}>Dimensi penilaian tulisanmu sendiri (opsional, maks 1, maks 40 karakter)</label>
                    <input value={wiz.customDimension} onChange={(e) => setWiz({ ...wiz, customDimension: e.target.value })} placeholder="mis. Nada bicara yang hangat" maxLength={40} />
                    <p className="small">Dipilih: {wiz.rubricKeys.length + (wiz.customDimension.trim() ? 1 : 0)} dari 2–4.</p>
                  </div>
                )}
                {wiz.step === 3 && wizReview && (() => {
                  const card = (() => { try { return personaCardForCustomScenario({ personaName: wiz.personaName, personaRole: wiz.personaRole, trait: wiz.trait as any, situation: wiz.situation, openingLine: wiz.openingLine }); } catch { return null; } })();
                  const chosen = RUBRIC_DIMENSION_LIBRARY.filter((d) => wiz.rubricKeys.includes(d.key));
                  return (
                    <div className="card" style={{ background: "#f0fdfa" }}>
                      <h3 style={{ marginTop: 0 }}>Cek Terakhir — Kartu Persona &amp; Rubrik</h3>
                      <p><b>{card?.personaName}</b> — {card?.personaRole} · Sifat: {card?.trait}</p>
                      <p className="small"><b>Yang dia mau:</b> {card?.personaGoal}</p>
                      <p className="small"><b>Cara dia menekan:</b> {card?.pressureStyle}</p>
                      <p><b>Kalimat pembuka:</b> <i>“{card?.opening}”</i></p>
                      <p className="small"><b>Pilar:</b> {pillarLabelForKey(wiz.pillarKey, myPillars)} · <b>Level:</b> {wiz.level} · <b>Judul:</b> {wiz.title}</p>
                      <h3>Yang akan dinilai dari kamu</h3>
                      {chosen.map((d) => (<p key={d.key} className="small"><b>{d.label}</b> — {d.example}</p>))}
                      {wiz.customDimension.trim() && <p className="small"><b>{wiz.customDimension.trim()}</b> — dimensi tulisanmu sendiri.</p>}
                      <p className="small">Hanya kamu yang bisa melihat skenario ini. Sesi memakai tahap Pembuka → Digali → Keberatan &amp; Penutup, maks 12 giliran.</p>
                    </div>
                  );
                })()}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                  {wiz.step > 1 && !wizReview && <button className="btn-ghost" type="button" onClick={() => setWiz({ ...wiz, step: wiz.step - 1 })}>← Kembali</button>}
                  {wizReview && <button className="btn-ghost" type="button" onClick={() => setWizReview(false)}>← Kembali ke Cara Dinilai</button>}
                  {!wizReview && <button className="btn" type="button" disabled={busy} onClick={wizNext}>{wiz.step < 3 ? "Lanjut →" : "Lihat Review →"}</button>}
                  {wizReview && (<>
                    <button className="btn" type="button" disabled={busy} onClick={() => saveWizard(true)}>Simpan &amp; Mainkan</button>
                    <button className="btn-ghost" type="button" disabled={busy} onClick={() => saveWizard(false)}>Simpan saja</button>
                  </>)}
                  <button className="btn-ghost" type="button" onClick={() => { setWizOpen(false); setWizReview(false); }}>Batal</button>
                </div>
                <p className="small" style={{ marginTop: 10 }}>Hanya kamu yang bisa melihat skenario ini. Jangan memakai nama lengkap orang nyata + institusi aslinya sebagai persona — gunakan peran umum.</p>
              </div>
            )}

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Pilar Bawaan</h3>
              <p className="small">4 pilar ini bawaan Phatica — tidak bisa diubah atau dihapus. Skenario buatanmu juga bisa disimpan di sini.</p>
              {PILLARS.map((p) => {
                const key = p === "Interpersonal" ? "interpersonal" : p === "PR / Krisis" ? "pr-krisis" : p === "Marketing & Sales" ? "marketing-sales" : "personal-branding";
                const items = library.filter((s) => s.pillarKey === key);
                return (
                  <div key={key} style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
                    <b>{p}</b> <span className="badge info">bawaan</span> <span className="small">· {items.length} skenario buatanmu</span>
                    {items.map((s) => (
                      <div key={s.id} style={{ padding: "8px 0 8px 12px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span><b>{s.title}</b> — {s.personaName} · Level {s.level} · dimainkan {s.playCount}×</span>
                        <button className="btn" disabled={busy} onClick={() => startLibraryScenario(s.id)}>Mainkan</button>
                        <button className="btn-ghost" disabled={busy} onClick={() => openWizardEdit(s.id)}>Edit</button>
                        <button className="btn-ghost" disabled={busy} onClick={() => openWizardDuplicateLib(s)}>Duplikasi</button>
                        <button className="btn-ghost" disabled={busy} onClick={() => deleteLibraryScenario(s)}>Hapus</button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Pilarku</h3>
              {myPillars.length === 0 ? (
                <p className="small">Belum ada pilar buatanmu. Buat satu di atas — mis. “Kerja Kantorku” atau “Jualan Online” — supaya skenariomu punya rumah sendiri. Maksimal 5 pilar.</p>
              ) : myPillars.map((p: any) => {
                const items = library.filter((s) => s.pillarKey === `custom:${p.id}`);
                return (
                  <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
                    <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", background: p.color, verticalAlign: "middle", marginRight: 6 }} />
                    <b>{p.name}</b> <span className="small">· {p.icon}{p.description ? ` — ${p.description}` : ""}</span> <span className="small">· {items.length} skenario</span>
                    <span style={{ marginLeft: 8 }}>
                      <button className="btn-ghost" disabled={busy} onClick={() => { setEditingPillar(p); setPillarForm({ name: p.name, description: p.description || "", color: p.color, icon: p.icon }); setShowPillarForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                      <button className="btn-ghost" disabled={busy} onClick={() => { setPillarDeleteTarget(p); setPillarDeleteFallback("interpersonal"); }}>Hapus</button>
                    </span>
                    {items.map((s) => (
                      <div key={s.id} style={{ padding: "8px 0 8px 12px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span><b>{s.title}</b> — {s.personaName} · Level {s.level} · dimainkan {s.playCount}×</span>
                        <button className="btn" disabled={busy} onClick={() => startLibraryScenario(s.id)}>Mainkan</button>
                        <button className="btn-ghost" disabled={busy} onClick={() => openWizardEdit(s.id)}>Edit</button>
                        <button className="btn-ghost" disabled={busy} onClick={() => openWizardDuplicateLib(s)}>Duplikasi</button>
                        <button className="btn-ghost" disabled={busy} onClick={() => deleteLibraryScenario(s)}>Hapus</button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "bebas" && (
          <div className="grid">
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Roleplay Bebas — Skenario Buatanmu</h2>
              {customSource && (
                <div className="card" style={{ background: "#f0fdfa", marginBottom: 12 }}>
                  <b>Menyesuaikan skenario: {customSource.title}</b>
                  <p className="small" style={{ marginBottom: 0 }}>Form di bawah sudah terisi dari skenario aslinya. Ubah apa pun — nama, situasi (mis. ganti perusahaan/posisi yang dilamar), tujuan, level, sifat — lalu buat versimu. <button className="btn-ghost" type="button" onClick={() => { setCustomSource(null); setCustomForm({ personaName: "", personaRole: "", trait: "Skeptis", situation: "", goal: "", level: 3 }); setCustomPreview(null); }}>Batalkan penyesuaian, buat dari nol</button></p>
                </div>
              )}
              <p className="small">Tidak ada di 24 skenario? Buat sendiri: tulis siapa lawan bicaramu, situasinya, dan apa yang mau kamu capai. Phatica akan membuat kartu persona dan rubrik penilaiannya — kamu lihat dulu apa yang akan dinilai, baru mulai latihan. Maksimal 12 giliran bicara per sesi.</p>
              <p className="small">Ceritamu tersimpan di akunmu dan bisa dihapus lewat Hapus Semua Riwayat &amp; Memori.</p>
              <label className="small">Coba dulu dengan satu kalimat — ceritakan situasimu dengan bahasamu sendiri…</label>
              <textarea rows={2} value={oneSentence} onChange={(e) => setOneSentence(e.target.value)} placeholder="Contoh: Besok saya mau minta naik gaji ke atasan, tapi saya gugup karena tahun lalu ditolak." />
              <div style={{ marginTop: 8 }}><button className="btn-ghost" type="button" onClick={() => { if (oneSentence.trim()) { setCustomForm({ ...customForm, situation: oneSentence.trim() }); setMsg("Situasi sudah diisi dari kalimatmu — lengkapi nama, peran, dan tujuanmu di bawah."); } }}>Pakai kalimat ini sebagai situasi</button></div>
              <div style={{ marginTop: 16 }}>
                <div className="small" style={{ marginBottom: 6 }}>Sekali ketuk — isi seluruh form:</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {CUSTOM_TEMPLATES.map((t) => (
                    <button key={t.label} className="btn-ghost" type="button" onClick={() => { setCustomSource(null); setCustomForm({ personaName: t.personaName, personaRole: t.personaRole, trait: t.trait, situation: t.situation, goal: t.goal, level: t.level }); setCustomPreview(null); setMsg(`Template "${t.label}" sudah diisi — cek dan ubah seperlunya, lalu klik "Buat Skenario & Lihat Kartu Persona".`); }}>{t.label}</button>
                  ))}
                </div>
              </div>
              <form onSubmit={createCustom} style={{ marginTop: 16 }}>
                <h3>Bicara dengan siapa</h3>
                <label className="small">Nama / panggilan lawan bicaramu</label>
                <input value={customForm.personaName} onChange={(e) => setCustomForm({ ...customForm, personaName: e.target.value })} placeholder="mis. Atasan saya, Bu Ratna, Klien saya" />
                <p className="small" style={{ color: "var(--danger)" }}>Gunakan peran umum (mis. &apos;atasan saya&apos;), bukan nama orang nyata yang bisa dikenali.</p>
                <label className="small">Peran / hubungan</label>
                <input value={customForm.personaRole} onChange={(e) => setCustomForm({ ...customForm, personaRole: e.target.value })} placeholder="mis. atasan, calon mertua, klien kecewa" />
                <label className="small">Sifatnya</label>
                <select value={customForm.trait} onChange={(e) => setCustomForm({ ...customForm, trait: e.target.value })}>
                  {TRAITS.map((t) => (<option key={t}>{t}</option>))}
                </select>
                <h3 style={{ marginTop: 16 }}>Situasinya</h3>
                <textarea rows={3} value={customForm.situation} onChange={(e) => setCustomForm({ ...customForm, situation: e.target.value })} placeholder="Ceritakan dalam 2–3 kalimat — apa yang terjadi, siapa saja yang terlibat, kenapa ini penting buatmu. Minimal 20 karakter." />
                <h3 style={{ marginTop: 16 }}>Tujuanmu</h3>
                <textarea rows={2} value={customForm.goal} onChange={(e) => setCustomForm({ ...customForm, goal: e.target.value })} placeholder="Apa yang ingin kamu capai di akhir percakapan ini? Contoh: mendapat kenaikan gaji yang wajar tanpa merusak hubungan." />
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label className="small">Level tekanan (1–5)</label>
                    <select value={customForm.level} onChange={(e) => setCustomForm({ ...customForm, level: Number(e.target.value) })}>
                      {[1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n} — {n === 1 ? "Lunak" : n === 2 ? "Ringan" : n === 3 ? "Sedang" : n === 4 ? "Menekan" : "Sangat menekan"}</option>))}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label className="small">Durasi</label>
                    <p style={{ margin: "10px 0" }}>Sekitar 7–10 menit · maks 12 giliran</p>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}><button className="btn" type="submit" disabled={busy}>Buat Skenario &amp; Lihat Kartu Persona</button></div>
              </form>
            </div>

            {customPreview && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Kartu Persona — cek dulu sebelum mulai</h3>
                {customPreview.sourceScenarioId && <p><span className="badge warn">Disesuaikan olehmu</span> <span className="small">dari skenario: {customPreview.sourceTitle || customPreview.sourceScenarioId}</span></p>}
                <p><b>{customPreview.personaCard.personaName}</b> — {customPreview.personaCard.personaRole} · Sifat: {customPreview.personaCard.trait}</p>
                <p className="small"><b>Yang dia mau:</b> {customPreview.personaCard.personaGoal}</p>
                <p className="small"><b>Yang sebenarnya dia rasakan:</b> {customPreview.personaCard.hiddenAgenda}</p>
                <p className="small"><b>Cara dia menekan:</b> {customPreview.personaCard.pressureStyle}</p>
                <p><b>Kalimat pembuka:</b> <i>“{customPreview.personaCard.opening}”</i></p>
                <h3>Yang akan dinilai dari kamu</h3>
                {customPreview.rubric.map((r: any) => (
                  <p key={r.key} className="small"><b>{r.label}</b> ({Math.round(r.weight * 100)}%) — {r.rubric}</p>
                ))}
                <button className="btn" disabled={busy} onClick={() => startCustom(customPreview.id)}>{customPreview.sourceScenarioId ? "Mulai Sesi yang Disesuaikan" : "Mulai Sesi"}</button>
                <p className="small" style={{ marginTop: 10 }}>Kalau ada yang kurang pas, ubah form di atas dan buat lagi — kartu baru akan dibuat dari jawaban terbarumu.</p>
              </div>
            )}

            {myCustoms.length > 0 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Skenario buatanmu sebelumnya</h3>
                {myCustoms.map((c) => (
                  <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span><b>{c.personaCard.personaName}</b> — {c.personaCard.personaRole} · {c.trait} · Level {c.level}</span>
                    {c.customized ? <span className="badge warn">Disesuaikan olehmu</span> : <span className="badge info">Roleplay Bebas</span>}
                    <button className="btn" disabled={busy} onClick={() => startCustom(c.id)}>Mulai Latihan</button>
                  </div>
                ))}
              </div>
            )}
            <p className="small">Ada balasan persona yang tidak pantas? Tekan tombol Laporkan di bawah sesi (fitur lapor sedang disiapkan — untuk sekarang, akhiri sesi dan hapus riwayatmu bila perlu). Roleplay Bebas memakai penyaring kata otomatis, tapi tidak bisa mengenali semua nama orang nyata — karena itu selalu gunakan peran umum, bukan nama asli seseorang.</p>
          </div>
        )}

        {tab === "tes" && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Tes Awal — 3 situasi singkat</h2>
            <p className="small">Jawab seperti kamu mengatakannya langsung — tidak ada jawaban benar atau salah. Skor dihitung dengan cara yang sama seperti evaluator (dari kata-kata jawabanmu), jadi angka ini bisa dibandingkan dengan skor sesimu nanti. Tes ini bisa diulang kapan saja; yang dipakai adalah hasil terbaru.</p>
            <form onSubmit={submitDiagnostic}>
              {["Perkenalkan dirimu", "Tolak permintaan", "Tanggapi orang yang kecewa"].map((title, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <h3>{i + 1}. {title}</h3>
                  <p className="small">{[
                    "Bayangkan kamu di depan pewawancara kerja. Perkenalkan dirimu dan ceritakan kenapa kamu layak dipilih — dalam 3–5 kalimat.",
                    "Seorang teman dekat minta kamu meminjamkan uang dalam jumlah besar, padahal kamu sedang tidak bisa. Tolak permintaannya tanpa merusak hubungan — tulis jawabanmu seperti kamu mengatakannya langsung.",
                    "Seseorang yang kamu sayangi kecewa karena kamu membatalkan janji penting. Tanggapi kekecewaannya — tulis apa yang akan kamu katakan padanya.",
                  ][i]}</p>
                  <textarea rows={3} value={diagAnswers[i]} onChange={(e) => { const a = [...diagAnswers]; a[i] = e.target.value; setDiagAnswers(a); }} placeholder="Tulis jawabanmu di sini… (minimal 10 karakter)" />
                </div>
              ))}
              <button className="btn" type="submit" disabled={busy}>Lihat Hasil &amp; Jalur Belajarku</button>
            </form>
            {diag && (
              <div style={{ marginTop: 16 }}>
                <h3>Hasil Tes Awal terakhirmu</h3>
                <p className="small"><b>Skor:</b> {diag.scores.map((sc: any) => `${sc.label} ${sc.score}`).join(" · ")}</p>
                <p className="small"><b>Yang paling perlu dilatih:</b> {diag.weakest.map((w: string) => ({ bukti: "Bukti", struktur: "Struktur", empati: "Empati", ketegasan: "Ketegasan" } as any)[w] || w).join(" dan ")}</p>
                <p className="small"><b>Jalur belajarmu:</b> {diag.path.map((it: any, i: number) => `${i + 1}. ${it.title} (${it.dimension})`).join(" → ")}</p>
                <button className="btn" onClick={() => setTab("beranda")}>Lihat Jalur di Beranda</button>
              </div>
            )}
          </div>
        )}

        {tab === "laporan" && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Laporan Perkembangan</h2>
            {!report ? <p className="small">Memuat…</p> : !report.hasData ? (
              <p>Belum ada data — selesaikan Tes Awal dan 1 sesi dulu, laporanmu akan muncul di sini.</p>
            ) : (
              <div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <button className="btn" onClick={() => window.print()}>Cetak / Simpan sebagai PDF</button>
                  <button className="btn-ghost" onClick={() => {
                    const lines = [
                      "Laporan Perkembangan — Phatica",
                      `Total sesi selesai: ${report.totalSessions}`,
                      report.baseline ? `Skor awal (Tes Awal): ${report.baseline.map((s: any) => `${s.label} ${s.score}`).join(", ")}` : "Belum ada Tes Awal.",
                      `Skor sekarang (rata-rata 3 sesi terakhir): ${Object.entries(report.now).map(([k, v]) => `${k} ${v}`).join(", ") || "-"}`,
                      `Tren skor: ${report.trend.map((t: any) => t.overall).join(" → ") || "-"}`,
                      `Kekuatan: ${report.strengths || "-"}`,
                      `Kelemahan berulang: ${report.weaknesses || "-"}`,
                      report.voice ? `Suara: ${report.voice.turns} jawaban suara, kecepatan ${report.voice.paceWpm} kata/menit, ${report.voice.fillers} kata pengisi.` : "Belum ada jawaban suara.",
                      `Progres jalur belajar: ${report.pathDone}/${report.pathTotal}`,
                    ].join("\n");
                    navigator.clipboard?.writeText(lines).then(() => setMsg("Ringkasan sudah disalin."));
                  }}>Salin Ringkasan</button>
                  <button className="btn-ghost" onClick={loadReport}>Muat Ulang</button>
                </div>
                {report.baseline && (
                  <div>
                    <h3>Tes Awal vs Sekarang</h3>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr><th style={{ textAlign: "left" }}>Dimensi</th><th style={{ textAlign: "left" }}>Awal</th><th style={{ textAlign: "left" }}>Sekarang</th></tr></thead>
                      <tbody>
                        {report.baseline.map((b: any) => {
                          const keyMap: any = { Bukti: "bukti", Struktur: "struktur", Empati: "empati", Ketegasan: "ketegasan" };
                          const nowV = report.now[keyMap[b.label]];
                          return (<tr key={b.key}><td>{b.label}</td><td>{b.score}</td><td>{nowV !== undefined ? nowV : "—"}</td></tr>);
                        })}
                      </tbody>
                    </table>
                    <p className="small">Skor &ldquo;sekarang&rdquo; adalah rata-rata per dimensi dari 3 evaluasi terakhir. Dimensi yang tidak muncul di 3 sesi terakhir ditandai —.</p>
                  </div>
                )}
                <p><b>Total sesi selesai:</b> {report.totalSessions}</p>
                <p><b>Tren skor (3 terakhir):</b> {report.trend.length ? report.trend.map((t: any) => `${t.overall} (${t.title})`).join(" → ") : "—"}</p>
                <p><b>Kekuatan:</b> {report.strengths || "—"}</p>
                <p><b>Kelemahan berulang:</b> {report.weaknesses || "—"}</p>
                {report.lastRecap && <p><b>Rekap terakhir:</b> {report.lastRecap}</p>}
                <p><b>Progres jalur belajar:</b> {report.pathDone}/{report.pathTotal} selesai</p>
                {report.voice && <p><b>Suara:</b> {report.voice.turns} jawaban suara, kecepatan rata-rata {report.voice.paceWpm} kata/menit, {report.voice.fillers} kata pengisi. Diukur dari transkripsi browser, bukan analisis audio.</p>}
                <p className="small">Laporan ini dihitung dari data latihanmu sendiri. Skor adalah panduan belajar, bukan penilaian profesional.</p>
              </div>
            )}
          </div>
        )}

        {tab === "latihan" && (
          <div>
            {!sessionDetail ? <div className="card"><p>Belum ada sesi aktif. Pilih skenario dulu di tab <b>Pilih Skenario</b>.</p></div> : (
              <div className="grid">
                <div className="card">
                  <b>{activeSession?.scenario?.title || sessionDetail.scenarioId}</b> · Level {sessionDetail.level} · Status {sessionDetail.status}
                  {(activeSession?.customRoleplay?.sourceScenarioId || sessionDetail.customRoleplay?.sourceScenarioId) && <span> <span className="badge warn">Disesuaikan olehmu</span></span>}
                  {customStage && (
                    <span> · <span className="badge info">Tahap: {customStage}</span>{(activeSession?.isCustom || sessionDetail.customRoleplay) && <span> <span className="badge warn">Giliran {customTurns}/12</span></span>}</span>
                  )}
                  <p className="small">{activeSession?.scenario?.goal || ""}</p>
                  <p className="small">Mode evaluator: {activeSession?.scenario?.evaluatorMode || ""} · Rubrik: {(activeSession?.scenario?.rubric || []).map((r: any) => r.label).join(", ")}</p>
                  {lastEngine && (
                    <p className="small">Mesin yang menjawab barusan: <b>{lastEngine === "openai" ? "OpenAI (GPT-4o-mini)" : "Rule-based persona (tanpa kunci LLM)"}</b> — tanpa kunci, persona menjawab dari bank keberatan per sifat; dengan kunci, jawabannya jauh lebih hidup.</p>
                  )}
                  {llmNotice && (
                    <p className="small" style={{ background: "#fef3c7", padding: "8px 10px", borderRadius: 8 }}>{llmNotice}</p>
                  )}
                </div>
                {activeSession?.scenario?.tip && sessionDetail.status === "active" && (
                  <div className="card" style={{ background: "#f0fdfa" }}>
                    <b>Pelajaran 2 menit sebelum mulai</b>
                    <p className="small" style={{ marginBottom: 6 }}>{activeSession.scenario.tip}</p>
                    <details><summary className="small">Lihat contoh jawaban yang bagus</summary><p className="small"><i>“{activeSession.scenario.modelAnswer}”</i></p><p className="small">Kenapa bagus: ada bukti dan angka, strukturnya jelas, dan ditutup dengan langkah berikutnya — bukan sekadar klaim.</p></details>
                  </div>
                )}
                <div className="chat">
                  {(sessionDetail.messages || []).map((m: any, i: number) => (<div key={i} className={`msg ${m.role === "user" ? "user" : "persona"}`}><pre>{m.content}</pre></div>))}
                </div>
                {sessionDetail.status === "active" && (
                  <div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-ghost" type="button" disabled={busy} onClick={toggleMic} title="Bicara lewat mikrofon — transkripsi di browser, audio tidak diunggah" aria-label={voiceOn ? "Berhenti bicara" : "Bicara lewat mikrofon"}>{voiceOn ? "■ Berhenti Bicara" : "🎤 Bicara"}</button>
                      <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }} placeholder="Tulis jawabanmu di sini… atau tekan 🎤 Bicara" />
                      <button className="btn" disabled={busy} onClick={sendChat}>Kirim</button>
                      <button className="btn-ghost" disabled={busy} onClick={endSession}>Akhiri &amp; Evaluasi</button>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                      <label className="small"><input type="checkbox" checked={speakOn} onChange={(e) => { setSpeakOn(e.target.checked); if (!e.target.checked && "speechSynthesis" in window) window.speechSynthesis.cancel(); }} /> Dengarkan balasan persona (suara, id-ID)</label>
                      <span className="small">{voiceSupported ? "Mikrofon didukung browser ini." : "Browser ini belum mendukung input suara — ketik jawabanmu."}</span>
                    </div>
                    {voiceMsg && <p className="small" style={{ marginTop: 6 }}>{voiceMsg}</p>}
                    {lastVoice && <p className="small" style={{ marginTop: 6 }}>Jawaban suaramu siap dikirim — durasi bicara {Math.round(lastVoice.durationSec)} detik. Kecepatan dan kata pengisi akan dihitung dari transkripsi saat kamu tekan Kirim.</p>}
                    <p className="small" style={{ marginTop: 6 }}>Suara tidak direkam atau diunggah — yang dikirim hanya teks hasil transkripsi dan metriknya (durasi, kecepatan, kata pengisi).</p>
                    {(activeSession?.isCustom || sessionDetail.customRoleplay || sessionDetail.customScenario) && (
                      <p className="small" style={{ marginTop: 8 }}>{activeSession?.customScenario || sessionDetail.customScenario ? "Skenarioku" : "Roleplay Bebas"}: giliran {customTurns}/12 · Tahap: {customStage || "Pembuka"}. Kalau sudah 12 giliran, akhiri sesi untuk melihat evaluasimu.</p>
                    )}
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
                  const sharp = (() => { try { return JSON.parse(ev.sharpened || "null"); } catch { return null; } })();
                  return (
                    <div className="card">
                      <h3 style={{ marginTop: 0 }}>Hasil Evaluasi — Skor {ev.overall}</h3>
                      <p><b>Putusan:</b> {ev.verdict}</p>
                      {scores.map((s: any) => (<div key={s.key} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><span className="small" style={{ width: 220 }}>{s.label}</span><div className="bar" style={{ flex: 1 }}><div style={{ width: `${s.score}%` }} /></div><b>{s.score}</b></div>))}
                      <p><b>3 bukti kutipan:</b></p>
                      <ol>{quotes.map((q: string, i: number) => (<li key={i}><i>“{q}”</i></li>))}</ol>
                      <p><b>1 blind spot:</b> {ev.blindSpot}</p>
                      <p><b>Kalimat alternatif:</b> {ev.alternative}</p>
                      {sharp && (
                        <div style={{ background: "#f0fdfa", padding: 10, borderRadius: 8, margin: "10px 0" }}>
                          <b>Kalimatmu vs Versi yang Lebih Tajam</b>
                          <p className="small">Kalimatmu: <i>“{sharp.original}”</i></p>
                          <p className="small">Versi yang lebih tajam: <i>“{sharp.sharpened}”</i></p>
                          <p className="small">Kenapa lebih tajam: {sharp.why}</p>
                          <p className="small">Bagian dalam [ ... ] sengaja kosong — isi dengan contoh dan angka dari pengalamanmu sendiri, jangan dikarang.</p>
                        </div>
                      )}
                      {activeSession?.scenario?.modelAnswer && (
                        <p><b>Contoh jawaban yang bagus untuk skenario ini:</b> <i>“{activeSession.scenario.modelAnswer}”</i></p>
                      )}
                      {ev.voiceSummary && <p><b>Suara:</b> {ev.voiceSummary}</p>}
                      {ev.drillStatus && ev.drillStatus !== "tidak ada" && <p className="small">Latihan 2 menit kemarin: <b>{ev.drillStatus === "selesai" ? "selesai ✓" : "belum dikerjakan"}</b> — latihanmu hari ini ada di Beranda.</p>}
                      {ev.register && <p className="small">Sesi ini memakai register: <b>{ev.register === "formal" ? "Formal" : "Santai"}</b></p>}
                      <p><b>Latihan 2 menit:</b> {ev.drill}</p>
                      <p><b>Perbandingan:</b> {ev.comparison}</p>
                      {ev.patterns && <p><span className="badge bad">Pola berbahaya: {ev.patterns}</span></p>}
                      {ev.recurring && <p className="small">Kelemahan berulang dari memori: {ev.recurring}</p>}
                      <details><summary className="small">Jejak tool evaluator (bisa diperiksa)</summary>
                        <pre className="small">{JSON.stringify(trace, null, 2)}</pre>
                      </details>
                      {sessionDetail.customRoleplay && !sessionDetail.customScenarioId && (
                        <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
                          <b>Simpan sesi ini sebagai skenario?</b>
                          <p className="small">Roleplay Bebas ini bisa disimpan ke Skenarioku supaya bisa dimainkan lagi kapan saja, dengan rubrik yang sama.</p>
                          <button className="btn-ghost" disabled={busy} onClick={saveRoleplayAsScenario}>Simpan sebagai skenario</button>
                          {saveFromRoleplayMsg && (
                            <p className="small" style={{ marginTop: 8 }}>{saveFromRoleplayMsg} <button className="btn-ghost" type="button" onClick={() => { loadLibrary(); setTab("skenarioku"); }}>Lihat di Skenarioku →</button></p>
                          )}
                        </div>
                      )}
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

        {tab === "memori" && (
          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Ganti Password</h3>
            <form onSubmit={doChangePassword}>
              <label className="small">Password lama</label>
              <input type="password" value={cpCurrent} onChange={(e) => setCpCurrent(e.target.value)} placeholder="Password yang sekarang" required />
              <label className="small">Password baru (minimal 8 karakter)</label>
              <input type="password" value={cpNew} onChange={(e) => setCpNew(e.target.value)} placeholder="Minimal 8 karakter" required minLength={8} />
              <label className="small">Ulangi password baru</label>
              <input type="password" value={cpConfirm} onChange={(e) => setCpConfirm(e.target.value)} placeholder="Ulangi password baru" required minLength={8} />
              {cpMsg && <p className="small" style={{ marginTop: 8 }}>{cpMsg}</p>}
              <div style={{ marginTop: 10 }}><button className="btn" type="submit" disabled={cpBusy}>{cpBusy ? "Memproses…" : "Simpan Password Baru"}</button></div>
              <p className="small" style={{ marginTop: 8 }}>Setelah ganti password, sesi di perangkat lain akan diakhiri — perangkat ini tetap masuk.</p>
            </form>
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

      </div>
      <footer className="foot">
        <div className="wrap" style={{ padding: 0, display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <img className="logo" src="/logo.webp" alt="Logo Phatica" />
          <div><div style={{ fontSize: 20, fontWeight: 800 }}>Phatica</div><div style={{ fontSize: 13, opacity: .85 }}>AI-Powered Strategic Communication Skills.</div><p className="small" style={{ color: "#c7c5e0" }}>Komunikasi Strategis, Dilatih dengan Kecerdasan Buatan.</p><p className="small"><a href="/privasi" style={{ color: "#c7c5e0" }}>Kebijakan Privasi</a> · <a href="/syarat" style={{ color: "#c7c5e0" }}>Syarat Layanan</a></p></div>
        </div>
      </footer>
    </div>
  );
}
