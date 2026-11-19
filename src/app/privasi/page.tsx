import Link from "next/link";

export const metadata = { title: "Kebijakan Privasi — Phatica" };

export default function Privasi() {
  return (
    <div>
      <header className="top">
        <img className="logo" src="/logo.webp" alt="Logo Phatica" />
        <div><div style={{ fontSize: 20, fontWeight: 800 }}>Phatica</div><div className="tagline">AI-Powered Strategic Communication Skills.</div></div>
        <div style={{ marginLeft: "auto" }}><Link className="btn" href="/">Kembali ke Beranda</Link></div>
      </header>
      <div className="wrap">
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Kebijakan Privasi</h1>
          <p className="small">Terakhir diperbarui: November 2026.</p>
          <h3>Data apa yang kami simpan</h3>
          <p>Kami menyimpan data yang kamu isi sendiri: nama dan email akunmu, password dalam bentuk hash (bukan teks biasa), riwayat sesi latihan dan transkripnya, memori belajar (kekuatan dan kelemahan berulang), Profil Brand, hasil Tes Awal dan jalur belajarmu, serta latihan 2 menit yang kamu kerjakan.</p>
          <h3>Umpan balik</h3>
          <p>Rating dan komentarmu hanya bisa dilihat oleh pemilik aplikasi dan oleh kamu sendiri — bukan oleh pengguna lain. Pemilik melihatnya lewat tab khusus yang hanya muncul di akun pemilik.</p>
          <h3>Data suara</h3>
          <p>Suara kamu tidak pernah direkam atau diunggah ke server kami. Saat kamu memakai tombol mikrofon, yang terjadi adalah transkripsi di browser kamu sendiri — hanya teks hasil transkripsi dan metriknya (durasi, kecepatan kata per menit, jumlah kata pengisi) yang dikirim ke server. Audio tidak pernah meninggalkan perangkatmu.</p>
          <h3>Siapa yang bisa melihat datamu</h3>
          <p>Hanya akunmu sendiri. Data latihan terisolasi per akun dan tidak dibagikan ke pengguna lain. Kami tidak menjual data kamu ke pihak mana pun.</p>
          <h3>Menghapus datamu</h3>
          <p>Kamu bisa menghapus semua riwayat latihan, evaluasi, memori, dan Profil Brand kapan saja lewat tombol &ldquo;Hapus Semua Riwayat &amp; Memori&rdquo; di Pengaturan &amp; Profil.</p>
          <h3>Penilaian AI</h3>
          <p>Skor dan saran dari Phatica adalah panduan latihan yang dihitung dari transkrip jawabanmu — bukan penilaian profesional, sertifikasi, atau keputusan rekrutmen. Gunakan hasilnya sebagai bahan belajar, bukan sebagai vonis atas kemampuanmu.</p>
          <h3>Pembayaran</h3>
          <p>Saat ini belum ada pembayaran sungguhan di Phatica. Kalau nanti ada paket berbayar, pembayarannya akan dijelaskan di halaman paket sebelum kamu membayar.</p>
          <h3>Kontak dukungan</h3>
          <p>Saluran dukungan resmi Phatica masih diputuskan oleh pemilik aplikasi. Halaman ini akan diperbarui begitu salurannya tersedia.</p>
        </div>
      </div>
      <footer className="foot">
        <div className="wrap" style={{ padding: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Phatica</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>AI-Powered Strategic Communication Skills.</div>
        </div>
      </footer>
    </div>
  );
}
