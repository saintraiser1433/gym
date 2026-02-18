import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  createRenewalSchema,
  paginationSchema,
} from "@/lib/validators/admin";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const url = new URL(req.url);
  const parsed = paginationSchema.safeParse({
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params" },
      { status: 400 },
    );
  }

  const { page, pageSize } = parsed.data;

  const [total, renewals] = await Promise.all([
    prisma.membershipRenewal.count(),
    prisma.membershipRenewal.findMany({
      orderBy: { renewalDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        clientMembership: {
          include: {
            client: { include: { user: true } },
            membership: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ data: renewals, page, pageSize, total });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const json = await req.json();
  const parsed = createRenewalSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { clientMembershipId, newEndDate, amountPaid } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const membership = await tx.clientMembership.update({
        where: { id: clientMembershipId },
        data: {
          endDate: new Date(newEndDate),
          status: "ACTIVE",
        },
      });

      const renewal = await tx.membershipRenewal.create({
        data: {
          clientMembershipId,
          newEndDate: new Date(newEndDate),
          amount: amountPaid,
        },
      });

      const payment = await tx.payment.create({
        data: {
          clientId: membership.clientId,
          amount: amountPaid,
          type: "RENEWAL",
          status: "COMPLETED",
        },
      });

      return { renewal, payment };
    });

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to process renewal" },
      { status: 500 },
    );
  }
}

