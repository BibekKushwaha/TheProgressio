"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useGetAchievementsQuery } from "@repo/store";
import AchievementDetailModal from "@/components/modals/achievement-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";

const AchievementDetailPage = () => {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const achievementId = params?.id;
    const { data: achievementsData, isLoading, isError } = useGetAchievementsQuery();
    const [isModalOpen, setIsModalOpen] = useState(true);

    const achievements = useMemo(
        () => achievementsData?.achievements ?? [],
        [achievementsData?.achievements]
    );
    const achievement = useMemo(
        () => achievements.find((item) => item.id === achievementId),
        [achievementId, achievements]
    );

    const handleClose = () => {
        setIsModalOpen(false);
        router.push("/achievement");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
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

    if (!achievementId || isError || !achievement) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-md">
                    <h1 className="text-2xl font-bold text-red-400 mb-2">Achievement Not Found</h1>
                    <p className="text-slate-400 mb-6">
                        We could not find this achievement. It may have been removed or the link is invalid.
                    </p>
                    <button
                        onClick={() => router.push("/achievement")}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Achievements
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 flex items-center justify-center p-4">
            <div className="text-center">
                <div className="inline-flex items-center gap-2 text-slate-400 mb-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Opening details for <b className="text-white">{achievement.name}</b>
                </div>
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
};

export default AchievementDetailPage;
