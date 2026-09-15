import { NextRequest, NextResponse } from "next/server";

// Pasife alınmış veya silinmiş kullanıcının çerezini temizleyip giriş sayfasına yollar.
// proxy.ts /api yollarını kontrol etmediği için geçerli çerezle döngüye girmez.
export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/giris", req.url));
  response.cookies.delete("session");
  return response;
}
