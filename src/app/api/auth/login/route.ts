import { NextResponse } from "next/server";
import { loginWithEmail } from "@/lib/auth";

// POST /api/auth/login — masuk dengan email + password.
// Password salah atau email tidak terdaftar → 401.
export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");
  if (!cleanEmail || !cleanPassword) {
    return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  }
  const user = await loginWithEmail(cleanEmail, cleanPassword);
  if (!user) {
    return NextResponse.json({ error: "Email atau password salah. Coba lagi." }, { status: 401 });
  }
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
