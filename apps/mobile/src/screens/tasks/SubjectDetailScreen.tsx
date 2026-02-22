import React from 'react';
import { PlaceholderScreen } from '../../components';
import type { TasksScreenProps } from '../../navigation/types';

export const SubjectDetailScreen: React.FC<TasksScreenProps<'SubjectDetail'>> = ({ route }) => (
    <PlaceholderScreen
        title={route.params.subjectName}
        description="All tasks, classes, and notes for this subject."
        plannedFeatures={[
            'Task list filtered by subject',
            'Class schedule for this subject',
            'Grade entry shortcut',
            'Syllabus upload',
        ]}
    />
);
