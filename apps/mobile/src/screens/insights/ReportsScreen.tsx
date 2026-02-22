import React from 'react';
import { PlaceholderScreen } from '../../components';
import type { InsightsScreenProps } from '../../navigation/types';

export const ReportsScreen: React.FC<InsightsScreenProps<'Reports'>> = () => (
    <PlaceholderScreen
        title="Reports"
        description="Export analytics as PDF or share your progress summary."
        plannedFeatures={[
            'Weekly / monthly report generation',
            'Share as image or PDF',
            'Productivity score certificate',
        ]}
    />
);
