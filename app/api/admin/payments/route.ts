import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  createPaymentSchema,
  paginationSchema,
} from "@/lib/validators/admin";

export async function GET(req: NextRequest) {
  try {
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
          client: {
            user: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        }
      : {};

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          client: { include: { user: true } },
        },
      }),
    ]);

    return NextResponse.json({ data: payments, page, pageSize, total });
  } catch (error) {
    console.error("GET /api/admin/payments failed:", error);
    return NextResponse.json(
      { error: "Failed to load payments" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const json = await req.json();
  const parsed = createPaymentSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { clientId, date, ...rest } = parsed.data;

  const payment = await prisma.payment.create({
    data: {
      clientId,
      ...rest,
      date: date ? new Date(date) : undefined,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}

