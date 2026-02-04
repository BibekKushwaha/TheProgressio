import { prisma } from "./client";

async function checkColumns() {
    try {
        const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User';
    `;
        console.log("Columns in User table:", result);
    } catch (error) {
        console.error("Error checking columns:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkColumns();
