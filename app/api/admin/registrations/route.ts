import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  createRegistrationSchema,
  paginationSchema,
} from "@/lib/validators/admin";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const url = new URL(req.url);
  const parsed = paginationSchema.safeParse({
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    search: url.searchParams.get("search") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params" },
      { status: 400 },
    );
  }

  const { page, pageSize, search } = parsed.data;
  const where =
    search && search.trim().length > 0
      ? {
          client: {
            user: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        }
      : {};

  // Auto-mark expired memberships for all clients based on today's date
  const now = new Date();
  await prisma.clientMembership.updateMany({
    where: {
      status: "ACTIVE",
      endDate: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  const [total, memberships] = await Promise.all([
    prisma.clientMembership.count({ where }),
    prisma.clientMembership.findMany({
      where,
      orderBy: { startDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: { include: { user: true } },
        membership: true,
      },
    }),
  ]);

  return NextResponse.json({ data: memberships, page, pageSize, total });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const json = await req.json();
  const parsed = createRegistrationSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { client, membershipId, startDate, amountPaid } = parsed.data;
  const passwordHash = await hash(client.password, 10);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: client.name,
          email: client.email,
          phone: client.phone,
          password: passwordHash,
          role: "CLIENT",
        },
      });

      const profile = await tx.clientProfile.create({
        data: {
          userId: user.id,
          dateOfBirth: client.dateOfBirth
            ? new Date(client.dateOfBirth)
            : undefined,
        },
      });

      const membership = await tx.clientMembership.create({
        data: {
          clientId: profile.id,
          membershipId,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: startDate
            ? new Date(startDate)
            : new Date(),
        },
      });

      const payment = await tx.payment.create({
        data: {
          clientId: profile.id,
          amount: amountPaid,
          type: "MEMBERSHIP",
          status: "COMPLETED",
        },
      });

      return { user, profile, membership, payment };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to register client" },
      { status: 500 },
    );
  }
}

