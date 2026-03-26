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
    },
    {
        key: 'EARLY_BIRD',
        name: 'Early Bird',
        description: 'Complete a task before 8 AM',
        icon: 'Award',
        type: 'TIME',
        goalValue: 1
    },
    {
        key: 'NIGHT_OWL',
        name: 'Night Owl',
        description: 'Complete a task after 10 PM',
        icon: 'Rocket',
        type: 'TIME',
        goalValue: 1
    },
    {
        key: 'STREAK_30',
        name: 'Consistent Scholar',
        description: 'Maintain a 30-day streak',
        icon: 'Crown',
        type: 'STREAK',
        goalValue: 30
    },
    {
        key: 'TASK_MASTER_100',
        name: 'Task Demolisher',
        description: 'Complete 100 tasks',
        icon: 'Sword',
        type: 'TASKS',
        goalValue: 100
    },
    {
        key: 'EXAM_ACE',
        name: 'Exam Ace',
        description: 'Score over 90% in an exam',
        icon: 'Medal',
        type: 'EXAM',
        goalValue: 90
    },
    {
        key: 'DEFENDER',
        name: 'Iron Shield',
        description: 'Resist 10 distractive websites during focus sessions',
        icon: 'Shield',
        type: 'FOCUS',
        goalValue: 10
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
