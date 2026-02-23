import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import type { FocusScreenProps } from '../../navigation/types';

type MenuItem = {
    key: string;
    emoji: string;
    label: string;
    onPress: () => void;
};

export const MenuHomeScreen: React.FC<FocusScreenProps<'MenuHome'>> = ({ navigation }) => {
    const items: MenuItem[] = [
        { key: 'classes', emoji: '📚', label: 'Classes', onPress: () => (navigation as any).navigate('TasksTab', { screen: 'SubjectLibrary' }) },
        { key: 'exams', emoji: '✍️', label: 'Exams', onPress: () => (navigation as any).navigate('InsightsTab', { screen: 'ExamWarRoom' }) },
        { key: 'vacations', emoji: '🏝️', label: 'Vacations', onPress: () => (navigation as any).navigate('TasksTab', { screen: 'Calendar' }) },
        { key: 'xtra', emoji: '⚡', label: 'Xtra', onPress: () => (navigation as any).navigate('InsightsTab', { screen: 'StrategicAnalytics' }) },
        { key: 'focus', emoji: '⏳', label: 'Focus Timer', onPress: () => navigation.navigate('FocusSession') },
        { key: 'scan', emoji: '📸', label: 'Ai Schedule\nScan', onPress: () => (navigation as any).navigate('TasksTab', { screen: 'SyllabusDigitizer' }) },
        { key: 'sync', emoji: '🔗', label: 'Calendar Sync', onPress: () => (navigation as any).navigate('TasksTab', { screen: 'Calendar' }) },
        { key: 'setup', emoji: '🗓️', label: 'Schedule Set\nUp', onPress: () => (navigation as any).navigate('TasksTab', { screen: 'Planner' }) },
    ];

    return (
        <ScreenWrapper edges={['top', 'left', 'right']} scrollable={false}>
            <View style={styles.container}>
                <Text style={styles.title}>Menu</Text>

                <View style={styles.grid}>
                    {items.map((item) => (
                        <TouchableOpacity key={item.key} style={styles.card} activeOpacity={0.85} onPress={item.onPress}>
                            <Text style={styles.cardEmoji}>{item.emoji}</Text>
                            <Text style={styles.cardLabel}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#EEF1F4',
        paddingTop: Spacing['6'],
        paddingHorizontal: Spacing['4'],
    },
    title: {
        color: '#111827',
        fontSize: Typography.fontSize['3xl'],
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: Spacing['6'],
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: Spacing['3'],
    },
    card: {
        width: '31%',
        minHeight: 112,
        borderRadius: Radius.xl,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing['2'],
        paddingVertical: Spacing['3'],
    },
    cardEmoji: { fontSize: 34, marginBottom: Spacing['2'] },
    cardLabel: {
        color: '#4B5563',
        fontSize: Typography.fontSize.base,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 22,
    },
});
