/**
 * Passwortschutz fuer die ganze Anwendung.
 *
 * Hiess bis Next 16 "middleware.ts" mit einer Funktion "middleware" - seit
 * 16.0 ist beides veraltet und heisst "proxy". Inhaltlich aendert sich nichts:
 * derselbe matcher, dieselbe Pruefung, und die Node.js-Runtime galt hier schon
 * vorher (Next behandelte die Datei intern bereits als Proxy).
 */
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isValidCookie } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (await isValidCookie(cookie)) {
    return NextResponse.next();
  }
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Alles außer Login-Seite/-API, Next-interne Assets und öffentliche statische Dateien.
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|fonts/|stock-photos/|brand/|sample-data/).*)",
  ],
};
