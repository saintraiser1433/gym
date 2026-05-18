import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

function parseOptionalFloat(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalInt(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await requireCoach();
  const userId = (session.user as { id?: string }).id as string;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!coach) {
    return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
  }

  const client = await prisma.clientProfile.findFirst({
    where: { id, assignedCoachId: coach.id },
    select: { id: true, userId: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profileData: Prisma.ClientProfileUpdateInput = {};

  if ("weight" in body) profileData.weight = parseOptionalFloat(body.weight) ?? null;
  if ("height" in body) profileData.height = parseOptionalFloat(body.height) ?? null;
  if ("dailyCalorieTarget" in body)
    profileData.dailyCalorieTarget = parseOptionalFloat(body.dailyCalorieTarget) ?? null;
  if ("dailyProteinGrams" in body)
    profileData.dailyProteinGrams = parseOptionalFloat(body.dailyProteinGrams) ?? null;
  if ("dailyCarbsGrams" in body)
    profileData.dailyCarbsGrams = parseOptionalFloat(body.dailyCarbsGrams) ?? null;
  if ("dailyFatGrams" in body)
    profileData.dailyFatGrams = parseOptionalFloat(body.dailyFatGrams) ?? null;

  if ("activityLevel" in body) {
    const a = body.activityLevel;
    if (a === null || a === undefined || a === "") {
      profileData.activityLevel = null;
    } else {
      const v = String(a).trim().toUpperCase();
      const allowed = ["SEDENTARY", "LIGHT", "MODERATE", "VERY_ACTIVE"];
      if (!allowed.includes(v)) {
        return NextResponse.json(
          { error: "Invalid activityLevel" },
          { status: 400 },
        );
      }
      profileData.activityLevel = v;
    }
  }

  if ("recommendedGymSessionsPerWeek" in body) {
    const v = parseOptionalInt(body.recommendedGymSessionsPerWeek);
    if (v !== undefined) {
      if (v !== null && (v < 0 || v > 14)) {
        return NextResponse.json(
          { error: "Gym sessions per week must be between 0 and 14" },
          { status: 400 },
        );
      }
      profileData.recommendedGymSessionsPerWeek = v;
    }
  }

  if ("workoutScheduleNotes" in body) {
    const n = body.workoutScheduleNotes;
    profileData.workoutScheduleNotes =
      n === null || n === undefined || n === "" ? null : String(n).trim() || null;
  }

  if ("nutritionObjective" in body) {
    const o = body.nutritionObjective;
    profileData.nutritionObjective =
      o === null || o === undefined || o === ""
        ? null
        : typeof o === "string"
          ? o.trim() || null
          : null;
  }

  if ("dateOfBirth" in body) {
    const d = body.dateOfBirth;
    if (d === null || d === undefined || d === "") {
      profileData.dateOfBirth = null;
    } else {
      const parsed = new Date(String(d));
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid dateOfBirth" }, { status: 400 });
      }
      profileData.dateOfBirth = parsed;
    }
  }

  if ("gender" in body) {
    const g = body.gender;
    if (g === null || g === undefined || g === "") {
      profileData.gender = null;
    } else {
      const v = String(g).trim();
      if (v !== "Male" && v !== "Female") {
        return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
      }
      profileData.gender = v;
    }
  }

  const userPatch: { name?: string; phone?: string | null } = {};
  if (body.user && typeof body.user === "object" && body.user !== null) {
    const u = body.user as Record<string, unknown>;
    if ("name" in u && typeof u.name === "string") userPatch.name = u.name.trim();
    if ("phone" in u) {
      const p = u.phone;
      userPatch.phone = p === null || p === undefined || p === "" ? null : String(p).trim();
    }
  }

  const hasProfileUpdates = Object.keys(profileData).length > 0;
  const hasUserUpdates = Object.keys(userPatch).length > 0;

  if (!hasProfileUpdates && !hasUserUpdates) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (hasProfileUpdates) {
      await tx.clientProfile.update({
        where: { id: client.id },
        data: profileData,
      });
    }
    if (hasUserUpdates) {
      await tx.user.update({
        where: { id: client.userId },
        data: userPatch,
      });
    }
  });

  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await requireCoach();
    const userId = (session.user as { id?: string }).id as string;

    const coach = await prisma.coachProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return NextResponse.json(
        { error: "Coach profile not found" },
        { status: 404 },
      );
    }

    const client = await prisma.clientProfile.findFirst({
      where: { id, assignedCoachId: coach.id },
      include: {
        user: true,
        mealPlan: true,
        goals: {
          include: {
            goal: true,
          customWorkouts: {
            select: {
              workoutId: true,
              planDay: true,
              intensity: true,
              workout: { select: { id: true, name: true } },
            },
            orderBy: [{ planDay: "asc" }],
          },
          },
          orderBy: { deadline: "asc" },
        },
        workoutAssignments: {
          include: { workout: { select: { id: true, name: true } } },
          orderBy: { startDate: "desc" },
        },
        memberships: {
          include: { membership: true },
          orderBy: { startDate: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: client });
  } catch (err) {
    console.error("[GET /api/coach/clients/[id]]", err);
    const message = err instanceof Error ? err.message : "Server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

