import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

console.log("DATABASE_URL from seed:", process.env.DATABASE_URL);

async function main() {
  // Admin account
  await prisma.user.upsert({
    where: { email: "admin@croscal.local" },
    update: {},
    create: {
      email: "admin@croscal.local",
      name: "Admin User",
      password: await hash("admin123", 10),
      role: "ADMIN",
    },
  });

  // Coach account
  await prisma.user.upsert({
    where: { email: "coach@croscal.local" },
    update: {},
    create: {
      email: "coach@croscal.local",
      name: "Coach User",
      password: await hash("coach123", 10),
      role: "COACH",
    },
  });

  // Client account
  await prisma.user.upsert({
    where: { email: "client@croscal.local" },
    update: {},
    create: {
      email: "client@croscal.local",
      name: "Client User",
      password: await hash("client123", 10),
      role: "CLIENT",
    },
  });

  console.log("Seed completed.");
  console.log(" Admin:  admin@croscal.local / admin123");
  console.log(" Coach:  coach@croscal.local / coach123");
  console.log(" Client: client@croscal.local / client123");
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

