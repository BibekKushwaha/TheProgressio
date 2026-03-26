import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme';
import type { ProfileStackParamList } from './types';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { FamilyConnectScreen } from '../screens/profile/FamilyConnectScreen';
import { FamilyInviteScreen } from '../screens/profile/FamilyInviteScreen';
import { SubscriptionScreen } from '../screens/profile/SubscriptionScreen';
import { AdvancedScreen } from '../screens/profile/AdvancedScreen';
import { AdminDashboardScreen } from '../screens/profile/AdminDashboardScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileNavigator: React.FC = () => (
    <Stack.Navigator
        initialRouteName="Profile"
        screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
        }}
    >
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="FamilyConnect" component={FamilyConnectScreen} />
        <Stack.Screen name="FamilyInvite" component={FamilyInviteScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="Advanced" component={AdvancedScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    </Stack.Navigator>
);
