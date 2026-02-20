import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "CLIENT", "COACH"]),
  phone: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true, role: true })
  .partial();

export const createExerciseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  muscleGroup: z.string().optional(),
  difficulty: z.string().optional(),
  equipment: z.string().optional(),
  videoUrl: z.string().url().optional(),
  instructions: z.string().optional(),
});

export const updateExerciseSchema = createExerciseSchema.partial();

export const createMembershipSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["BASIC", "PREMIUM"]),
  duration: z.number().int().min(1).optional(),
  price: z.number().nonnegative(),
  hasCoach: z.boolean().default(false),
  description: z.string().optional(),
  features: z.any().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const updateMembershipSchema = z
  .object({
    name: z.string().min(1).optional(),
    type: z.enum(["BASIC", "PREMIUM"]).optional(),
    duration: z.number().int().min(1).optional().nullable(),
    price: z.number().nonnegative().optional(),
    description: z.string().optional(),
    features: z.any().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .transform((data) => {
    const hasCoach =
      data.type !== undefined ? data.type !== "BASIC" : undefined;
    return { ...data, hasCoach } as typeof data & { hasCoach?: boolean };
  });

export const createGoalSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum([
    "WEIGHT_LOSS",
    "MUSCLE_GAIN",
    "ENDURANCE",
    "FLEXIBILITY",
    "GENERAL_FITNESS",
  ]),
  workoutIds: z.array(z.string().min(1)).optional().default([]),
});

export const updateGoalSchema = createGoalSchema.partial();

/** Assign a workout goal to a client (create ClientGoal) */
export const createClientGoalSchema = z.object({
  clientId: z.string().min(1),
  goalId: z.string().min(1),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  deadline: z.string().datetime().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).default("ACTIVE"),
});
export const updateClientGoalSchema = z.object({
  targetValue: z.number().optional().nullable(),
  currentValue: z.number().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
});

export const createRegistrationSchema = z.object({
  client: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(6),
    dateOfBirth: z.string().datetime().optional(),
  }),
  membershipId: z.string().min(1),
  startDate: z.string().datetime().optional(),
  amountPaid: z.number().nonnegative(),
});

/** Assign an existing client to a membership (create ClientMembership only) */
export const createClientMembershipSchema = z.object({
  clientId: z.string().min(1),
  membershipId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]).default("ACTIVE"),
});

export const updateClientMembershipSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
});

export const createRenewalSchema = z.object({
  clientMembershipId: z.string().min(1),
  newEndDate: z.string().datetime(),
  amountPaid: z.number().nonnegative(),
});

export const createPaymentSchema = z.object({
  clientId: z.string().min(1),
  amount: z.number().nonnegative(),
  type: z.enum(["MEMBERSHIP", "RENEWAL", "PENALTY"]),
  status: z.enum(["PENDING", "COMPLETED", "FAILED"]).default("COMPLETED"),
  method: z.string().optional(),
  referenceId: z.string().optional(),
  date: z.string().datetime().optional(),
});

export const createScheduleSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["CLASS", "PERSONAL_TRAINING", "GYM_HOURS"]),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  coachId: z.string().optional(),
  allowedMembershipTypes: z
    .array(z.enum(["BASIC", "PREMIUM"]))
    .min(1, "Select at least one allowed membership type (Basic or Premium)"),
});

export const updateScheduleSchema = createScheduleSchema.partial();

export const createEquipmentSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  brand: z.string().optional(),
  purchaseDate: z.string().datetime().optional(),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "BROKEN"]).default("AVAILABLE"),
  quantity: z.number().int().min(1).default(1),
});

export const updateEquipmentSchema = createEquipmentSchema.partial();

export const createAttendanceSchema = z.object({
  clientId: z.string().min(1),
  scheduleId: z.string().optional(),
  checkInTime: z.string().datetime().optional(),
  checkOutTime: z.string().datetime().optional(),
  method: z.enum(["QR", "MANUAL"]).default("MANUAL"),
});
export const updateAttendanceSchema = z.object({
  checkOutTime: z.string().datetime().optional().nullable(),
});


