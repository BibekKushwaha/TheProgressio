import { prisma } from "./client";

async function debugDB() {
    console.log("Checking DB connection...");
    // Note: accessing process.env.DATABASE_URL might not show if loaded via internal dotenv of prisma, 
    // but let's see if we can infer anything.

    try {
        // List all tables
        const tables: any[] = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
        console.log("Tables found:", tables);

        // Check User table specifically again, case insensitive
        const columns: any[] = await prisma.$queryRaw`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name ILIKE 'user';
    `;
        console.log("Columns for 'user' (case insensitive):", columns);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

debugDB();
