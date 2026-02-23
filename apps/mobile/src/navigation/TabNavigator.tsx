import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet, View } from 'react-native';
import { Colors, Typography } from '../theme';
import type { TabParamList } from './types';
import { HomeNavigator } from './HomeNavigator';
import { TasksNavigator } from './TasksNavigator';
import { FocusNavigator } from './FocusNavigator';
import { InsightsNavigator } from './InsightsNavigator';
import { ProfileNavigator } from './ProfileNavigator';

const Tab = createBottomTabNavigator<TabParamList>();

// Tab icon with emoji + label
const TabIcon = ({
    emoji,
    label,
    focused,
}: {
    emoji: string;
    label: string;
    focused: boolean;
}) => (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Text style={styles.emoji}>{emoji}</Text>
        {focused && <View style={styles.activeDot} />}
    </View>
);

export const TabNavigator: React.FC = () => (
    <Tab.Navigator
        initialRouteName="HomeTab"
        screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarShowLabel: true,
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.tabInactive,
            tabBarLabelStyle: styles.tabLabel,
        }}
    >
        <Tab.Screen
            name="HomeTab"
            component={HomeNavigator}
            options={{
                tabBarLabel: 'Home',
                tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} />,
            }}
        />
        <Tab.Screen
            name="TasksTab"
            component={TasksNavigator}
            listeners={({ navigation }) => ({
                tabPress: () => {
                    // Always land on the task list when selecting the Tasks tab.
                    // This prevents stale nested state from trapping users on an invalid detail route.
                    (navigation as any).navigate('TasksTab', { screen: 'TaskList' });
                },
            })}
            options={{
                tabBarLabel: 'Tasks',
                tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Tasks" focused={focused} />,
            }}
        />
        <Tab.Screen
            name="MenuTab"
            component={FocusNavigator}
            options={{
                tabBarLabel: 'Menu',
                tabBarIcon: ({ focused }) => <TabIcon emoji="🔲" label="Menu" focused={focused} />,
            }}
        />
        <Tab.Screen
            name="InsightsTab"
            component={InsightsNavigator}
            options={{
                tabBarLabel: 'Insights',
                tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Insights" focused={focused} />,
            }}
        />
        <Tab.Screen
            name="ProfileTab"
            component={ProfileNavigator}
            options={{
                tabBarLabel: 'Profile',
                tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} />,
            }}
        />
    </Tab.Navigator>
);

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: Colors.tabBackground,
        borderTopWidth: 1,
        borderTopColor: Colors.tabBorder,
        paddingTop: 6,
        paddingBottom: 4,
        height: 64,
    },
    tabLabel: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '500',
        marginTop: -2,
    },
    iconWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 2,
    },
    iconWrapActive: {
        position: 'relative',
    },
    emoji: { fontSize: 20 },
    activeDot: {
        position: 'absolute',
        bottom: -6,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.primary,
    },
});
