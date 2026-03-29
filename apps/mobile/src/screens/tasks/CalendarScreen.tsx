import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    Switch,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    TaskStatus,
    useCreateHolidayMutation,
    useGetCalendarDailyScheduleQuery,
    useGetMonthlyEventsQuery,
} from '@repo/store';
import type { TasksScreenProps } from '../../navigation/types';
import { sanitizeTaskId } from '../../utils/task';
import { useLocalTasks } from '../../hooks/useLocalTasks';

type ViewMode = 'month' | 'day';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const normalizeDateInput = (input?: string): string | null => {
    if (!input) return null;
    const raw = String(input).trim();
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mm = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mm) || !Number.isFinite(d)) return null;
    const dt = new Date(y, mm - 1, d);
    if (Number.isNaN(dt.getTime())) return null;
    if (dt.getFullYear() !== y || dt.getMonth() !== mm - 1 || dt.getDate() !== d) return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
};

export const CalendarScreen: React.FC<TasksScreenProps<'Calendar'>> = ({ navigation, route }) => {
    const today = new Date();
    const routeDate = normalizeDateInput(route.params?.date);
    const initialDate = routeDate ?? toDateKey(today);
    const initialDateObj = new Date(`${initialDate}T12:00:00`);
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [showDailyDetail, setShowDailyDetail] = useState(Boolean(routeDate));
    const [holidayOpen, setHolidayOpen] = useState(false);
    const [holidayName, setHolidayName] = useState('');
    const [holidayStartDate, setHolidayStartDate] = useState(selectedDate);
    const [holidayEndDate, setHolidayEndDate] = useState(selectedDate);
    const [pauseNotifications, setPauseNotifications] = useState(true);
    const [currentMonth, setCurrentMonth] = useState({ year: initialDateObj.getFullYear(), month: initialDateObj.getMonth() });

    useEffect(() => {
        const next = normalizeDateInput(route.params?.date);
        if (!next) return;
        setSelectedDate(next);
        const nextDateObj = new Date(`${next}T12:00:00`);
        setCurrentMonth({ year: nextDateObj.getFullYear(), month: nextDateObj.getMonth() });
        setShowDailyDetail(true);
    }, [route.params?.date]);

    const { data: monthlyEvents, isLoading: monthlyLoading } = useGetMonthlyEventsQuery({
        year: currentMonth.year,
        month: currentMonth.month + 1,
    } as any);
    const { data: dailySchedule, isLoading: dailyLoading, refetch: refetchDaily } = useGetCalendarDailyScheduleQuery({ date: selectedDate } as any);
    const { tasks: pendingTasks } = useLocalTasks({ status: TaskStatus.PENDING });
    const [createHoliday, { isLoading: isCreatingHoliday }] = useCreateHolidayMutation();

    const events = (monthlyEvents as any) ?? {};
    const scheduleItems: any[] = Array.isArray((dailySchedule as any)?.items) ? (dailySchedule as any).items : [];
    const tasksAndExams = scheduleItems.filter((item) => item?.type === 'task' || item?.type === 'exam');
    const classItems = scheduleItems.filter((item) => item?.type === 'class');
    const conflicts = Array.isArray((dailySchedule as any)?.conflicts) ? (dailySchedule as any).conflicts : [];

    const upcomingTasks = useMemo(() => {
        const todayKey = toDateKey(new Date());
        return pendingTasks
            .filter((task: any) => {
                const due = String(task?.dueDate ?? '').slice(0, 10);
                return due && due >= todayKey;
            })
            .sort((a: any, b: any) => new Date(a?.dueDate ?? 0).getTime() - new Date(b?.dueDate ?? 0).getTime())
            .slice(0, 6);
    }, [pendingTasks]);

    const firstDay = new Date(currentMonth.year, currentMonth.month, 1).getDay();
    const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
    const cells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const prevMonth = () => setCurrentMonth((m) => (m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 }));
    const nextMonth = () => setCurrentMonth((m) => (m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }));

    const handleDateSelect = (dateKey: string) => {
        setSelectedDate(dateKey);
        if (viewMode === 'month') setShowDailyDetail(true);
    };

    const handleViewChange = (nextView: ViewMode) => {
        setViewMode(nextView);
        setShowDailyDetail(nextView === 'day');
    };

    const openHolidayModal = () => {
        setHolidayName('');
        setHolidayStartDate(selectedDate);
        setHolidayEndDate(selectedDate);
        setPauseNotifications(true);
        setHolidayOpen(true);
    };

    const handleCreateHoliday = async () => {
        if (!holidayName.trim() || !holidayStartDate || !holidayEndDate) return;
        try {
            await createHoliday({
                name: holidayName.trim(),
                startDate: holidayStartDate,
                endDate: holidayEndDate,
                pauseNotifications,
            }).unwrap();
            setHolidayOpen(false);
            Alert.alert('Success', 'Holiday created.');
            refetchDaily();
        } catch {
            Alert.alert('Create failed', 'Could not create holiday. Please check date format (YYYY-MM-DD).');
        }
    };

    const selectedDateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
    });

    return (
        <ScreenWrapper scrollable>
            <View style={styles.header}>
                <View>
                    <View style={styles.headerTop}>
                        <Text style={styles.title}>{viewMode === 'day' ? 'Day' : 'Month'}</Text>
                        <View style={styles.syncedPill}>
                            <Text style={styles.syncedDot}>✓</Text>
                            <Text style={styles.syncedText}>Synced</Text>
                        </View>
                    </View>
                    <Text style={styles.subTitle}>
                        {new Date(currentMonth.year, currentMonth.month, 1).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                        })}
                    </Text>
                </View>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.holidayBtn} onPress={openHolidayModal}>
                    <Text style={styles.holidayBtnText}>Holiday</Text>
                </TouchableOpacity>

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

                <View style={styles.viewTabs}>
                    {(['day', 'month'] as ViewMode[]).map((v) => (
                        <TouchableOpacity
                            key={v}
                            style={[styles.viewTab, viewMode === v && styles.viewTabActive]}
                            onPress={() => handleViewChange(v)}
                        >
                            <Text style={[styles.viewTabText, viewMode === v && styles.viewTabTextActive]}>
                                {v.charAt(0).toUpperCase() + v.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {(viewMode === 'month' || viewMode === 'day') && (
                <>
                    <View style={styles.weekRow}>
                        {WEEK_DAYS.map((d) => <Text key={d} style={styles.weekDay}>{d}</Text>)}
                    </View>

                    <GlassCard style={styles.calGrid}>
                        <View style={styles.gridWrap}>
                            {cells.map((day, i) => {
                                if (!day) return <View key={`e-${i}`} style={styles.dayCell} />;
                                const ds = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const count = Number(events?.[ds]?.taskCount ?? 0) + Number(events?.[ds]?.examCount ?? 0);
                                const hasEvents = count > 0;
                                const isToday = ds === toDateKey(today);
                                const isSelected = ds === selectedDate;
                                return (
                                    <TouchableOpacity
                                        key={ds}
                                        style={[styles.dayCell, isSelected && styles.dayCellSelected, isToday && !isSelected && styles.dayCellToday]}
                                        onPress={() => handleDateSelect(ds)}
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
                </>
            )}

            {viewMode === 'month' && !showDailyDetail ? (
                <GlassCard style={styles.panel}>
                    <Text style={styles.panelTitle}>Upcoming Tasks</Text>
                    {upcomingTasks.length === 0 ? (
                        <Text style={styles.emptyText}>No upcoming tasks.</Text>
                    ) : upcomingTasks.map((task: any) => {
                        const taskId = sanitizeTaskId(task?.id);
                        return (
                            <TouchableOpacity
                                key={taskId ?? task?.title}
                                style={styles.upcomingRow}
                                disabled={!taskId}
                                onPress={() => taskId && navigation.navigate('TaskDetail', { taskId })}
                            >
                                <View style={styles.upcomingDot} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.upcomingTitle} numberOfLines={1}>{String(task?.title ?? 'Task')}</Text>
                                    <Text style={styles.upcomingMeta}>
                                        {task?.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </GlassCard>
            ) : (
                <View style={styles.detailWrap}>
                    <GlassCard style={styles.panel}>
                        <View style={styles.panelHeader}>
                            <View>
                                <Text style={styles.panelTitle}>Schedule Detail</Text>
                                <Text style={styles.panelDate}>{selectedDateLabel}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.focusSuggestBtn}
                                onPress={() => (navigation as any).navigate('MenuTab', { screen: 'FocusSession' })}
                            >
                                <Text style={styles.focusSuggestText}>✨ Suggest Study Blocks</Text>
                            </TouchableOpacity>
                        </View>

                        {dailyLoading || monthlyLoading ? (
                            <ActivityIndicator color={Colors.primary} />
                        ) : tasksAndExams.length === 0 ? (
                            <Text style={styles.emptyText}>No tasks or exams for this day.</Text>
                        ) : tasksAndExams.map((item: any, i: number) => {
                            const eventId = sanitizeTaskId(item?.id);
                            const isTask = item?.type === 'task';
                            return (
                                <TouchableOpacity
                                    key={eventId ?? `sched-${i}`}
                                    style={styles.scheduleCard}
                                    disabled={!eventId}
                                    onPress={() => eventId && navigation.navigate('EventDetail', { eventId, eventType: item.type ?? 'task' })}
                                >
                                    <View style={[styles.scheduleColor, { backgroundColor: item?.color ?? Colors.primary }]} />
                                    <View style={styles.scheduleInfo}>
                                        <Text style={styles.scheduleTitle} numberOfLines={1}>{String(item?.title ?? 'Untitled')}</Text>
                                        <Text style={styles.scheduleTime}>
                                            {item?.startTime === '00:00' ? 'All Day' : `${item?.startTime ?? ''} - ${item?.endTime ?? ''}`}
                                        </Text>
                                    </View>
                                    {isTask && <Text style={styles.openHint}>Open</Text>}
                                </TouchableOpacity>
                            );
                        })}
                    </GlassCard>

                    <GlassCard style={styles.panel}>
                        <Text style={styles.panelTitle}>Upcoming Classes</Text>
                        {classItems.length === 0 ? (
                            <Text style={styles.emptyText}>No classes today.</Text>
                        ) : classItems.map((item: any, i: number) => (
                            <View key={`class-${i}`} style={styles.classRow}>
                                <View style={styles.classAvatar}>
                                    <Text style={styles.classAvatarText}>{String(item?.subject ?? 'CL').slice(0, 2).toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.classTitle} numberOfLines={1}>{String(item?.title ?? 'Class')}</Text>
                                    <Text style={styles.classMeta}>{item?.startTime ?? '--:--'} • {String(item?.subtitle ?? item?.subject ?? '')}</Text>
                                </View>
                            </View>
                        ))}
                    </GlassCard>

                    {conflicts.length > 0 && (
                        <GlassCard style={styles.conflictCard}>
                            <Text style={styles.conflictTitle}>Scheduling Conflicts</Text>
                            {conflicts.map((c: any) => (
                                <Text key={String(c.id)} style={styles.conflictItem}>
                                    {String(c.message)} — {String(c.startsAt)} to {String(c.endsAt)}
                                </Text>
                            ))}
                        </GlassCard>
                    )}
                </View>
            )}

            <Modal visible={holidayOpen} transparent animationType="slide" onRequestClose={() => setHolidayOpen(false)}>
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setHolidayOpen(false)}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Create Holiday</Text>
                        <Text style={styles.inputLabel}>Name</Text>
                        <TextInput
                            value={holidayName}
                            onChangeText={setHolidayName}
                            style={styles.input}
                            placeholder="e.g. Diwali Break"
                            placeholderTextColor={Colors.textMuted}
                        />
                        <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
                        <TextInput
                            value={holidayStartDate}
                            onChangeText={setHolidayStartDate}
                            style={styles.input}
                            placeholder="2026-02-23"
                            placeholderTextColor={Colors.textMuted}
                        />
                        <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
                        <TextInput
                            value={holidayEndDate}
                            onChangeText={setHolidayEndDate}
                            style={styles.input}
                            placeholder="2026-02-24"
                            placeholderTextColor={Colors.textMuted}
                        />
                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>Pause notifications</Text>
                            <Switch value={pauseNotifications} onValueChange={setPauseNotifications} />
                        </View>
                        <View style={styles.modalActionRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setHolidayOpen(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.createBtn, (!holidayName.trim() || isCreatingHoliday) && { opacity: 0.6 }]}
                                onPress={() => void handleCreateHoliday()}
                                disabled={!holidayName.trim() || isCreatingHoliday}
                            >
                                {isCreatingHoliday ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createText}>Create</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { paddingTop: Spacing['4'], marginBottom: Spacing['3'] },
    headerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize['3xl'], fontWeight: '700' },
    subTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, marginTop: 4 },
    syncedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: `${Colors.success}22`,
        borderWidth: 1,
        borderColor: `${Colors.success}44`,
        paddingHorizontal: Spacing['2'],
        paddingVertical: 2,
        borderRadius: Radius.full,
    },
    syncedDot: { color: Colors.success, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    syncedText: { color: Colors.success, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    actionRow: { gap: Spacing['3'], marginBottom: Spacing['3'] },
    holidayBtn: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, paddingHorizontal: Spacing['3'], paddingVertical: Spacing['2'] },
    holidayBtnText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: Colors.surface },
    navBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xl },
    monthLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
    viewTabs: { flexDirection: 'row', gap: 2, backgroundColor: Colors.surface, borderRadius: Radius.full, padding: 2, alignSelf: 'flex-end' },
    viewTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
    viewTabActive: { backgroundColor: Colors.primary },
    viewTabText: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '600' },
    viewTabTextActive: { color: '#fff' },
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
    panel: { marginBottom: Spacing['3'] },
    panelHeader: { gap: Spacing['2'], marginBottom: Spacing['2'] },
    panelTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    panelDate: { color: Colors.primaryLight, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    detailWrap: { marginBottom: Spacing['6'] },
    focusSuggestBtn: { alignSelf: 'flex-start', backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingHorizontal: Spacing['3'], paddingVertical: Spacing['2'] },
    focusSuggestText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '700' },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, textAlign: 'center', paddingVertical: Spacing['4'] },
    scheduleCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], marginBottom: Spacing['2'], backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing['3'] },
    scheduleColor: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
    scheduleInfo: { flex: 1 },
    scheduleTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    scheduleTime: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    openHint: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    classRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], marginBottom: Spacing['2'], backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing['3'] },
    classAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${Colors.primary}22`, alignItems: 'center', justifyContent: 'center' },
    classAvatarText: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    classTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    classMeta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    conflictCard: { backgroundColor: `${Colors.error}11`, borderColor: `${Colors.error}44`, borderWidth: 1, marginBottom: Spacing['6'] },
    conflictTitle: { color: Colors.error, fontSize: Typography.fontSize.sm, fontWeight: '700', marginBottom: Spacing['2'] },
    conflictItem: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginBottom: 3 },
    upcomingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing['2'], paddingVertical: Spacing['2'] },
    upcomingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
    upcomingTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    upcomingMeta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing['5'], paddingBottom: 40 },
    modalTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700', marginBottom: Spacing['3'] },
    inputLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600', marginBottom: Spacing['1'], marginTop: Spacing['2'] },
    input: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing['3'], paddingVertical: Spacing['2'] },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing['3'] },
    switchLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm },
    modalActionRow: { flexDirection: 'row', gap: Spacing['2'], marginTop: Spacing['4'] },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing['3'], alignItems: 'center' },
    cancelText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    createBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing['3'], alignItems: 'center' },
    createText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '700' },
});
