import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { z } from "zod";

const applySchema = z.object({
  membershipId: z.string().min(1),
  method: z.enum(["CASH", "GCASH"]),
  reference: z.string().trim().optional(), // e.g. GCash reference number
  variant: z.enum(["NO_COACH", "WITH_COACH"]).default("NO_COACH"),
  upgradeFromClientMembershipId: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireClient();
  const userId = (session.user as { id?: string }).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const membershipId = String(formData.get("membershipId") ?? "");
  const method = String(formData.get("method") ?? "");
  const reference = formData.get("reference")
    ? String(formData.get("reference"))
    : undefined;
  const variant = String(formData.get("variant") ?? "NO_COACH");
  const upgradeFromClientMembershipId = formData.get(
    "upgradeFromClientMembershipId",
  )
    ? String(formData.get("upgradeFromClientMembershipId"))
    : undefined;

  const parsed = applySchema.safeParse({
    membershipId,
    method,
    reference,
    variant,
    upgradeFromClientMembershipId,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const membership = await prisma.membership.findUnique({
    where: { id: parsed.data.membershipId },
  });
  if (!membership || membership.status !== "ACTIVE") {
    return NextResponse.json({ error: "Membership not found or inactive" }, { status: 400 });
  }

  // Optional image proof for GCash
  let proofUrl: string | null = null;
  const proof = formData.get("proof");
  if (proof && proof instanceof File && proof.size > 0) {
    const arrayBuffer = await proof.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = path.extname(proof.name) || ".png";
    const fileName = `payment-${profile.id}-${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "payments");
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);
    proofUrl = `/uploads/payments/${fileName}`;
  }

  // Determine price based on variant (no coach vs with coach)
  let amount = membership.price;
  let withCoach = false;
  if (parsed.data.variant === "WITH_COACH") {
    const features = (membership.features ?? {}) as any;
    if (features && typeof features === "object" && features.coachPrice != null) {
      amount = Number(features.coachPrice);
      withCoach = true;
    }
  }

  // Store metadata (membershipId, reference, proofUrl, variant, withCoach) as JSON
  const refPayload = {
    membershipId: parsed.data.membershipId,
    reference: parsed.data.reference ?? null,
    proofUrl,
    variant: parsed.data.variant,
    withCoach,
    upgradeFromClientMembershipId:
      parsed.data.upgradeFromClientMembershipId ?? null,
  };

  const payment = await prisma.payment.create({
    data: {
      clientId: profile.id,
      amount,
      type: "MEMBERSHIP",
      status: "PENDING",
      method: parsed.data.method,
      referenceId: JSON.stringify(refPayload),
    },
  });

  return NextResponse.json({ data: payment }, { status: 201 });
}
