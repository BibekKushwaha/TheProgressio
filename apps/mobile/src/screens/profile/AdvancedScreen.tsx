import React from 'react';
import { PlaceholderScreen } from '../../components';
import type { ProfileScreenProps } from '../../navigation/types';

export const AdvancedScreen: React.FC<ProfileScreenProps<'Advanced'>> = () => (
    <PlaceholderScreen
        title="Advanced Settings"
        description="Power-user controls: sync, offline mode, data export, and dev tools."
        plannedFeatures={[
            'Offline/sync status panel',
            'Pending sync queue viewer',
            'Manual sync trigger',
            'Data export (JSON)',
            'Clear local cache',
        ]}
    />
);
