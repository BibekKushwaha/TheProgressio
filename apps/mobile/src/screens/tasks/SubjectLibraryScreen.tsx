import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import type { TasksScreenProps } from '../../navigation/types';
import { useLocalCategories } from '../../hooks/useLocalCategories';

export const SubjectLibraryScreen: React.FC<TasksScreenProps<'SubjectLibrary'>> = ({ navigation }) => {
    const { categories: cats, isLoading, refresh } = useLocalCategories();

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.title}>📚 Subject Library</Text>
                <TouchableOpacity style={styles.addBtn}>
                    <Text style={styles.addText}>＋</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={cats}
                keyExtractor={(item: any) => item.id}
                refreshing={isLoading}
                onRefresh={refresh}
                contentContainerStyle={styles.list}
                numColumns={2}
                columnWrapperStyle={styles.row}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>{isLoading ? '⏳' : '📚'}</Text>
                        <Text style={styles.emptyText}>{isLoading ? 'Loading…' : 'No subjects yet. Add one!'}</Text>
                    </View>
                }
                renderItem={({ item }: { item: any }) => (
                    <TouchableOpacity
                        style={styles.subjectCard}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('SubjectDetail', { subjectId: item.id, subjectName: item.name })}
                    >
                        <View style={[styles.subjectIcon, { backgroundColor: (item.color ?? Colors.primary) + '20' }]}>
                            <Text style={styles.subjectEmoji}>{item.emoji ?? '📖'}</Text>
                        </View>
                        <Text style={styles.subjectName} numberOfLines={2}>{item.name}</Text>
                        {item.taskCount !== undefined && (
                            <Text style={styles.subjectCount}>{item.taskCount} tasks</Text>
                        )}
                    </TouchableOpacity>
                )}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing['4'], marginBottom: Spacing['4'] },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700' },
    addBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    addText: { color: '#fff', fontSize: 22, lineHeight: 28 },
    list: { gap: Spacing['3'], paddingBottom: 80 },
    row: { gap: Spacing['3'] },
    subjectCard: {
        flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
        borderRadius: Radius.xl, padding: Spacing['4'], alignItems: 'center', gap: Spacing['2'],
    },
    subjectIcon: { width: 52, height: 52, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
    subjectEmoji: { fontSize: 26 },
    subjectName: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600', textAlign: 'center' },
    subjectCount: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    emptyBox: { alignItems: 'center', paddingVertical: Spacing['16'] },
    emptyIcon: { fontSize: 48, marginBottom: Spacing['3'] },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
});
