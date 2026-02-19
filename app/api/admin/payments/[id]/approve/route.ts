import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** Approve a PENDING MEMBERSHIP payment: create ClientMembership and set payment COMPLETED */
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
      { error: "Only PENDING payments can be approved" },
      { status: 400 },
    );
  }
  // referenceId can be:
  // - JSON: { membershipId, reference, proofUrl, clientMembershipId?, upgradeFromClientMembershipId?, ... }
  // - legacy string: "membershipId" or "membershipId:gcashRef"
  const refRaw = payment.referenceId ?? "";
  let membershipId: string | null = null;
  let clientMembershipId: string | null = null;
  let upgradeFromClientMembershipId: string | null = null;
  try {
    const parsed = JSON.parse(refRaw);
    if (parsed && typeof parsed === "object") {
      if (parsed.membershipId) {
        membershipId = String(parsed.membershipId);
      }
      if (parsed.clientMembershipId) {
        clientMembershipId = String(parsed.clientMembershipId);
      }
      if (parsed.upgradeFromClientMembershipId) {
        upgradeFromClientMembershipId = String(parsed.upgradeFromClientMembershipId);
      }
    }
  } catch {
    // legacy format
    const [legacyMembershipId] = refRaw.split(":");
    membershipId = legacyMembershipId || null;
  }

  if (!membershipId) {
    return NextResponse.json(
      { error: "Payment has no membership reference" },
      { status: 400 },
    );
  }

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) {
    return NextResponse.json({ error: "Membership plan not found" }, { status: 400 });
  }

  if (payment.type === "MEMBERSHIP") {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + membership.duration);

    if (upgradeFromClientMembershipId) {
      // Upgrade existing membership instance instead of creating a new one
      await prisma.$transaction(async (tx) => {
        const existing = await tx.clientMembership.findUnique({
          where: { id: upgradeFromClientMembershipId! },
        });
        if (!existing || existing.clientId !== payment.clientId) {
          throw new Error("Client membership to upgrade not found for this payment");
        }

        await tx.clientMembership.update({
          where: { id: upgradeFromClientMembershipId! },
          data: {
            membershipId,
            startDate,
            endDate,
            status: "ACTIVE",
          },
        });

        await tx.payment.update({
          where: { id },
          data: { status: "COMPLETED" },
        });
      });
    } else {
      // Normal new membership creation
      await prisma.$transaction([
        prisma.clientMembership.create({
          data: {
            clientId: payment.clientId,
            membershipId,
            startDate,
            endDate,
            status: "ACTIVE",
          },
        }),
        prisma.payment.update({
          where: { id },
          data: { status: "COMPLETED" },
        }),
      ]);
    }
  } else if (payment.type === "RENEWAL") {
    if (!clientMembershipId) {
      return NextResponse.json(
        { error: "Renewal payment missing client membership reference" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.clientMembership.findUnique({
        where: { id: clientMembershipId! },
      });
      if (!existing || existing.clientId !== payment.clientId) {
        throw new Error("Client membership not found for this payment");
      }

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + membership.duration);

      const updatedMembership = await tx.clientMembership.update({
        where: { id: clientMembershipId! },
        data: {
          startDate,
          endDate,
          status: "ACTIVE",
        },
      });

      const renewal = await tx.membershipRenewal.create({
        data: {
          clientMembershipId: updatedMembership.id,
          newEndDate: endDate,
          amount: payment.amount,
        },
      });

      await tx.payment.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      return renewal;
    });

    return NextResponse.json({ success: true, renewal: result });
  } else {
    return NextResponse.json(
      { error: "Unsupported payment type for approval" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
