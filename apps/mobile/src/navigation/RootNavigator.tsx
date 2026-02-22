import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme';
import type { RootStackParamList } from './types';
import { useAppSelector } from '@repo/store';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
    // Auth guard – reads from the shared Redux slice
    const isAuthenticated = useAppSelector(
        (state: any) => Boolean(state.auth?.isAuthenticated || state.auth?.user)
    );

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
                animation: 'fade',
            }}
        >
            {isAuthenticated ? (
                <Stack.Screen name="App" component={TabNavigator} />
            ) : (
                <Stack.Screen name="Auth" component={AuthNavigator} />
            )}
        </Stack.Navigator>
    );
};
