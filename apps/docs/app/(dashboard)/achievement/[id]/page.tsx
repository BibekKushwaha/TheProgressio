"use client";

import React, { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGetAchievementsQuery } from '@repo/store';
import AchievementDetailModal from '../../../../components/modals/achievement-detail-modal';

interface PageProps {
    params: Promise<{ id: string }>;
}

import { Skeleton } from '@/components/ui/skeleton';

const AchievementDetailPage = ({ params }: PageProps) => {
    const router = useRouter();
    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const { data: achievementsData, isLoading, isError } = useGetAchievementsQuery();
    const [isModalOpen, setIsModalOpen] = useState(true);

    const achievements = achievementsData?.achievements || [];
    const achievement = achievements.find(a => a.id === id);

    const handleClose = () => {
        setIsModalOpen(false);
        // Navigate back to achievements list after closing
        router.push('/achievement');
    };

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
                        We couldn&apos;t find the achievement you&apos;re looking for. It might have been removed or the ID is incorrect.
                    </p>
                    <button
                        onClick={() => router.push('/achievement')}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors"
                    >
                        Back to Achievements
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center p-4">
            <div className="text-center">
                <p className="text-slate-500 mb-4">Opening details for <b>{achievement.name}</b>...</p>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full transition-colors"
                >
                    Show Details
                </button>
            </div>

            <AchievementDetailModal
                isOpen={isModalOpen}
                onClose={handleClose}
                achievement={achievement}
            />
        </div>
    );
}

export default AchievementDetailPage;