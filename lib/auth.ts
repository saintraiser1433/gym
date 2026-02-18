import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Role } from "@/lib/generated/prisma";

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getAuthSession();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireRole(required: Role | Role[]) {
  const session = await requireAuth();
  const allowedRoles = Array.isArray(required) ? required : [required];
  const role = (session.user as any).role as Role | undefined;

  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Forbidden");
  }

  return session;
}

export async function requireAdmin() {
  return requireRole("ADMIN");
}

export async function requireClient() {
  return requireRole("CLIENT");
}

export async function requireCoach() {
  return requireRole("COACH");
}

export function redirectToSignIn(req: NextRequest) {
  const url = new URL("/auth/sign-in", req.url);
  url.searchParams.set("callbackUrl", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

