import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** GET single payment with client info (for receipt). Admin only. */
export async function GET(_req: Request, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { client: { include: { user: { select: { name: true, email: true } } } } },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: payment.id,
    amount: payment.amount,
    type: payment.type,
    status: payment.status,
    method: payment.method,
    referenceId: payment.referenceId,
    date: payment.date.toISOString(),
    clientName: payment.client?.user?.name ?? "—",
    clientEmail: payment.client?.user?.email ?? "—",
  });
}
