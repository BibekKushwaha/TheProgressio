import React from 'react';
import { PlaceholderScreen } from '../../components';
import type { ProfileScreenProps } from '../../navigation/types';

export const FamilyInviteScreen: React.FC<ProfileScreenProps<'FamilyInvite'>> = ({ route }) => (
    <PlaceholderScreen
        title="Accept Family Invite"
        description={`You've been invited to join a family group. Token: ${route.params.token}`}
        plannedFeatures={[
            'Invite details (inviter name)',
            'Accept / decline CTA',
            'Auto-navigate to FamilyConnect on accept',
        ]}
    />
);
