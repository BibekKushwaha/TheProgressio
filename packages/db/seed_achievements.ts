import "dotenv/config";
import { prisma } from "./index.js";

const achievements = [
    {
        key: 'FIRST_SESSION',
        name: 'First Focus',
        description: 'Complete your first focus session',
        icon: 'Target',
        type: 'FOCUS',
        goalValue: 1
    },
    {
        key: 'STREAK_3',
        name: 'Consistency Kickstart',
        description: 'Maintain a 3-day streak',
        icon: 'Zap',
        type: 'STREAK',
        goalValue: 3
    },
    {
        key: 'STREAK_7',
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: 'Flame',
        type: 'STREAK',
        goalValue: 7
    },
    {
        key: 'FOCUS_MASTER',
        name: 'Focus Master',
        description: 'Accumulate 10 hours of focus time',
        icon: 'Star',
        type: 'TIME',
        goalValue: 600 // 600 minutes = 10 hours
    },
    {
        key: 'DEEP_DIVE',
        name: 'Deep Diver',
        description: 'Complete a single focus session of 60+ minutes',
        icon: 'Trophy',
        type: 'SESSION',
        goalValue: 60
    }
];

async function main() {
    console.log('Seeding achievements...');
    for (const achievement of achievements) {
        await prisma.achievement.upsert({
            where: { key: achievement.key },
            update: achievement,
            create: achievement
        });
    }
    console.log('Achievements seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
