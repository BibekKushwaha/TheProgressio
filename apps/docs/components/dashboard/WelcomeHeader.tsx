"use client"
import { CalendarDays } from 'lucide-react';
import { useAppSelector } from '@repo/store';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';

export function WelcomeHeader() {
    const user = useAppSelector((state) => state.auth.user);
    const router = useRouter();
    const username = user?.username?.trim() || 'there';

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <PageHeader
            title={`Welcome back, ${username} 👋`}
            subtitle={`Let's make today productive. It's ${today}`}
        >
            <Button
                onClick={() => router.push('/calendar')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-purple-500/25 h-12 px-6 rounded-xl font-bold"
            >
                <CalendarDays className="w-5 h-5 mr-2" />
                View Schedule
            </Button>
        </PageHeader>
    );
}
