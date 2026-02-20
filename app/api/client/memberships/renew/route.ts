import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notifications";
import { z } from "zod";

const renewSchema = z.object({
  clientMembershipId: z.string().min(1),
  method: z.enum(["CASH", "GCASH"]),
  reference: z.string().trim().optional(),
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
  const clientMembershipId = String(formData.get("clientMembershipId") ?? "");
  const method = String(formData.get("method") ?? "");
  const reference = formData.get("reference")
    ? String(formData.get("reference"))
    : undefined;

  const parsed = renewSchema.safeParse({
    clientMembershipId,
    method,
    reference,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Ensure the membership belongs to this client and is expired or cancelled
  const clientMembership = await prisma.clientMembership.findFirst({
    where: {
      id: parsed.data.clientMembershipId,
      client: { id: profile.id },
    },
    include: { membership: true },
  });

  if (!clientMembership || !clientMembership.membership) {
    return NextResponse.json(
      { error: "Membership to renew not found" },
      { status: 404 },
    );
  }

  // Optional image proof
  let proofUrl: string | null = null;
  const proof = formData.get("proof");
  if (proof && proof instanceof File && proof.size > 0) {
    const arrayBuffer = await proof.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = path.extname(proof.name) || ".png";
    const fileName = `renewal-${profile.id}-${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "payments");
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);
    proofUrl = `/uploads/payments/${fileName}`;
  }

  const membership = clientMembership.membership;
  const amount = membership.price;

  const refPayload = {
    clientMembershipId: parsed.data.clientMembershipId,
    membershipId: clientMembership.membershipId,
    reference: parsed.data.reference ?? null,
    proofUrl,
  };

  const payment = await prisma.payment.create({
    data: {
      clientId: profile.id,
      amount,
      type: "RENEWAL",
      status: "PENDING",
      method: parsed.data.method,
      referenceId: JSON.stringify(refPayload),
    },
  });

  const clientName = (await prisma.clientProfile.findUnique({
    where: { id: profile.id },
    select: { user: { select: { name: true } } },
  }))?.user?.name;
  await notifyAdmins(
    "RENEWAL_APPLICATION",
    "Membership renewal request",
    `${clientName ?? "A client"} submitted a renewal for ${membership.name}. Approve or reject in Payments.`,
    { paymentId: payment.id },
  );

  return NextResponse.json({ data: payment }, { status: 201 });
}

