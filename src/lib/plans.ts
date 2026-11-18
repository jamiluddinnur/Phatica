// Paket langganan Phatica.ai — HARGA SAMA di ruang Muse dan standalone.
// Pembayaran masih SIMULASI: tidak ada transaksi nyata sampai Midtrans live dipasang.
// Matikan sementara saat tombol langganan disembunyikan — ubah ke true saat tombol langganan dipasang lagi.
// Saat false: batas kuota Free dan batas pilar paket TIDAK ditegakkan di POST /api/sessions,
// jadi semua pengguna bisa berlatih semua pilar tanpa paywall.
export const SUBSCRIPTIONS_ENABLED = false;
export const PLANS = {
  free: {
    name: "Free", monthly: 0, annualMonthly: 0, annualTotal: 0,
    desc: "Coba dulu: 3 simulasi/bulan, 1 pilar (Interpersonal), evaluasi dasar.",
    features: ["3 simulasi / bulan", "Pilar Interpersonal saja", "Evaluasi dasar", "Tanpa Brand Audit & Content Coach"],
    limitMonthly: 3, pillars: ["Interpersonal"],
  },
  pro: {
    name: "Pro", monthly: 99000, annualMonthly: 79200, annualTotal: 950400,
    desc: "Latihan tanpa batas harian, semua 5 pilar, evaluasi lengkap + riwayat progres, Brand Audit dan Content Coach.",
    features: ["Simulasi tanpa batas harian", "Semua 5 pilar", "Evaluasi lengkap + riwayat progres", "Brand Audit & Content Coach", "Mode evaluator Jujur Keras / Supportif / Detail Teknis"],
    limitMonthly: Infinity, pillars: ["Interpersonal", "PR / Krisis", "Marketing & Sales", "Personal Branding", "Public Speaking"],
  },
  tim: {
    name: "Tim / Institusi", monthly: 1500000, annualMonthly: 1500000, annualTotal: 18000000,
    desc: "Semua fitur Pro untuk satu tim (sampai 10 anggota), dashboard admin, laporan progres anggota, skenario custom.",
    features: ["Semua fitur Pro", "Sampai 10 anggota per tim", "Dashboard admin", "Laporan progres anggota", "Skenario custom"],
    limitMonthly: Infinity, pillars: ["Interpersonal", "PR / Krisis", "Marketing & Sales", "Personal Branding", "Public Speaking"],
  },
} as const;
export type PlanKey = keyof typeof PLANS;
export const TRIAL_DAYS = 14;
export const fmtRp = (n: number) => "Rp" + n.toLocaleString("id-ID");
