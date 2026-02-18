import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as "ADMIN" | "CLIENT" | "COACH" | undefined;

    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/auth/sign-in", req.url));
    }

    if (pathname.startsWith("/client") && role !== "CLIENT") {
      return NextResponse.redirect(new URL("/auth/sign-in", req.url));
    }

    if (pathname.startsWith("/coach") && role !== "COACH") {
      return NextResponse.redirect(new URL("/auth/sign-in", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: ["/admin/:path*", "/client/:path*", "/coach/:path*"],
};

