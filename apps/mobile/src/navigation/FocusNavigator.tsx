import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme';
import type { FocusStackParamList } from './types';
import { MenuHomeScreen } from '../screens/menu/MenuHomeScreen';
import { FocusSessionScreen } from '../screens/focus/FocusSessionScreen';
import { SessionCompleteScreen } from '../screens/focus/SessionCompleteScreen';
import { FocusHistoryScreen } from '../screens/focus/FocusHistoryScreen';

const Stack = createNativeStackNavigator<FocusStackParamList>();

export const FocusNavigator: React.FC = () => (
    <Stack.Navigator
        initialRouteName="MenuHome"
        screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
        }}
    >
        <Stack.Screen name="MenuHome" component={MenuHomeScreen} />
        <Stack.Screen name="FocusSession" component={FocusSessionScreen} />
        <Stack.Screen
            name="SessionComplete"
            component={SessionCompleteScreen}
            options={{ presentation: 'modal', gestureEnabled: false }}
        />
        <Stack.Screen name="FocusHistory" component={FocusHistoryScreen} />
    </Stack.Navigator>
);
