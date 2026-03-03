"use client";

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useGetAchievementsQuery } from '@repo/store';
import AchievementDetailModal from '../../../../components/modals/achievement-detail-modal';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ id: string }>;
}

const AchievementDetailPage = ({ params }: PageProps) => {
    const router = useRouter();
    const { id } = use(params);

    const { data: achievementsData, isLoading, isError } = useGetAchievementsQuery();
    const achievements = achievementsData?.achievements ?? [];
    const achievement = achievements.find(a => a.id === id);

    const handleClose = () => router.push('/achievement');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="w-full max-w-xl space-y-4">
                    <Skeleton className="h-12 w-3/4 mx-auto bg-white/5" />
                    <Skeleton className="h-64 w-full rounded-3xl bg-white/5" />
                    <div className="flex justify-center gap-4">
                        <Skeleton className="h-10 w-32 rounded-full bg-white/5" />
                        <Skeleton className="h-10 w-32 rounded-full bg-white/5" />
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !achievement) {
        return (
            <div className="flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-md">
                    <h1 className="text-2xl font-bold text-red-400 mb-2">Achievement Not Found</h1>
                    <p className="text-slate-400 mb-6">
                        We couldn&apos;t find the achievement you&apos;re looking for.
                    </p>
                    <Link
                        href="/achievement"
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors inline-block"
                    >
                        Back to Achievements
                    </Link>
                </div>
            </div>
        );
    }

    // Render the detail modal immediately open. When it closes, navigate back
    // to the list. This keeps deep-link URLs working while providing the
    // polished modal experience for in-app navigation.
    return (
        <AchievementDetailModal
            isOpen
            onClose={handleClose}
            achievement={achievement}
        />
    );
};

export default AchievementDetailPage;