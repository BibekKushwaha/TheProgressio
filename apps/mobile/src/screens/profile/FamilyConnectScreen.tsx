import React from 'react';
import { PlaceholderScreen } from '../../components';
import type { ProfileScreenProps } from '../../navigation/types';

export const FamilyConnectScreen: React.FC<ProfileScreenProps<'FamilyConnect'>> = () => (
    <PlaceholderScreen
        title="Family Connect"
        description="Share your task and habit progress with family members."
        plannedFeatures={[
            'Linked family member list',
            'Task and habit visibility toggle per member',
            'Generate invite link / QR code',
            'Family activity feed',
        ]}
    />
);
