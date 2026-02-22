import React from 'react';
import { PlaceholderScreen } from '../../components';
import type { TasksScreenProps } from '../../navigation/types';

export const SyllabusDigitizerScreen: React.FC<TasksScreenProps<'SyllabusDigitizer'>> = () => (
    <PlaceholderScreen
        title="Syllabus Digitizer"
        description="Scan your syllabus and auto-generate tasks from it using AI."
        plannedFeatures={[
            'expo-camera document scanner',
            'expo-document-picker for PDF upload',
            'OCR + AI extraction preview',
            'Review and confirm generated tasks',
            'Bulk-create tasks into planner',
        ]}
    />
);
