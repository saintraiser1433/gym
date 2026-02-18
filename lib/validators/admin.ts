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
  type: z.enum(["BASIC", "PREMIUM", "VIP"]),
  duration: z.number().int().min(1),
  price: z.number().nonnegative(),
  hasCoach: z.boolean().default(false),
  features: z.any().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const updateMembershipSchema = createMembershipSchema.partial();

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
});

export const updateGoalSchema = createGoalSchema.partial();

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
  capacity: z.number().int().min(1).optional(),
  recurrence: z.string().optional(),
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


