import { NextResponse } from "next/server";

// Public entry points. A signed-in visitor hitting one of these is redirected
// to their dashboard at the EDGE — before the page renders — so there's no
// flash of the landing/login page on reopen. Auth state can't be read from
// localStorage here, so we rely on the lightweight `wolf_home` cookie set at
// login (see lib/utils.setAuthCookie). It holds only the role's home path.
const PUBLIC_ENTRY = new Set(["/", "/login", "/register"]);

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const home = request.cookies.get("wolf_home")?.value;

  if (home && PUBLIC_ENTRY.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = decodeURIComponent(home) || "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register"],
};
