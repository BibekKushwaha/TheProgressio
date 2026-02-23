import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme';
import type { HomeStackParamList } from './types';
import { DashboardScreen } from '../screens/home/DashboardScreen';
import { NotificationCenterScreen } from '../screens/home/NotificationCenterScreen';
import { MorningBriefingScreen } from '../screens/home/MorningBriefingScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export const HomeNavigator: React.FC = () => (
    <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
        }}
    >
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen
            name="NotificationCenter"
            component={NotificationCenterScreen}
            options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="MorningBriefing" component={MorningBriefingScreen} />
    </Stack.Navigator>
);
