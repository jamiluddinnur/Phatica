import Link from "next/link";

export const metadata = { title: "Syarat Layanan — Phatica" };

export default function Syarat() {
  return (
    <div>
      <header className="top">
        <img className="logo" src="/logo.webp" alt="Logo Phatica" />
        <div><div style={{ fontSize: 20, fontWeight: 800 }}>Phatica</div><div className="tagline">AI-Powered Strategic Communication Skills.</div></div>
        <div style={{ marginLeft: "auto" }}><Link className="btn" href="/">Kembali ke Beranda</Link></div>
      </header>
      <div className="wrap">
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Syarat Layanan</h1>
          <p className="small">Terakhir diperbarui: November 2026.</p>
          <h3>Apa itu Phatica</h3>
          <p>Phatica adalah platform latihan komunikasi berbasis simulasi roleplay dengan AI. Kamu berlatih menjawab lawan bicara, lalu menerima penilaian dan latihan lanjutan. Phatica bukan pengganti pelatih manusia, terapis, konselor, atau penasihat hukum.</p>
          <h3>Akunmu</h3>
          <p>Kamu bertanggung jawab menjaga kerahasiaan passwordmu. Akun hanya boleh dipakai oleh pemiliknya. Kami berhak menonaktifkan akun yang dipakai untuk menyalahgunakan layanan.</p>
          <h3>Penggunaan yang tidak diperbolehkan</h3>
          <p>Dilarang memakai Phatica untuk: meniru orang nyata yang bisa dikenali tanpa izin; latihan yang bertujuan menipu, memanipulasi, atau melecehkan orang lain; konten romantis atau seksual; ujaran kebencian; dan aktivitas apa pun yang melanggar hukum. Roleplay Bebas memakai penyaring kata otomatis, tapi tanggung jawab atas isi yang kamu tulis tetap ada padamu.</p>
          <h3>Hasil latihan</h3>
          <p>Skor, putusan, dan saran di Phatica adalah panduan belajar yang dihitung dari transkrip jawabanmu. Hasil itu tidak menjamin kamu lolos wawancara, diterima kerja, atau berhasil dalam negosiasi apa pun.</p>
          <h3>Ketersediaan layanan</h3>
          <p>Kami berusaha menjaga Phatica tetap bisa diakses, tapi layanan bisa terganggu sesekali karena pemeliharaan atau masalah di luar kendali kami. Fitur bisa berubah atau ditambah seiring pengembangan — termasuk harga dan paket, yang akan diumumkan sebelum berlaku.</p>
          <h3>Pembayaran</h3>
          <p>Saat ini semua fitur di Phatica bisa dipakai tanpa pembayaran, dan belum ada transaksi sungguhan. Kalau nanti ada paket berbayar, syarat pembayaran dan pengembaliannya akan ditulis jelas di halaman paket.</p>
          <h3>Perubahan syarat</h3>
          <p>Syarat ini bisa diperbarui. Perubahan besar akan kami sampaikan di dalam aplikasi.</p>
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
