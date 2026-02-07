"use client";

import React, { useState } from 'react';
import { Code } from 'lucide-react';
import AchievementDetailModal from '../../../../components/modals/achievement-detail-modal';

const achievement = {
    name: "codeing",
    description: "codeing is a habit",
    date: "2026-02-06",
    icon: Code,
}

const AchievementDetailPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(true);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 flex items-center justify-center p-4">
            <AchievementDetailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} achievement={achievement} />
        </div>
    );
}

export default AchievementDetailPage;