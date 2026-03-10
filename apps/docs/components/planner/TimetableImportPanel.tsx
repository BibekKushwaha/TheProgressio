'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import {
    useCreateSubjectMutation,
    useCreateTimetableEntryMutation,
    useGetSubjectsQuery,
    usePreviewTimetableImportMutation,
    type ParsedTimetableEntryDraft,
} from '@repo/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, Sparkles, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { getSubjectSuggestions, matchSubject } from '@/lib/subjectMatcher';
import { summarizeConfidenceBuckets, trackLowInputEvent } from '@/lib/lowInputTelemetry';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const normalizeText = (value: string) => value.trim().toLowerCase();

const defaultColorForSubject = (subjectName: string) => {
    const palette = ['#3B82F6', '#14B8A6', '#F97316', '#EC4899', '#8B5CF6', '#22C55E'];
    const sum = Array.from(subjectName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[sum % palette.length] ?? palette[0];
};

const CREATE_SUBJECT_PREFIX = '__create__:';

const getConfidenceClasses = (confidence: number) => {
    if (confidence >= 0.8) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    if (confidence >= 0.5) return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
};

interface TimetableImportPanelProps {
    onImported?: () => void;
}

export function TimetableImportPanel({ onImported }: TimetableImportPanelProps) {
    const { data: subjects = [] } = useGetSubjectsQuery();
    const [previewImport, { isLoading: isPreviewLoading }] = usePreviewTimetableImportMutation();
    const [createTimetableEntry] = useCreateTimetableEntryMutation();
    const [createSubject] = useCreateSubjectMutation();

    const [rawText, setRawText] = useState('');
    const [rows, setRows] = useState<ParsedTimetableEntryDraft[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [parserSummary, setParserSummary] = useState<{
        deterministicMatches: number;
        aiMatches: number;
        normalizedLines: number;
    } | null>(null);
    const [selectedFileName, setSelectedFileName] = useState<string>('');
    const [isImporting, setIsImporting] = useState(false);
    const [subjectSelections, setSubjectSelections] = useState<Record<number, string>>({});

    const detectedSummary = useMemo(
        () => rows.filter((row) => row.subjectName.trim()).length,
        [rows]
    );

    const isRowStructurallyValid = (row: ParsedTimetableEntryDraft) =>
        Boolean(row.subjectName.trim() && row.dayOfWeek !== null && row.startTime && row.endTime);

    const getDefaultSubjectSelection = (subjectName: string) => {
        const match = matchSubject(subjectName, subjects);
        if (match.type === 'auto') return match.subjectId;
        if (match.type === 'ambiguous') return '';
        return `${CREATE_SUBJECT_PREFIX}${subjectName.trim()}`;
    };

    const applyPreview = (
        previewRows: ParsedTimetableEntryDraft[],
        previewWarnings: string[],
        previewParser: {
            deterministicMatches: number;
            aiMatches: number;
            normalizedLines: number;
        }
    ) => {
        setRows(previewRows);
        setWarnings(previewWarnings);
        setParserSummary(previewParser);
        setSubjectSelections(
            Object.fromEntries(
                previewRows.map((row, index) => [index, getDefaultSubjectSelection(row.subjectName)])
            )
        );
    };

    const updateRow = (index: number, patch: Partial<ParsedTimetableEntryDraft>) => {
        setRows((current) =>
            current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
        );

        if (patch.subjectName !== undefined) {
            const subjectName = patch.subjectName.trim();
            setSubjectSelections((current) => ({
                ...current,
                [index]: subjectName ? getDefaultSubjectSelection(subjectName) : '',
            }));
        }
    };

    const handlePreviewFromText = async () => {
        if (!rawText.trim()) {
            toast.error('Paste timetable text first');
            return;
        }

        trackLowInputEvent('timetable_preview_requested', 'text', {
            input_length: rawText.trim().length,
        });

        try {
            const response = await previewImport({ sourceType: 'text', text: rawText }).unwrap();
            applyPreview(response.entries, response.warnings, response.parser);
            const confidenceSummary = summarizeConfidenceBuckets(response.entries.map((entry) => entry.confidence));
            trackLowInputEvent('timetable_preview_succeeded', 'text', {
                row_count: response.entries.length,
                warning_count: response.warnings.length,
                deterministic_matches: response.parser.deterministicMatches,
                ai_matches: response.parser.aiMatches,
                normalized_lines: response.parser.normalizedLines,
                confidence_high: confidenceSummary.high,
                confidence_medium: confidenceSummary.medium,
                confidence_low: confidenceSummary.low,
            });
            if (response.entries.length === 0) {
                toast.error('No timetable rows found');
            }
        } catch {
            trackLowInputEvent('timetable_preview_failed', 'text', {
                input_length: rawText.trim().length,
            });
            toast.error('Failed to preview timetable import');
        }
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setSelectedFileName(file.name);
        trackLowInputEvent('timetable_preview_requested', 'file', {
            file_name: file.name,
            file_size_bytes: file.size,
            mime_type: file.type || 'text/plain',
        });

        try {
            const fileBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(file);
            });

            const response = await previewImport({
                sourceType: 'file',
                fileBase64,
                mimeType: file.type || 'text/plain',
                fileName: file.name,
            }).unwrap();

            applyPreview(response.entries, response.warnings, response.parser);
            const confidenceSummary = summarizeConfidenceBuckets(response.entries.map((entry) => entry.confidence));
            trackLowInputEvent('timetable_preview_succeeded', 'file', {
                file_name: file.name,
                row_count: response.entries.length,
                warning_count: response.warnings.length,
                deterministic_matches: response.parser.deterministicMatches,
                ai_matches: response.parser.aiMatches,
                normalized_lines: response.parser.normalizedLines,
                confidence_high: confidenceSummary.high,
                confidence_medium: confidenceSummary.medium,
                confidence_low: confidenceSummary.low,
            });
            if (response.entries.length === 0) {
                toast.error('No timetable rows found');
            }
        } catch {
            trackLowInputEvent('timetable_preview_failed', 'file', {
                file_name: file.name,
            });
            toast.error('Failed to read file');
        } finally {
            event.target.value = '';
        }
    };

    const handleImport = async () => {
        const validRows = rows
            .map((row, index) => ({ row, index }))
            .filter(({ row }) => isRowStructurallyValid(row));

        if (validRows.length === 0) {
            toast.error('Add at least one complete timetable row before importing');
            return;
        }

        const importableRows = validRows.filter(({ index }) => {
            const selection = subjectSelections[index];
            return Boolean(selection);
        });

        if (importableRows.length === 0) {
            toast.error('Resolve subject mapping for at least one imported row before importing');
            return;
        }

        setIsImporting(true);

        try {
            const subjectCache = new Map(subjects.map((subject) => [normalizeText(subject.name), subject]));
            let autoMatchedSubjects = 0;
            let newSubjectsCreated = 0;

            for (const { row, index } of importableRows) {
                const selection = subjectSelections[index] ?? '';
                let subject =
                    selection.startsWith(CREATE_SUBJECT_PREFIX)
                        ? null
                        : subjects.find((candidate) => candidate.id === selection) ?? null;
                const matchedSelection = selection && !selection.startsWith(CREATE_SUBJECT_PREFIX);
                if (matchedSelection) {
                    autoMatchedSubjects += 1;
                }

                if (!subject) {
                    const subjectName = selection.startsWith(CREATE_SUBJECT_PREFIX)
                        ? selection.slice(CREATE_SUBJECT_PREFIX.length).trim()
                        : row.subjectName.trim();
                    const subjectKey = normalizeText(subjectName);
                    subject = subjectCache.get(subjectKey) ?? null;
                }

                if (!subject) {
                    const subjectName = selection.startsWith(CREATE_SUBJECT_PREFIX)
                        ? selection.slice(CREATE_SUBJECT_PREFIX.length).trim()
                        : row.subjectName.trim();
                    subject = await createSubject({
                        name: subjectName,
                        color: defaultColorForSubject(subjectName),
                    }).unwrap();
                    subjectCache.set(normalizeText(subjectName), subject);
                    newSubjectsCreated += 1;
                }

                await createTimetableEntry({
                    dayOfWeek: row.dayOfWeek ?? 0,
                    startTime: row.startTime ?? '09:00',
                    endTime: row.endTime ?? '10:00',
                    subjectId: subject.id,
                    rotation: row.rotation || null,
                }).unwrap();
            }

            const skippedCount = validRows.length - importableRows.length;
            const confidenceSummary = summarizeConfidenceBuckets(importableRows.map(({ row }) => row.confidence));
            trackLowInputEvent('timetable_import_completed', selectedFileName ? 'file' : 'text', {
                imported_rows: importableRows.length,
                skipped_rows: skippedCount,
                unresolved_rows: skippedCount,
                auto_matched_subjects: autoMatchedSubjects,
                ambiguous_subjects: validRows.length - importableRows.length,
                new_subjects_created: newSubjectsCreated,
                confidence_high: confidenceSummary.high,
                confidence_medium: confidenceSummary.medium,
                confidence_low: confidenceSummary.low,
            });
            toast.success(
                skippedCount > 0
                    ? `Imported ${importableRows.length} timetable row${importableRows.length === 1 ? '' : 's'} and skipped ${skippedCount} unresolved row${skippedCount === 1 ? '' : 's'}`
                    : `Imported ${importableRows.length} timetable row${importableRows.length === 1 ? '' : 's'}`
            );
            setRows([]);
            setWarnings([]);
            setParserSummary(null);
            setSubjectSelections({});
            setRawText('');
            setSelectedFileName('');
            onImported?.();
        } catch {
            toast.error('Failed to import timetable rows');
        } finally {
            setIsImporting(false);
        }
    };

    const handleRemoveInvalidRows = () => {
        const validIndexes = rows
            .map((row, index) => ({ row, index }))
            .filter(({ row }) => isRowStructurallyValid(row))
            .map(({ index }) => index);
        const nextRows = validIndexes.map((index) => rows[index]!);
        const nextSelections = Object.fromEntries(
            validIndexes.map((oldIndex, nextIndex) => [
                nextIndex,
                subjectSelections[oldIndex] ?? getDefaultSubjectSelection(nextRows[nextIndex]!.subjectName),
            ])
        );

        setRows(nextRows);
        setSubjectSelections(nextSelections);
    };

    return (
        <Card className="p-4 bg-white/[0.03] border-white/10 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Import timetable
                    </h4>
                    <p className="mt-1 text-xs text-slate-400">
                        Paste text or upload a text, PDF, or image file. Review every row before importing.
                    </p>
                </div>
                {selectedFileName && (
                    <span className="text-[11px] text-slate-500 truncate max-w-40">{selectedFileName}</span>
                )}
            </div>

            <textarea
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                placeholder="Example: Monday 09:00-10:00 Math A&#10;Wednesday 11:00-12:00 Physics"
                className="min-h-28 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500"
            />

            <div className="flex flex-wrap gap-3">
                <Button
                    type="button"
                    onClick={handlePreviewFromText}
                    disabled={isPreviewLoading}
                    className="bg-amber-600 hover:bg-amber-500"
                >
                    <FileText className="w-4 h-4" />
                    Preview Text
                </Button>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">
                    <Upload className="w-4 h-4" />
                    Upload File
                    <input
                        type="file"
                        accept=".txt,.csv,.pdf,image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </label>
            </div>

            {warnings.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1">
                    {warnings.map((warning) => (
                        <div key={warning} className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{warning}</span>
                        </div>
                    ))}
                </div>
            )}

            {rows.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">
                            {detectedSummary} row{detectedSummary === 1 ? '' : 's'} detected. Edit anything unclear before import.
                        </p>
                        {parserSummary && (
                            <p className="text-[11px] text-slate-500">
                                Deterministic {parserSummary.deterministicMatches} · AI {parserSummary.aiMatches} · Normalized {parserSummary.normalizedLines}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleRemoveInvalidRows}
                                className="border-white/10 bg-white/5 hover:bg-white/10"
                            >
                                Remove Invalid Rows
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    setSubjectSelections((current) =>
                                        Object.fromEntries(
                                            rows.map((row, index) => {
                                                const existing = current[index];
                                                return [index, existing && existing.trim() ? existing : getDefaultSubjectSelection(row.subjectName)];
                                            })
                                        )
                                    )
                                }
                                className="border-white/10 bg-white/5 hover:bg-white/10"
                            >
                                Apply Subject Mapping
                            </Button>
                            <Button
                                type="button"
                                onClick={handleImport}
                                disabled={isImporting}
                                className="bg-emerald-600 hover:bg-emerald-500"
                            >
                                {isImporting ? 'Importing...' : 'Confirm Import'}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {rows.map((row, index) => (
                            <div key={`${row.subjectName}-${index}`} className={`grid grid-cols-1 gap-2 rounded-xl border p-3 md:grid-cols-6 ${getConfidenceClasses(row.confidence)}`}>
                                <div className="md:col-span-6 flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        {row.confidence >= 0.8 ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                                        ) : (
                                            <AlertTriangle className="h-4 w-4" />
                                        )}
                                        <span>Confidence {(row.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                    <span>{row.dayOfWeek !== null ? DAYS[row.dayOfWeek] : 'Day missing'}</span>
                                </div>
                                <Input
                                    value={row.subjectName}
                                    onChange={(event) => updateRow(index, { subjectName: event.target.value })}
                                    placeholder="Subject"
                                    className="bg-white/5 border-white/10"
                                />
                                <select
                                    value={row.dayOfWeek ?? ''}
                                    onChange={(event) =>
                                        updateRow(index, {
                                            dayOfWeek: event.target.value === '' ? null : Number(event.target.value),
                                        })
                                    }
                                    className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="">Day</option>
                                    {DAYS.map((day, dayIndex) => (
                                        <option key={day} value={dayIndex} className="bg-slate-900">
                                            {day}
                                        </option>
                                    ))}
                                </select>
                                <Input
                                    value={row.startTime ?? ''}
                                    onChange={(event) => updateRow(index, { startTime: event.target.value })}
                                    placeholder="09:00"
                                    className="bg-white/5 border-white/10"
                                />
                                <Input
                                    value={row.endTime ?? ''}
                                    onChange={(event) => updateRow(index, { endTime: event.target.value })}
                                    placeholder="10:00"
                                    className="bg-white/5 border-white/10"
                                />
                                <Input
                                    value={row.rotation ?? ''}
                                    onChange={(event) => updateRow(index, { rotation: event.target.value || null })}
                                    placeholder="A / B / Every Week"
                                    className="bg-white/5 border-white/10"
                                />
                                <select
                                    value={subjectSelections[index] ?? ''}
                                    onChange={(event) =>
                                        setSubjectSelections((current) => ({ ...current, [index]: event.target.value }))
                                    }
                                    className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="">Resolve subject</option>
                                    {getSubjectSuggestions(row.subjectName, subjects).map(({ subject, score }) => (
                                        <option key={subject.id} value={subject.id} className="bg-slate-900">
                                            {score <= 0.2 ? 'Auto match' : score <= 0.4 ? 'Confirm match' : 'Suggested'} ({Math.round((1 - Math.min(score, 1)) * 100)}%): {subject.name}
                                        </option>
                                    ))}
                                    <option value={`${CREATE_SUBJECT_PREFIX}${row.subjectName.trim()}`} className="bg-slate-900">
                                        Create new subject: {row.subjectName.trim() || 'Unnamed'}
                                    </option>
                                </select>
                                {row.warnings && row.warnings.length > 0 && (
                                    <div className="md:col-span-6 flex flex-wrap gap-2">
                                        {row.warnings.map((warning) => (
                                            <span key={warning} className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[11px]">
                                                {warning}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {row.sourceLine && (
                                    <p className="md:col-span-6 text-[11px] text-slate-500 truncate">
                                        Source: {row.sourceLine}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {rows.length === 0 && !isPreviewLoading && (
                <p className="text-xs text-slate-500">
                    Imported rows stay in preview until you confirm. Nothing is saved automatically.
                </p>
            )}
        </Card>
    );
}
