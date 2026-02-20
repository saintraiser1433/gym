import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
  });
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  if (payment.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only PENDING payments can be rejected" },
      { status: 400 },
    );
  }

  await prisma.payment.update({
    where: { id },
    data: { status: "FAILED" },
  });

  const client = await prisma.clientProfile.findUnique({
    where: { id: payment.clientId },
    select: { userId: true },
  });
  if (client?.userId) {
    await createNotification(
      client.userId,
      "PAYMENT_REJECTED",
      "Payment rejected",
      "Your membership payment was rejected. Please contact the gym or submit again with correct details.",
      { paymentId: id },
    );
  }

  return NextResponse.json({ success: true });
}
