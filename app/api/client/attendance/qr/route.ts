import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { generateQrPayload } from "@/lib/qr";

export async function GET() {
  const session = await requireClient();
  const userId = (session.user as any).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Client profile not found" },
      { status: 404 },
    );
  }

  const { json, svg } = await generateQrPayload(profile.id);

  return NextResponse.json({
    payload: json,
    image: svg,
  });
}

