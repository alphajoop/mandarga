import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  try {
    await prisma.$connect();
    console.log("✅ MongoDB connection successful!");

    const users = await prisma.user.findMany();
    console.log(`📊 Number of users: ${users.length}`);
  } catch (error) {
    console.error("❌ Connection error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
