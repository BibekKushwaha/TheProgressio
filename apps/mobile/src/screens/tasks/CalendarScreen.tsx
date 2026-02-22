import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useGetCalendarDailyScheduleQuery, useGetMonthlyEventsQuery } from '@repo/store';
import type { TasksScreenProps } from '../../navigation/types';

type ViewMode = 'month' | 'week' | 'day';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const CalendarScreen: React.FC<TasksScreenProps<'Calendar'>> = ({ navigation }) => {
    const today = new Date();
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
    const [currentMonth, setCurrentMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });

    const { data: monthlyEvents } = useGetMonthlyEventsQuery({
        year: currentMonth.year,
        month: currentMonth.month + 1,
    } as any);
    const { data: dailySchedule } = useGetCalendarDailyScheduleQuery({ date: selectedDate } as any);

    const events = (monthlyEvents as any)?.events ?? {};
    const scheduleItems: any[] = (dailySchedule as any)?.items ?? [];

    // Build month grid
    const firstDay = new Date(currentMonth.year, currentMonth.month, 1).getDay();
    const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
    const cells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const prevMonth = () => setCurrentMonth((m) => {
        if (m.month === 0) return { year: m.year - 1, month: 11 };
        return { year: m.year, month: m.month - 1 };
    });

    const nextMonth = () => setCurrentMonth((m) => {
        if (m.month === 11) return { year: m.year + 1, month: 0 };
        return { year: m.year, month: m.month + 1 };
    });

    return (
        <ScreenWrapper scrollable>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>📅 Timetable</Text>
                <View style={styles.viewTabs}>
                    {(['month', 'week', 'day'] as ViewMode[]).map((v) => (
                        <TouchableOpacity
                            key={v}
                            style={[styles.viewTab, viewMode === v && styles.viewTabActive]}
                            onPress={() => setViewMode(v)}
                        >
                            <Text style={[styles.viewTabText, viewMode === v && styles.viewTabTextActive]}>
                                {v.charAt(0).toUpperCase() + v.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Month navigation */}
            <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                    <Text style={styles.navBtnText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthLabel}>
                    {MONTHS[currentMonth.month]} {currentMonth.year}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                    <Text style={styles.navBtnText}>›</Text>
                </TouchableOpacity>
            </View>

            {/* Week day headers */}
            <View style={styles.weekRow}>
                {WEEK_DAYS.map((d) => <Text key={d} style={styles.weekDay}>{d}</Text>)}
            </View>

            {/* Month grid */}
            <GlassCard style={styles.calGrid}>
                <View style={styles.gridWrap}>
                    {cells.map((day, i) => {
                        if (!day) return <View key={`e-${i}`} style={styles.dayCell} />;
                        const ds = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const hasEvents = events[ds] && events[ds].length > 0;
                        const isToday = ds === today.toISOString().split('T')[0];
                        const isSelected = ds === selectedDate;
                        return (
                            <TouchableOpacity
                                key={ds}
                                style={[styles.dayCell, isSelected && styles.dayCellSelected, isToday && !isSelected && styles.dayCellToday]}
                                onPress={() => setSelectedDate(ds)}
                            >
                                <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected, isToday && !isSelected && { color: Colors.primary }]}>
                                    {day}
                                </Text>
                                {hasEvents && <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </GlassCard>

            {/* Selected day schedule */}
            <Text style={styles.dayTitle}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>

            {scheduleItems.length === 0 && (
                <GlassCard>
                    <Text style={styles.emptyText}>Nothing scheduled for this day 🌤️</Text>
                </GlassCard>
            )}

            {scheduleItems.map((item: any, i: number) => (
                <TouchableOpacity
                    key={i}
                    onPress={() => navigation.navigate('EventDetail', { eventId: item.id, eventType: item.type ?? 'task' })}
                >
                    <GlassCard style={styles.scheduleCard}>
                        <View style={styles.scheduleRow}>
                            <View style={[styles.scheduleColor, { backgroundColor: item.color ?? Colors.primary }]} />
                            <View style={styles.scheduleInfo}>
                                <Text style={styles.scheduleTitle} numberOfLines={1}>{item.title}</Text>
                                {item.time && <Text style={styles.scheduleTime}>{item.time}</Text>}
                            </View>
                            <View style={[styles.typeBadge, { backgroundColor: item.type === 'exam' ? Colors.error + '20' : Colors.primary + '20' }]}>
                                <Text style={styles.typeText}>{item.type ?? 'task'}</Text>
                            </View>
                        </View>
                    </GlassCard>
                </TouchableOpacity>
            ))}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing['4'], marginBottom: Spacing['4'] },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700' },
    viewTabs: { flexDirection: 'row', gap: 2, backgroundColor: Colors.surface, borderRadius: Radius.full, padding: 2 },
    viewTab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
    viewTabActive: { backgroundColor: Colors.primary },
    viewTabText: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '500' },
    viewTabTextActive: { color: '#fff' },
    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['3'] },
    navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: Colors.surface },
    navBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xl },
    monthLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
    weekRow: { flexDirection: 'row', marginBottom: Spacing['2'] },
    weekDay: { flex: 1, textAlign: 'center', color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '500' },
    calGrid: { marginBottom: Spacing['4'] },
    gridWrap: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
    dayCellSelected: { backgroundColor: Colors.primary },
    dayCellToday: { borderWidth: 1, borderColor: Colors.primary },
    dayNumber: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
    dayNumberSelected: { color: '#fff', fontWeight: '700' },
    eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: 2 },
    eventDotSelected: { backgroundColor: '#fff' },
    dayTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing['3'] },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, textAlign: 'center', paddingVertical: Spacing['4'] },
    scheduleCard: { marginBottom: Spacing['2'], padding: Spacing['3'] },
    scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
    scheduleColor: { width: 4, height: 40, borderRadius: 2, flexShrink: 0 },
    scheduleInfo: { flex: 1 },
    scheduleTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    scheduleTime: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    typeBadge: { paddingHorizontal: Spacing['2'], paddingVertical: 3, borderRadius: Radius.full },
    typeText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '500', textTransform: 'capitalize' },
});
