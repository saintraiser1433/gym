import { prisma } from "@/lib/db";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata: metadata ?? undefined,
    },
  });
}

/** Notify a coach by their CoachProfile id. */
export async function notifyCoach(
  coachProfileId: string,
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  const coach = await prisma.coachProfile.findUnique({
    where: { id: coachProfileId },
    select: { userId: true },
  });
  if (!coach?.userId) return;
  await createNotification(coach.userId, type, title, message, metadata);
}

/** Notify all admin users (e.g. new membership application, renewal). */
export async function notifyAdmins(
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type,
      title,
      message,
      metadata: metadata ?? undefined,
    })),
  });
}
