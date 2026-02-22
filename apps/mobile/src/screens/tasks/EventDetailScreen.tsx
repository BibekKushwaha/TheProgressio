import React from 'react';
import { PlaceholderScreen } from '../../components';
import type { TasksScreenProps } from '../../navigation/types';

export const EventDetailScreen: React.FC<TasksScreenProps<'EventDetail'>> = ({ route }) => (
    <PlaceholderScreen
        title="Event Detail"
        description={`Viewing ${route.params.eventType} event`}
        plannedFeatures={[
            'Event title, time, and location',
            'Linked tasks for this event',
            'Quick focus session launcher',
            'Edit / delete event',
        ]}
    />
);
