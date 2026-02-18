import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  createScheduleSchema,
  paginationSchema,
} from "@/lib/validators/admin";

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
  const where = search
    ? {
        title: { contains: search, mode: "insensitive" },
      }
    : {};

  const [total, schedules] = await Promise.all([
    prisma.schedule.count({ where }),
    prisma.schedule.findMany({
      where,
      orderBy: { startTime: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        coach: { include: { user: true } },
      },
    }),
  ]);

  return NextResponse.json({ data: schedules, page, pageSize, total });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const json = await req.json();
  const parsed = createScheduleSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { startTime, endTime, ...rest } = parsed.data;

  const schedule = await prisma.schedule.create({
    data: {
      ...rest,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    },
  });

  return NextResponse.json(schedule, { status: 201 });
}

