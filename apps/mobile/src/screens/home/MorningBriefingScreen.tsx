import React from 'react';
import { PlaceholderScreen } from '../../components';
import type { HomeScreenProps } from '../../navigation/types';

export const MorningBriefingScreen: React.FC<HomeScreenProps<'MorningBriefing'>> = () => (
    <PlaceholderScreen
        title="Morning Briefing"
        description="Your AI-curated daily summary — tasks, habits, and focus recommendations."
        plannedFeatures={[
            'AI-generated daily briefing',
            'Today\'s schedule overview',
            'Habit completion reminders',
            'Weather & energy-aware suggestions',
            'Motivational progress summary',
        ]}
    />
);
