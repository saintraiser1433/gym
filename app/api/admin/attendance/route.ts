import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { paginationSchema } from "@/lib/validators/admin";

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

