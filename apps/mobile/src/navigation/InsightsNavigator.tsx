import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme';
import type { InsightsStackParamList } from './types';
import { AnalyticsOverviewScreen } from '../screens/insights/AnalyticsOverviewScreen';
import { StrategicAnalyticsScreen } from '../screens/insights/StrategicAnalyticsScreen';
import { ExamWarRoomScreen } from '../screens/insights/ExamWarRoomScreen';
import { GPACalculatorScreen } from '../screens/insights/GPACalculatorScreen';
import { HabitGalleryScreen } from '../screens/insights/HabitGalleryScreen';
import { HabitDetailScreen } from '../screens/insights/HabitDetailScreen';
import { AchievementsScreen } from '../screens/insights/AchievementsScreen';
import { ReportsScreen } from '../screens/insights/ReportsScreen';

const Stack = createNativeStackNavigator<InsightsStackParamList>();

export const InsightsNavigator: React.FC = () => (
    <Stack.Navigator
        initialRouteName="AnalyticsOverview"
        screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
        }}
    >
        <Stack.Screen name="AnalyticsOverview" component={AnalyticsOverviewScreen} />
        <Stack.Screen name="StrategicAnalytics" component={StrategicAnalyticsScreen} />
        <Stack.Screen name="ExamWarRoom" component={ExamWarRoomScreen} />
        <Stack.Screen name="GPACalculator" component={GPACalculatorScreen} />
        <Stack.Screen name="HabitGallery" component={HabitGalleryScreen} />
        <Stack.Screen name="HabitDetail" component={HabitDetailScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
    </Stack.Navigator>
);
