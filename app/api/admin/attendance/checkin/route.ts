import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { emit } from "@/lib/websocket";

type QrPayload = {
  clientId: string;
  nonce: string;
  ts: number;
};

export async function POST(req: NextRequest) {
  await requireAdmin();
  const { payload } = await req.json();

  let data: QrPayload;
  try {
    data = JSON.parse(payload) as QrPayload;
  } catch {
    return NextResponse.json({ error: "Invalid QR payload" }, { status: 400 });
  }

  // Basic expiry: 24 hours
  const maxAgeMs = 24 * 60 * 60 * 1000;
  if (Date.now() - data.ts > maxAgeMs) {
    return NextResponse.json({ error: "QR code expired" }, { status: 400 });
  }

  const client = await prisma.clientProfile.findUnique({
    where: { id: data.clientId },
  });

  if (!client) {
    return NextResponse.json(
      { error: "Client not found" },
      { status: 404 },
    );
  }

  const attendance = await prisma.attendance.create({
    data: {
      clientId: client.id,
      method: "QR",
      qrCode: payload,
    },
  });

  emit("attendance:checkin", { attendanceId: attendance.id, clientId: client.id });

  return NextResponse.json(attendance, { status: 201 });
}

