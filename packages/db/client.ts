import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

const DEFAULT_DEV_CONNECTION_STRING = "postgresql://postgres:password@localhost:5432/transition";
const configuredConnectionString = process.env.DATABASE_URL?.trim();

if (!configuredConnectionString && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL must be set when NODE_ENV=production");
}

const connectionString = configuredConnectionString || DEFAULT_DEV_CONNECTION_STRING;

const pool = globalForPrisma.pgPool ?? new Pool({ connectionString });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg(pool) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}
