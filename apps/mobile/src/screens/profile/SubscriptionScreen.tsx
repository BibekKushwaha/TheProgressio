import React from 'react';
import { PlaceholderScreen } from '../../components';
import type { ProfileScreenProps } from '../../navigation/types';

export const SubscriptionScreen: React.FC<ProfileScreenProps<'Subscription'>> = () => (
    <PlaceholderScreen
        title="Subscription"
        description="Upgrade to unlock unlimited tasks, advanced analytics, and AI features."
        plannedFeatures={[
            'Plan comparison cards (Free, Pro, Family)',
            'In-app purchase via paymentApi',
            'Active subscription status',
            'Restore purchases',
        ]}
    />
);
