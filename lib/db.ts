import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Ensure a single PrismaClient instance in dev and prod
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const pool =
  typeof window === "undefined"
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
      })
    : null;

const adapter = pool ? new PrismaPg(pool) : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

