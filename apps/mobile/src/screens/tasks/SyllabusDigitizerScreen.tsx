import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useScanSyllabusMutation,
    PriorityEnum,
    TaskStatus,
    useAppSelector,
} from '@repo/store';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { TasksScreenProps } from '../../navigation/types';
import { localTasks } from '../../native/localDbAdapter';

type ParsedItem = {
    title: string;
    description?: string;
    dueDate?: string;
    priority?: string;
    subject?: string;
};

export const SyllabusDigitizerScreen: React.FC<TasksScreenProps<'SyllabusDigitizer'>> = ({ navigation }) => {
    const userId = useAppSelector((state: any) => state.auth?.user?.id) as string | undefined;
    const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
    const [scanSyllabus, { isLoading: isScanning }] = useScanSyllabusMutation();
    const [isCreating, setIsCreating] = useState(false);
    const [items, setItems] = useState<ParsedItem[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());

    const selectedCount = selected.size;

    const pickFile = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
            copyToCacheDirectory: true,
            multiple: false,
        });

        if (!result.canceled && result.assets?.[0]) {
            setPickedFile(result.assets[0]);
            setItems([]);
            setSelected(new Set());
        }
    };

    const runScan = async () => {
        if (!pickedFile?.uri) return;

        try {
            const base64 = await FileSystem.readAsStringAsync(pickedFile.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            const response = await scanSyllabus({
                imageBase64: base64,
                mimeType: pickedFile.mimeType || 'application/pdf',
            }).unwrap();

            const parsed = Array.isArray((response as any)?.items) ? (response as any).items : [];
            setItems(parsed);
            setSelected(new Set(parsed.map((_: any, idx: number) => idx)));
        } catch {
            setItems([]);
            setSelected(new Set());
        }
    };

    const toggle = (idx: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const createSelectedTasks = async () => {
        if (!userId) return;
        setIsCreating(true);
        const selectedItems = items.filter((_, idx) => selected.has(idx));
        for (const item of selectedItems) {
            try {
                await localTasks.create({
                    userId,
                    title: item.title,
                    description: item.description ?? null,
                    dueDate: item.dueDate ?? null,
                    priority: (item.priority as PriorityEnum) || PriorityEnum.MEDIUM,
                    isRecurring: false,
                });
            } catch {
                /* continue */
            }
        }
        setIsCreating(false);
        navigation.goBack();
    };

    const fileMeta = useMemo(() => {
        if (!pickedFile) return null;
        return `${pickedFile.name}${pickedFile.size ? ` • ${Math.round(pickedFile.size / 1024)} KB` : ''}`;
    }, [pickedFile]);

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Tasks'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Syllabus Digitizer</Text>
                <View style={{ width: 24 }} />
            </View>

            <GlassCard style={styles.uploadCard}>
                <Text style={styles.cardTitle}>Upload Syllabus</Text>
                <TouchableOpacity style={styles.secondaryBtn} onPress={pickFile}>
                    <Text style={styles.secondaryBtnText}>
                        {pickedFile ? 'Change file' : 'Pick PDF / image'}
                    </Text>
                </TouchableOpacity>
                {fileMeta && <Text style={styles.fileMeta}>{fileMeta}</Text>}
                <TouchableOpacity
                    style={[styles.scanBtn, (!pickedFile || isScanning) && styles.disabled]}
                    onPress={runScan}
                    disabled={!pickedFile || isScanning}
                >
                    <Text style={styles.scanBtnText}>{isScanning ? 'Scanning…' : 'Extract Tasks'}</Text>
                </TouchableOpacity>
            </GlassCard>

            <Text style={styles.sectionTitle}>Extracted Items</Text>
            <FlatList
                data={items}
                keyExtractor={(item, idx) => `${item.title}-${idx}`}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <GlassCard>
                        <Text style={styles.emptyText}>
                            {isScanning ? 'Processing file…' : 'Upload and scan a syllabus to preview generated tasks.'}
                        </Text>
                    </GlassCard>
                }
                renderItem={({ item, index }) => {
                    const isSelected = selected.has(index);
                    return (
                        <TouchableOpacity activeOpacity={0.85} onPress={() => toggle(index)}>
                            <GlassCard style={[styles.itemCard, isSelected && styles.itemSelected]}>
                                <View style={styles.itemRow}>
                                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                                        {isSelected && <Text style={styles.check}>✓</Text>}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemTitle}>{item.title}</Text>
                                        <Text style={styles.itemMeta}>
                                            {(item.subject || 'General')}{item.priority ? ` • ${item.priority}` : ''}
                                        </Text>
                                    </View>
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    );
                }}
            />

            {items.length > 0 && (
                <TouchableOpacity
                    style={[styles.createBtn, (isCreating || selectedCount === 0) && styles.disabled]}
                    onPress={createSelectedTasks}
                    disabled={isCreating || selectedCount === 0}
                >
                    <Text style={styles.createBtnText}>
                        {isCreating ? 'Creating tasks…' : `Create ${selectedCount} tasks`}
                    </Text>
                </TouchableOpacity>
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Spacing['4'],
        marginBottom: Spacing['4'],
    },
    back: { color: Colors.primaryLight, fontSize: Typography.fontSize.base },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    uploadCard: { marginBottom: Spacing['4'] },
    cardTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700', marginBottom: Spacing['2'] },
    secondaryBtn: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        paddingVertical: Spacing['3'],
    },
    secondaryBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    fileMeta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: Spacing['2'] },
    scanBtn: {
        marginTop: Spacing['3'],
        backgroundColor: Colors.primary,
        borderRadius: Radius.md,
        alignItems: 'center',
        paddingVertical: Spacing['3'],
    },
    scanBtnText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '600' },
    sectionTitle: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing['2'],
    },
    list: { gap: Spacing['2'], paddingBottom: Spacing['4'] },
    itemCard: { marginBottom: Spacing['2'] },
    itemSelected: { borderColor: `${Colors.primary}66` },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    check: { color: '#fff', fontSize: 12, fontWeight: '700' },
    itemTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    itemMeta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
    createBtn: {
        backgroundColor: Colors.success,
        borderRadius: Radius.md,
        alignItems: 'center',
        paddingVertical: Spacing['3'],
        marginBottom: Spacing['4'],
    },
    createBtnText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '700' },
    disabled: { opacity: 0.5 },
});
