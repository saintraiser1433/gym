import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  paginationSchema,
  createAttendanceSchema,
} from "@/lib/validators/admin";
import { createNotification, notifyCoach } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const url = new URL(req.url);
  const parsed = paginationSchema.safeParse({
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    search: url.searchParams.get("search") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params" },
      { status: 400 },
    );
  }

  const { page, pageSize, search } = parsed.data;

  const where =
    search && search.trim().length > 0
      ? {
          OR: [
            { client: { user: { name: { contains: search, mode: "insensitive" } } } },
            { client: { user: { email: { contains: search, mode: "insensitive" } } } },
            { schedule: { title: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {};

  const [total, records] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      orderBy: { checkInTime: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: { include: { user: true } },
        schedule: true,
      },
    }),
  ]);

  return NextResponse.json({
    data: records,
    page,
    pageSize,
    total,
  });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const json = await req.json();
  const parsed = createAttendanceSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { checkInTime, checkOutTime, ...rest } = parsed.data;
  const { clientId, scheduleId, ...other } = rest;

  // When linking a client to a schedule, enforce membership rules and notify parties.
  let schedule:
    | (Awaited<ReturnType<typeof prisma.schedule.findUnique>> & {
        coach?: { id: string | null } | null;
      })
    | null = null;

  if (scheduleId) {
    const now = new Date();

    // Require at least one active client membership (status ACTIVE, not past endDate).
    const activeMemberships = await prisma.clientMembership.findMany({
      where: {
        clientId,
        status: "ACTIVE",
        endDate: { gte: now },
      },
      include: {
        membership: true,
      },
    });

    if (activeMemberships.length === 0) {
      return NextResponse.json(
        { error: "Client must have an active membership to be added to a schedule." },
        { status: 400 },
      );
    }

    schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        coach: true,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 },
      );
    }

    // If schedule has membership-type restrictions, enforce them.
    const rawAllowed = schedule.allowedMembershipTypes as unknown;
    const allowedTypes: string[] = Array.isArray(rawAllowed)
      ? (rawAllowed as string[])
      : [];

    if (allowedTypes.length > 0) {
      const hasAllowed = activeMemberships.some((cm) =>
        allowedTypes.includes(cm.membership.type),
      );
      if (!hasAllowed) {
        return NextResponse.json(
          { error: "Client's membership type is not allowed for this schedule." },
          { status: 400 },
        );
      }
    }
  }

  const attendance = await prisma.attendance.create({
    data: {
      clientId,
      scheduleId,
      ...other,
      checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
      checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
    },
  });

  // After creating attendance for a schedule, notify client and coach.
  if (scheduleId && schedule) {
    const client = await prisma.clientProfile.findUnique({
      where: { id: clientId },
      include: { user: true },
    });

    const formattedWhen = schedule.startTime.toLocaleString();

    if (client?.user?.id) {
      await createNotification(
        client.user.id,
        "SCHEDULE_ASSIGNED",
        "You were added to a session",
        `You have been added to "${schedule.title}" on ${formattedWhen}.`,
        {
          scheduleId,
          attendanceId: attendance.id,
        },
      );
    }

    if (schedule.coach?.id) {
      await notifyCoach(
        schedule.coach.id,
        "CLIENT_ADDED_TO_SESSION",
        "Client added to your session",
        `${client?.user?.name ?? "A client"} was added to your session "${schedule.title}" on ${formattedWhen}.`,
        {
          scheduleId,
          clientId,
          attendanceId: attendance.id,
        },
      );
    }
  }

  return NextResponse.json(attendance, { status: 201 });
}

