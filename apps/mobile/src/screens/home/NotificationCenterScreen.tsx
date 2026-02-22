import React from 'react';
import { PlaceholderScreen } from '../../components';
import type { HomeScreenProps } from '../../navigation/types';

export const NotificationCenterScreen: React.FC<HomeScreenProps<'NotificationCenter'>> = () => (
    <PlaceholderScreen
        title="Notifications"
        description="All alerts, nudges, and AI-generated insights in one place."
        plannedFeatures={[
            'Push notification history',
            'Habit nudges and reminders',
            'AI-generated study alerts',
            'Family activity updates',
            'Mark all as read',
        ]}
    />
);
