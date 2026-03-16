import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** GET single payment for current client (for receipt). */
export async function GET(_req: Request, { params }: Params) {
  const session = await requireClient();
  const userId = (session.user as { id?: string }).id as string;
  const { id } = await params;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payment = await prisma.payment.findFirst({
    where: { id, clientId: profile.id },
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
