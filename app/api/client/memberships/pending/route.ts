import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

// GET: fetch the latest pending membership payment (if any) for this client
export async function GET() {
  const session = await requireClient();
  const userId = (session.user as { id?: string }).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ data: null });
  }

  const payment = await prisma.payment.findFirst({
    where: {
      clientId: profile.id,
      type: { in: ["MEMBERSHIP", "RENEWAL"] },
      status: "PENDING",
    },
    orderBy: { date: "desc" },
  });

  if (!payment) {
    return NextResponse.json({ data: null });
  }

  let membership = null;
  let gcashRef: string | null = null;
  let proofUrl: string | null = null;
  const referenceRaw = payment.referenceId ?? "";
  try {
    const parsed = JSON.parse(referenceRaw);
    if (parsed && typeof parsed === "object") {
      const membershipId = parsed.membershipId as string | undefined;
      gcashRef = (parsed.reference as string | null) ?? null;
      proofUrl = (parsed.proofUrl as string | null) ?? null;
      if (membershipId) {
        membership = await prisma.membership.findUnique({ where: { id: membershipId } });
      }
    }
  } catch {
    // Fallback for older format: membershipId or membershipId:gcashRef
    const [membershipId, legacyRef] = referenceRaw.split(":");
    if (legacyRef) {
      gcashRef = legacyRef;
    }
    if (membershipId) {
      membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    }
  }

  return NextResponse.json({
    data: {
      id: payment.id,
      amount: payment.amount,
      method: payment.method,
      createdAt: payment.date,
      reference: gcashRef,
      proofUrl,
      membership,
    },
  });
}

// DELETE: cancel the latest pending membership payment (mark as FAILED)
export async function DELETE() {
  const session = await requireClient();
  const userId = (session.user as { id?: string }).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
  }

  const payment = await prisma.payment.findFirst({
    where: {
      clientId: profile.id,
      type: { in: ["MEMBERSHIP", "RENEWAL"] },
      status: "PENDING",
    },
    orderBy: { date: "desc" },
  });

  if (!payment) {
    return NextResponse.json({ error: "No pending membership payment" }, { status: 404 });
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED" },
  });

  return NextResponse.json({ success: true });
}

