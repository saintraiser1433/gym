import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().trim().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  occupation: z.string().trim().optional(),
  emergencyContact: z.string().trim().optional(),
  gymNotes: z.string().trim().optional(),
});

/** Public client registration. Creates User (CLIENT, INACTIVE) + ClientProfile. Admin must approve before sign-in. */
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = registerSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    name,
    email,
    password,
    phone,
    dateOfBirth,
    address,
    gender,
    occupation,
    emergencyContact,
    gymNotes,
  } = parsed.data;
  const passwordHash = await hash(password, 10);

  const dateOfBirthDate = dateOfBirth
    ? (() => {
        const d = new Date(dateOfBirth);
        return !Number.isNaN(d.getTime()) ? d : undefined;
      })()
    : undefined;

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: "CLIENT",
        status: "INACTIVE",
        phone: phone || undefined,
        clientProfile: {
          create: {
            ...(dateOfBirthDate && { dateOfBirth: dateOfBirthDate }),
            ...(emergencyContact && { emergencyContact }),
          },
        },
      },
    });
    return NextResponse.json(
      { message: "Registration submitted. An admin will approve your account before you can sign in." },
      { status: 201 },
    );
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 },
    );
  }
}
