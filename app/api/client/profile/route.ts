import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

/** GET: logged-in client's profile + coach-set nutrition targets. */
export async function GET() {
  const session = await requireClient();
  const userId = (session.user as { id?: string }).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      assignedCoach: {
        select: {
          user: { select: { name: true } },
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ data: null });
  }

  const {
    user,
    assignedCoach,
    ...rest
  } = profile;

  return NextResponse.json({
    data: {
      ...rest,
      user,
      coachName: assignedCoach?.user?.name ?? null,
    },
  });
}
