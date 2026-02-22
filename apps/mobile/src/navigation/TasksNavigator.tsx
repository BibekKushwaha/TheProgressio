import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme';
import type { TasksStackParamList } from './types';
import { TaskListScreen } from '../screens/tasks/TaskListScreen';
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen';
import { CreateTaskScreen } from '../screens/tasks/CreateTaskScreen';
import { SubjectLibraryScreen } from '../screens/tasks/SubjectLibraryScreen';
import { SubjectDetailScreen } from '../screens/tasks/SubjectDetailScreen';
import { CalendarScreen } from '../screens/tasks/CalendarScreen';
import { EventDetailScreen } from '../screens/tasks/EventDetailScreen';
import { PlannerScreen } from '../screens/tasks/PlannerScreen';
import { SyllabusDigitizerScreen } from '../screens/tasks/SyllabusDigitizerScreen';

const Stack = createNativeStackNavigator<TasksStackParamList>();

export const TasksNavigator: React.FC = () => (
    <Stack.Navigator
        initialRouteName="TaskList"
        screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
        }}
    >
        <Stack.Screen name="TaskList" component={TaskListScreen} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
        <Stack.Screen
            name="CreateTask"
            component={CreateTaskScreen}
            options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="SubjectLibrary" component={SubjectLibraryScreen} />
        <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
        <Stack.Screen name="Calendar" component={CalendarScreen} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        <Stack.Screen name="Planner" component={PlannerScreen} />
        <Stack.Screen
            name="SyllabusDigitizer"
            component={SyllabusDigitizerScreen}
            options={{ presentation: 'fullScreenModal' }}
        />
    </Stack.Navigator>
);
