import React from 'react';
import { PlaceholderScreen } from '../../components';
import type { TasksScreenProps } from '../../navigation/types';

export const PlannerScreen: React.FC<TasksScreenProps<'Planner'>> = () => (
    <PlaceholderScreen
        title="Planner"
        description="Review overdue and rescheduled tasks. Recovery mode for backlog management."
        plannedFeatures={[
            'Overdue task recovery list',
            'Reschedule with drag handles',
            'AI-generated recovery plan',
            'Priority re-weighting',
        ]}
    />
);
