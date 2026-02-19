import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();

  // List clients by account role (User.role === CLIENT), not by ClientProfile existence
  const usersWithRoleClient = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  const data = await Promise.all(
    usersWithRoleClient.map(async (user) => {
      // Ensure a ClientProfile exists so attendance and other features can reference it
      const profile = await prisma.clientProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
        select: { id: true },
      });
      return {
        id: profile.id,
        name: user.name,
        email: user.email,
      };
    }),
  );

  return NextResponse.json({ data });
}
