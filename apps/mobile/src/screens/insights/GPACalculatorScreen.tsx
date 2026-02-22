import React from 'react';
import { PlaceholderScreen } from '../../components';
import type { InsightsScreenProps } from '../../navigation/types';

export const GPACalculatorScreen: React.FC<InsightsScreenProps<'GPACalculator'>> = () => (
    <PlaceholderScreen
        title="GPA Calculator"
        description="Enter grades, simulate what-ifs, and predict your semester GPA."
        plannedFeatures={[
            'Grade entry cards (scrollable list)',
            'What-if GPA simulator',
            'Subject grade predictor',
            'Course grade rollup',
        ]}
    />
);
