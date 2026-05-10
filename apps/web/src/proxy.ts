import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/settings", "/library"];
const AUTH_ONLY_PATHS = ["/auth"];
const COOKIE_NAME = "yaminabe_session";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !token) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // /authページの認証済みリダイレクトはpage.tsx側で行う
  // proxy.tsではCookieの存在しか確認できず、DBセッション期限切れ時にループする

  return NextResponse.next();
}

export const config = {
  matcher: ["/settings/:path*", "/library/:path*"],
};
