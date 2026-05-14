import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";

/**
 * CrosCal demo seed — populates every module with interconnected rows.
 *
 * WARNING: Clears ALL application data (users included), then recreates demo accounts.
 * Use only on local/dev databases. Do not run against production with real users.
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function wipeDatabase() {
  // Dependency order: children first (PostgreSQL FK-safe).
  await prisma.notification.deleteMany({});
  await prisma.clientGoalUpdate.deleteMany({});
  await prisma.clientGoal.deleteMany({});
  await prisma.workoutProgress.deleteMany({});
  await prisma.workoutAssignment.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.schedule.deleteMany({});
  await prisma.membershipRenewal.deleteMany({});
  await prisma.clientMembership.deleteMany({});
  await prisma.mealPlan.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.goalWorkout.deleteMany({});
  await prisma.workoutExercise.deleteMany({});
  await prisma.workoutMedia.deleteMany({});
  await prisma.workoutEquipment.deleteMany({});
  await prisma.workout.deleteMany({});
  await prisma.exercise.deleteMany({});
  await prisma.workoutGoal.deleteMany({});
  await prisma.equipment.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.clientProfile.deleteMany({});
  await prisma.coachProfile.deleteMany({});
  await prisma.user.deleteMany({});
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for seeding.");
  }

  console.log("Seeding CrosCal (full reset + interconnected demo data)…");

  await wipeDatabase();

  const passwordHash = await hash("admin123", 10);
  const coachHash = await hash("coach123", 10);
  const clientHash = await hash("client123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@croscal.local",
      name: "Admin User",
      password: passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      phone: "+63 900 000 0001",
    },
  });

  const coachUser = await prisma.user.create({
    data: {
      email: "coach@croscal.local",
      name: "Coach User",
      password: coachHash,
      role: "COACH",
      status: "ACTIVE",
      phone: "+63 900 000 0002",
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      email: "client@croscal.local",
      name: "Client User",
      password: clientHash,
      role: "CLIENT",
      status: "ACTIVE",
      phone: "+63 900 000 0003",
    },
  });

  const pendingClientUser = await prisma.user.create({
    data: {
      email: "pending@croscal.local",
      name: "Pending Approval",
      password: clientHash,
      role: "CLIENT",
      status: "INACTIVE",
      phone: "+63 900 000 0004",
    },
  });

  const coach = await prisma.coachProfile.create({
    data: {
      userId: coachUser.id,
      specialization: "Strength & conditioning",
      bio: "Certified trainer — demo seed profile.",
      certifications: "CPT, CPR",
      yearsExperience: 5,
    },
  });

  const clientProfile = await prisma.clientProfile.create({
    data: {
      userId: clientUser.id,
      dateOfBirth: new Date("1995-06-15"),
      weight: 75,
      height: 175,
      gender: "Male",
      occupation: "Software developer",
      address: "Cebu City, Philippines",
      emergencyContact: "Jane Doe +63 900 111 2222",
      gymNotes: "Demo seed — general fitness focus.",
      nutritionObjective: "WEIGHT_LOSS",
      dailyCalorieTarget: 2000,
      dailyProteinGrams: 140,
      dailyCarbsGrams: 220,
      dailyFatGrams: 65,
      activityLevel: "MODERATE",
      recommendedGymSessionsPerWeek: 4,
      workoutScheduleNotes: "Mon / Wed / Fri evenings; optional weekend cardio.",
      assignedCoachId: coach.id,
    },
  });

  await prisma.clientProfile.create({
    data: {
      userId: pendingClientUser.id,
      dateOfBirth: new Date("2000-01-01"),
      weight: 68,
      height: 168,
      gender: "Female",
      joinDate: new Date(),
    },
  });

  const membershipBasic = await prisma.membership.create({
    data: {
      name: "Basic Monthly",
      type: "BASIC",
      duration: 30,
      description: "Gym access, no coach.",
      price: 1500,
      hasCoach: false,
      status: "ACTIVE",
    },
  });

  const membershipPremium = await prisma.membership.create({
    data: {
      name: "Premium Monthly",
      type: "PREMIUM",
      duration: 30,
      description: "Gym access + coach guidance.",
      price: 3500,
      hasCoach: true,
      status: "ACTIVE",
    },
  });

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30);

  const clientMembership = await prisma.clientMembership.create({
    data: {
      clientId: clientProfile.id,
      membershipId: membershipPremium.id,
      startDate: now,
      endDate,
      status: "ACTIVE",
    },
  });

  await prisma.membershipRenewal.create({
    data: {
      clientMembershipId: clientMembership.id,
      renewalDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      newEndDate: endDate,
      amount: 3500,
    },
  });

  const equipmentTreadmill = await prisma.equipment.create({
    data: {
      name: "Treadmill Pro",
      type: "Cardio",
      brand: "RunTech",
      status: "AVAILABLE",
      quantity: 3,
      measureTypes: ["PER_PCS"],
    },
  });

  const equipmentBarbell = await prisma.equipment.create({
    data: {
      name: "Olympic Barbell",
      type: "Free weights",
      brand: "IronCo",
      status: "AVAILABLE",
      quantity: 8,
      measureTypes: ["PER_KG", "PER_PCS"],
    },
  });

  const equipmentBench = await prisma.equipment.create({
    data: {
      name: "Adjustable Bench",
      type: "Bench",
      brand: "IronCo",
      status: "AVAILABLE",
      quantity: 6,
      measureTypes: ["PER_PCS"],
    },
  });

  const exSquat = await prisma.exercise.create({
    data: {
      name: "Back squat",
      description: "Barbell squat to parallel",
      category: "Compound",
      muscleGroup: "Legs",
      difficulty: "Intermediate",
      instructions: "Brace core, sit back, drive up.",
    },
  });

  const exPushup = await prisma.exercise.create({
    data: {
      name: "Push-up",
      description: "Bodyweight chest",
      category: "Bodyweight",
      muscleGroup: "Chest",
      difficulty: "Beginner",
      instructions: "Full range of motion, tight line.",
    },
  });

  const exPlank = await prisma.exercise.create({
    data: {
      name: "Plank",
      description: "Core stability",
      category: "Core",
      muscleGroup: "Core",
      difficulty: "Beginner",
      instructions: "Hold neutral spine.",
    },
  });

  const goalWeightLoss = await prisma.workoutGoal.create({
    data: {
      name: "Weight loss starter",
      description: "Full-body circuits for fat loss",
      category: "WEIGHT_LOSS",
      targetSessions: 12,
    },
  });

  const goalMuscle = await prisma.workoutGoal.create({
    data: {
      name: "Hypertrophy block",
      description: "Push-focused volume",
      category: "MUSCLE_GAIN",
      targetSessions: 8,
    },
  });

  const goalGeneral = await prisma.workoutGoal.create({
    data: {
      name: "General fitness",
      description: "Balanced weekly plan",
      category: "GENERAL_FITNESS",
      targetSessions: 10,
    },
  });

  const workoutCircuit = await prisma.workout.create({
    data: {
      name: "Full body circuit (seed)",
      description: "Demo workout linked to weight-loss goal",
      duration: 45,
      difficulty: "Intermediate",
      types: ["PER_PCS", "PER_KG"],
      demoMediaUrl: null,
    },
  });

  const workoutCoachHiit = await prisma.workout.create({
    data: {
      name: "Coach HIIT finisher (seed)",
      description: "Coach-authored workout",
      createdById: coach.id,
      duration: 25,
      difficulty: "Hard",
      types: ["PER_PCS"],
    },
  });

  await prisma.workoutExercise.createMany({
    data: [
      {
        workoutId: workoutCircuit.id,
        exerciseId: exSquat.id,
        sets: 4,
        reps: 8,
        order: 0,
      },
      {
        workoutId: workoutCircuit.id,
        exerciseId: exPushup.id,
        sets: 3,
        reps: 15,
        order: 1,
      },
      {
        workoutId: workoutCircuit.id,
        exerciseId: exPlank.id,
        sets: 3,
        reps: 1,
        duration: 45,
        order: 2,
      },
    ],
  });

  await prisma.workoutExercise.create({
    data: {
      workoutId: workoutCoachHiit.id,
      exerciseId: exPushup.id,
      sets: 5,
      reps: 20,
      order: 0,
    },
  });

  await prisma.workoutMedia.create({
    data: {
      workoutId: workoutCircuit.id,
      url: "https://example.com/demo-workout-step.gif",
      stepName: "Warm-up",
      description: "Demo media row for seed",
      mediaType: "GIF",
      durationSeconds: 60,
      order: 0,
    },
  });

  await prisma.workoutEquipment.createMany({
    data: [
      {
        workoutId: workoutCircuit.id,
        equipmentId: equipmentBarbell.id,
        quantity: 1,
        targetKg: 40,
        targetPcs: null,
      },
      {
        workoutId: workoutCircuit.id,
        equipmentId: equipmentBench.id,
        quantity: 1,
        targetPcs: 1,
        targetKg: null,
      },
    ],
  });

  await prisma.goalWorkout.createMany({
    data: [
      {
        goalId: goalWeightLoss.id,
        workoutId: workoutCircuit.id,
        workoutType: "PER_PCS",
        targetValue: null,
        planDay: 1,
      },
      {
        goalId: goalWeightLoss.id,
        workoutId: workoutCoachHiit.id,
        workoutType: "PER_PCS",
        targetValue: null,
        planDay: 2,
      },
      {
        goalId: goalMuscle.id,
        workoutId: workoutCircuit.id,
        workoutType: "PER_KG",
        targetValue: 60,
        planDay: 1,
      },
    ],
  });

  const clientGoal1 = await prisma.clientGoal.create({
    data: {
      clientId: clientProfile.id,
      goalId: goalWeightLoss.id,
      targetSessions: 12,
      currentValue: 3,
      deadline: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
  });

  await prisma.clientGoal.create({
    data: {
      clientId: clientProfile.id,
      goalId: goalGeneral.id,
      targetSessions: 10,
      currentValue: 1,
      deadline: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
  });

  await prisma.clientGoalUpdate.create({
    data: {
      clientGoalId: clientGoal1.id,
      message: "Completed day 1 circuit — felt great!",
    },
  });

  const weCircuitSquat = await prisma.workoutExercise.findFirst({
    where: { workoutId: workoutCircuit.id, exerciseId: exSquat.id },
  });

  await prisma.workoutProgress.createMany({
    data: [
      {
        clientId: clientProfile.id,
        workoutId: workoutCircuit.id,
        workoutExerciseId: weCircuitSquat?.id ?? null,
        completedDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        actualSets: 4,
        actualReps: 8,
        weight: 40,
        rating: 4,
        notes: "Seed progress entry",
      },
      {
        clientId: clientProfile.id,
        workoutId: workoutCoachHiit.id,
        completedDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        actualSets: 5,
        actualReps: 20,
        rating: 5,
      },
    ],
  });

  await prisma.workoutAssignment.create({
    data: {
      clientId: clientProfile.id,
      workoutId: workoutCircuit.id,
      assignedById: coach.id,
      startDate: now,
      endDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      frequency: "3x per week",
      status: "ACTIVE",
    },
  });

  const schedulePt = await prisma.schedule.create({
    data: {
      title: "PT — Client User (seed)",
      type: "PERSONAL_TRAINING",
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 11, 0, 0),
      coachId: coach.id,
      capacity: 1,
      recurrence: null,
    },
  });

  const scheduleClass = await prisma.schedule.create({
    data: {
      title: "HIIT Group Class (seed)",
      type: "CLASS",
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 18, 0, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 19, 0, 0),
      coachId: coach.id,
      capacity: 12,
      recurrence: "WEEKLY",
    },
  });

  await prisma.attendance.createMany({
    data: [
      {
        clientId: clientProfile.id,
        scheduleId: schedulePt.id,
        checkInTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        checkOutTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 55 * 60 * 1000),
        method: "QR",
        qrCode: `seed-qr-${clientProfile.id.slice(0, 8)}`,
      },
      {
        clientId: clientProfile.id,
        scheduleId: null,
        checkInTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        method: "MANUAL",
      },
    ],
  });

  await prisma.payment.createMany({
    data: [
      {
        clientId: clientProfile.id,
        amount: 3500,
        type: "MEMBERSHIP",
        status: "COMPLETED",
        method: "GCash",
        referenceId: "SEED-PAY-001",
        date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        clientId: clientProfile.id,
        amount: 3500,
        type: "RENEWAL",
        status: "COMPLETED",
        method: "Cash",
        referenceId: "SEED-PAY-002",
        date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      },
      {
        clientId: clientProfile.id,
        amount: 500,
        type: "PENALTY",
        status: "PENDING",
        method: null,
        referenceId: null,
        date: now,
      },
    ],
  });

  await prisma.mealPlan.create({
    data: {
      clientId: clientProfile.id,
      coachId: coach.id,
      title: "Week 1 — demo meal plan",
      content:
        "Breakfast: Oats + egg whites\nLunch: Chicken breast + rice + vegetables\nDinner: Fish + salad\nSnacks: Greek yogurt",
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        type: "SYSTEM",
        title: "Database seeded",
        message: "Demo data was loaded. Review Analytics and Accounts.",
        read: false,
        metadata: { seed: true },
      },
      {
        userId: clientUser.id,
        type: "COACH_MESSAGE",
        title: "Welcome to CrosCal",
        message: "Your coach has assigned your first goals. Check the Goals tab.",
        read: false,
        metadata: { seed: true },
      },
      {
        userId: coachUser.id,
        type: "SYSTEM",
        title: "Seed notification",
        message: "Demo notification for coach inbox.",
        read: true,
        metadata: { seed: true },
      },
    ],
  });

  // Admin sees analytics — extra membership on basic for reporting variety (second client optional).
  // Link basic membership to pending user profile for "inactive client" data shape.
  const pendingProfile = await prisma.clientProfile.findUniqueOrThrow({
    where: { userId: pendingClientUser.id },
  });

  const pendingEnd = new Date(now);
  pendingEnd.setDate(pendingEnd.getDate() + 14);
  await prisma.clientMembership.create({
    data: {
      clientId: pendingProfile.id,
      membershipId: membershipBasic.id,
      startDate: now,
      endDate: pendingEnd,
      status: "ACTIVE",
    },
  });

  console.log("");
  console.log("Seed completed successfully.");
  console.log("─────────────────────────────────────────");
  console.log(" Admin (ACTIVE):     admin@croscal.local / admin123");
  console.log(" Coach (ACTIVE):     coach@croscal.local / coach123");
  console.log(" Client (ACTIVE):    client@croscal.local / client123");
  console.log(" Client (INACTIVE):  pending@croscal.local / client123");
  console.log("");
  console.log("Linked data: coach ↔ client, premium membership + renewal,");
  console.log("  payments, meal plan, schedules, attendance, workout goals,");
  console.log("  goal↔workout links, exercises, equipment, assignments, progress, notifications.");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
