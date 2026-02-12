'use client';

import { useEffect, useMemo, useState } from 'react';
import { SWOTAnalysis } from '@/components/analytics/SWOTAnalysis';
import { GradeEntryManager } from '@/components/analytics/GradeEntryManager';
import { ProductivityInsights } from '@/components/analytics/ProductivityInsights';
import { PredictiveScoreCard } from '@/components/analytics/PredictiveScoreCard';
import { RevisionScheduler } from '@/components/analytics/RevisionScheduler';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    BrainCircuit,
    CalendarDays,
    ClipboardCheck,
    Flame,
    Pause,
    Play,
    RotateCcw,
    ShieldCheck,
    Swords,
    Target,
    Timer,
    TrendingUp,
    Trophy,
} from 'lucide-react';
import {
    type GradeEntry,
    type LearningPace,
    useGetGradeEntriesQuery,
    useGetPredictivePerformanceQuery,
    useGetSubjectPerformanceQuery,
} from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';

type ExamTrack = 'JEE' | 'NEET' | 'UPSC' | 'CUSTOM';
type TabValue = 'swot' | 'grades' | 'predictions' | 'revision' | 'battle';

interface SubjectPerformance {
    subjectName: string;
    totalEntries: number;
    averageScore: number;
    improvementRate: number;
    learningPace: 'accelerating' | 'steady' | 'declining' | string;
    timeTrend: Array<{ date: string; timePerQuestion: number; score: number }>;
}

interface MockBattleReport {
    completedAt: string;
    durationMin: number;
    score: number;
    attempted: number;
    incorrect: number;
    accuracy: number;
    confidence: number;
    weakChapters: string[];
    readinessBand: 'Elite' | 'Solid' | 'Recovering' | 'Critical';
    recommendation: string;
}

const EXAM_TRACKS: ExamTrack[] = ['JEE', 'NEET', 'UPSC', 'CUSTOM'];

export default function ExamWarRoomPage() {
    const [activeTab, setActiveTab] = useState<TabValue>('swot');
    const [selectedExam, setSelectedExam] = useState<ExamTrack>('JEE');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [mockDurationMin, setMockDurationMin] = useState(90);
    const [mockTimeLeftSec, setMockTimeLeftSec] = useState(90 * 60);
    const [mockRunning, setMockRunning] = useState(false);
    const [mockStarted, setMockStarted] = useState(false);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [mockScore, setMockScore] = useState('');
    const [mockAttempted, setMockAttempted] = useState('');
    const [mockIncorrect, setMockIncorrect] = useState('');
    const [mockWeakChapters, setMockWeakChapters] = useState('');
    const [mockConfidence, setMockConfidence] = useState('3');
    const [analysisError, setAnalysisError] = useState('');
    const [latestMockReport, setLatestMockReport] = useState<MockBattleReport | null>(null);

    const { data: gradeData, isLoading: gradesLoading } = useGetGradeEntriesQuery({ examType: selectedExam });
    const { data: predictiveData, isLoading: predictiveLoading } = useGetPredictivePerformanceQuery(selectedExam);
    const { data: performanceData, isLoading: perfLoading } = useGetSubjectPerformanceQuery(selectedSubject, {
        skip: !selectedSubject,
    });

<<<<<<< HEAD
    const grades: GradeEntry[] = useMemo(() => gradeData?.entries ?? [], [gradeData?.entries]);
    const predictiveSubjects: LearningPace[] = useMemo(() => predictiveData?.data ?? [], [predictiveData?.data]);

    const subjectOptions = useMemo(
        () => Array.from(new Set(grades.map((entry) => entry.subjectName))).sort(),
        [grades]
    );

    useEffect(() => {
        if (subjectOptions.length === 0) {
            setSelectedSubject('');
            return;
        }
        if (!subjectOptions.includes(selectedSubject)) {
            setSelectedSubject(subjectOptions[0] || '');
        }
    }, [subjectOptions, selectedSubject]);

    const subjectPerformance = useMemo(
        () => (performanceData?.data ? (performanceData.data as SubjectPerformance) : null),
        [performanceData]
    );

    const scoreStats = grades.reduce(
=======
    type SubjectPerformance = {
        subjectName: string;
        avgScore?: number;
        entryCount?: number;
        trend?: string;
    };

    const subjects = (performanceData?.data ?? []) as SubjectPerformance[];

    // Difficulty breakdown from grade entries
    const difficultyStats = grades.reduce(
>>>>>>> origin/main
        (acc, entry) => {
            const pct = (entry.obtainedMarks / entry.totalMarks) * 100;
            if (pct >= 80) acc.strong++;
            else if (pct >= 60) acc.stable++;
            else acc.atRisk++;
            acc.totalScore += pct;
            return acc;
        },
        { strong: 0, stable: 0, atRisk: 0, totalScore: 0 }
    );

    const totalAttempts = grades.length;
    const averageScore = totalAttempts > 0 ? Math.round(scoreStats.totalScore / totalAttempts) : 0;
    const chapterCoverage = new Set(grades.map((entry) => `${entry.subjectName}::${entry.chapter || 'General'}`)).size;
    const atRiskPredictiveCount = predictiveSubjects.filter((subject) => subject.estimatedExamScore < 65).length;
    const momentum = predictiveSubjects.length > 0
        ? Math.round(predictiveSubjects.reduce((sum, subject) => sum + subject.improvementRate, 0) / predictiveSubjects.length)
        : 0;
    const bestPredictive = predictiveSubjects.length > 0
        ? [...predictiveSubjects].sort((a, b) => b.estimatedExamScore - a.estimatedExamScore)[0]
        : null;

    const battlePlan = useMemo(() => {
        const items: string[] = [];
        if (averageScore < 60) {
            items.push('Run a weak-topic sprint: 2 low-scoring chapters before new content.');
        }
        if (atRiskPredictiveCount > 0) {
            items.push(`Prioritize ${atRiskPredictiveCount} at-risk subject${atRiskPredictiveCount > 1 ? 's' : ''} with daily PYQ blocks.`);
        }
        if (momentum < 0) {
            items.push('Momentum dropped this cycle, schedule short revision loops after each mock.');
        }
        if (items.length === 0) {
            items.push('You are on track. Increase mock frequency and tighten error-log review.');
        }
        return items.slice(0, 3);
    }, [averageScore, atRiskPredictiveCount, momentum]);

    const warRiskHighlights = useMemo(() => {
        const highlights: string[] = [];
        if (scoreStats.atRisk > 0) {
            highlights.push(`${scoreStats.atRisk} recent attempts are in at-risk score zone.`);
        }
        if (atRiskPredictiveCount > 0) {
            highlights.push(`${atRiskPredictiveCount} predictive subject${atRiskPredictiveCount > 1 ? 's need' : ' needs'} immediate remediation.`);
        }
        if (momentum < 0) {
            highlights.push(`Performance momentum is negative (${momentum}%). Tighten revision loops this week.`);
        }
        if (averageScore < 60 && totalAttempts > 0) {
            highlights.push('Average readiness is below safe threshold; prioritize high-yield weak chapters.');
        }
        if (highlights.length === 0) {
            highlights.push('Risk posture is stable. Shift focus to speed and accuracy optimization.');
        }
        return highlights.slice(0, 3);
    }, [scoreStats.atRisk, atRiskPredictiveCount, momentum, averageScore, totalAttempts]);

    const scorePulse = useMemo(() => {
        const bucket = new Map<string, { date: string; attempts: number; scoreSum: number }>();
        grades.forEach((entry) => {
            const day = new Date(entry.createdAt);
            const key = day.toISOString().split('T')[0] || '';
            const current = bucket.get(key) || { date: key, attempts: 0, scoreSum: 0 };
            const pct = Math.round((entry.obtainedMarks / entry.totalMarks) * 100);
            current.attempts += 1;
            current.scoreSum += pct;
            bucket.set(key, current);
        });

        return Array.from(bucket.values())
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-7)
            .map((item) => ({
                day: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
                avgScore: Math.round(item.scoreSum / item.attempts),
                attempts: item.attempts,
            }));
    }, [grades]);

    const pulseMaxScore = useMemo(
        () => Math.max(1, ...scorePulse.map((point) => point.avgScore)),
        [scorePulse]
    );

    const readinessTone = averageScore < 60
        ? 'bg-red-500/15 border-red-400/30 text-red-200'
        : averageScore < 75
            ? 'bg-amber-500/15 border-amber-400/30 text-amber-200'
            : 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200';
    const readinessLabel = averageScore < 60 ? 'At Risk' : averageScore < 75 ? 'Recovering' : 'Strong';

    useEffect(() => {
        if (!mockStarted) {
            setMockTimeLeftSec(mockDurationMin * 60);
        }
    }, [mockDurationMin, mockStarted]);

    useEffect(() => {
        if (!mockRunning) return;

        const interval = window.setInterval(() => {
            setMockTimeLeftSec((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => window.clearInterval(interval);
    }, [mockRunning]);

    useEffect(() => {
        if (!mockStarted) return;
        if (mockTimeLeftSec > 0) return;
        setMockRunning(false);
        setIsAnalysisOpen(true);
    }, [mockStarted, mockTimeLeftSec]);

    const formatTimer = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const handleMockStartPause = () => {
        if (!mockStarted) {
            setMockStarted(true);
        }
        setMockRunning((prev) => !prev);
    };

    const handleMockReset = () => {
        setMockRunning(false);
        setMockStarted(false);
        setMockTimeLeftSec(mockDurationMin * 60);
        setIsAnalysisOpen(false);
        setAnalysisError('');
    };

    const handleOpenAnalysis = () => {
        setAnalysisError('');
        setMockRunning(false);
        setIsAnalysisOpen(true);
    };

    const handleSubmitMockAnalysis = () => {
        const score = Number(mockScore);
        const attempted = Number(mockAttempted);
        const incorrect = Number(mockIncorrect);
        const confidence = Number(mockConfidence);

        if (
            Number.isNaN(score) ||
            Number.isNaN(attempted) ||
            Number.isNaN(incorrect) ||
            Number.isNaN(confidence) ||
            score < 0 ||
            score > 100 ||
            attempted <= 0 ||
            incorrect < 0 ||
            incorrect > attempted
        ) {
            setAnalysisError('Enter valid score, attempts, incorrect count, and confidence values.');
            return;
        }

        const accuracy = Math.max(0, Math.round(((attempted - incorrect) / attempted) * 100));
        const weakChapters = mockWeakChapters
            .split(',')
            .map((chapter) => chapter.trim())
            .filter(Boolean);

        let readinessBand: MockBattleReport['readinessBand'] = 'Critical';
        if (score >= 85) readinessBand = 'Elite';
        else if (score >= 70) readinessBand = 'Solid';
        else if (score >= 55) readinessBand = 'Recovering';

        let recommendation = 'Increase concept drilling and run shorter timed sets daily.';
        if (readinessBand === 'Elite') {
            recommendation = 'Maintain pace; shift 20% of prep to hard PYQs and time pressure drills.';
        } else if (readinessBand === 'Solid') {
            recommendation = 'Close the gap by attacking weak chapters first, then finish with mixed mocks.';
        } else if (readinessBand === 'Recovering') {
            recommendation = 'Rebuild fundamentals for weak chapters and do error-log revision before next mock.';
        }

        if (confidence <= 2) {
            recommendation = `${recommendation} Add one confidence-building moderate set before full mocks.`;
        }

        setLatestMockReport({
            completedAt: new Date().toISOString(),
            durationMin: mockDurationMin,
            score,
            attempted,
            incorrect,
            accuracy,
            confidence,
            weakChapters,
            readinessBand,
            recommendation,
        });

        setIsAnalysisOpen(false);
        setAnalysisError('');
        setMockRunning(false);
        setMockStarted(false);
        setMockTimeLeftSec(mockDurationMin * 60);
        setMockScore('');
        setMockAttempted('');
        setMockIncorrect('');
        setMockWeakChapters('');
        setMockConfidence('3');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/30 to-slate-950 text-white p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-red-500/15 via-orange-500/10 to-amber-500/5 p-6 md:p-8">
                    <div className="absolute -top-20 -right-10 h-64 w-64 rounded-full bg-red-500/20 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg shadow-red-500/20">
                                <Swords className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-300 via-orange-300 to-amber-300 bg-clip-text text-transparent">
                                    Exam War Room
                                </h1>
                                <p className="text-slate-300 mt-1 max-w-2xl">
                                    Command center for chapter-level SWOT, score momentum, and predictive exam readiness.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/20 bg-black/25 backdrop-blur-md p-4 min-w-[280px]">
                            <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Exam Track</div>
                            <div className="grid grid-cols-2 gap-2">
                                {EXAM_TRACKS.map((track) => (
                                    <button
                                        key={track}
                                        onClick={() => setSelectedExam(track)}
                                        className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${selectedExam === track
                                            ? 'bg-red-500/25 border-red-400/40 text-red-100'
                                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                            }`}
                                    >
                                        {track}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5">
                        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Attempts</div>
                        <div className="text-3xl font-bold text-white">{totalAttempts}</div>
                    </div>
                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-cyan-300 mb-1">
                            <ShieldCheck className="w-4 h-4" /> Readiness
                        </div>
                        <div className="text-3xl font-bold text-cyan-300">{averageScore}%</div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-green-300 mb-1">
                            <Trophy className="w-4 h-4" /> Strong
                        </div>
                        <div className="text-3xl font-bold text-green-300">{scoreStats.strong}</div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-300 mb-1">
                            <Target className="w-4 h-4" /> Stable
                        </div>
                        <div className="text-3xl font-bold text-amber-300">{scoreStats.stable}</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-red-300 mb-1">
                            <Flame className="w-4 h-4" /> At Risk
                        </div>
                        <div className="text-3xl font-bold text-red-300">{scoreStats.atRisk}</div>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-purple-300 mb-1">
                            <BookOpen className="w-4 h-4" /> Chapters
                        </div>
                        <div className="text-3xl font-bold text-purple-300">{chapterCoverage}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-6">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-300" />
                                War-Risk Radar
                            </h2>
                            <span className={`px-3 py-1 rounded-full text-xs border ${readinessTone}`}>
                                Readiness: {readinessLabel}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {warRiskHighlights.map((item) => (
                                <div key={item} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
                                    {item}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-3 gap-3 mt-5">
                            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3 text-center">
                                <div className="text-2xl font-bold text-red-300">{scoreStats.atRisk}</div>
                                <div className="text-xs text-slate-400">Low Scores</div>
                            </div>
                            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3 text-center">
                                <div className="text-2xl font-bold text-orange-300">{atRiskPredictiveCount}</div>
                                <div className="text-xs text-slate-400">Predictive Risk</div>
                            </div>
                            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3 text-center">
                                <div className={`text-2xl font-bold ${momentum >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                    {momentum >= 0 ? '+' : ''}{momentum}%
                                </div>
                                <div className="text-xs text-slate-400">Momentum</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-cyan-300" />
                            Score Pulse (7 Days)
                        </h2>
                        {scorePulse.length === 0 ? (
                            <p className="text-sm text-slate-400 py-8 text-center">No recent grade logs yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {scorePulse.map((point) => (
                                    <div key={`${point.day}-${point.avgScore}-${point.attempts}`} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3">
                                        <span className="text-xs text-slate-400">{point.day}</span>
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                                                style={{ width: `${Math.max(8, Math.round((point.avgScore / pulseMaxScore) * 100))}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-300">{point.avgScore}% / {point.attempts}t</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-orange-300" />
                                Subject Command Panel
                            </h2>
                            <div className="w-full max-w-xs">
                                <Select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white"
                                >
                                    <option value="" className="bg-slate-900">Select subject</option>
                                    {subjectOptions.map((subject) => (
                                        <option key={subject} value={subject} className="bg-slate-900">
                                            {subject}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        {gradesLoading || (selectedSubject && perfLoading) ? (
                            <Skeleton className="h-44 w-full bg-white/5" />
                        ) : !selectedSubject || !subjectPerformance ? (
                            <div className="text-sm text-slate-400 py-10 text-center">
                                Add grade entries for <span className="text-orange-300 font-semibold">{selectedExam}</span> to unlock subject-level pace tracking.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                        <div className="text-xs text-slate-400">Avg Score</div>
                                        <div className="text-xl font-bold text-white">{subjectPerformance.averageScore}%</div>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                        <div className="text-xs text-slate-400">Entries</div>
                                        <div className="text-xl font-bold text-white">{subjectPerformance.totalEntries}</div>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                        <div className="text-xs text-slate-400">Improvement</div>
                                        <div className={`text-xl font-bold ${subjectPerformance.improvementRate >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                            {subjectPerformance.improvementRate >= 0 ? '+' : ''}{subjectPerformance.improvementRate}%
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                        <div className="text-xs text-slate-400">Pace</div>
                                        <div className="text-xl font-bold text-orange-300">{subjectPerformance.learningPace}</div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-3">Recent Time vs Score</div>
                                    <div className="space-y-2">
                                        {subjectPerformance.timeTrend.slice(-5).map((point) => (
                                            <div key={`${point.date}-${point.score}`} className="grid grid-cols-[90px_1fr_72px] items-center gap-3">
                                                <span className="text-xs text-slate-400">{point.date}</span>
                                                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-400"
                                                        style={{ width: `${Math.max(5, Math.min(point.score, 100))}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-300 text-right">{point.score}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <BrainCircuit className="w-5 h-5 text-red-300" />
                            Battle Plan
                        </h3>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
                                <div className="text-xs text-slate-400">Predictive Risk</div>
                                <div className="text-2xl font-bold text-red-300">{predictiveLoading ? '...' : atRiskPredictiveCount}</div>
                            </div>
                            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
                                <div className="text-xs text-slate-400">Momentum</div>
                                <div className={`text-2xl font-bold ${momentum >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                    {predictiveLoading ? '...' : `${momentum >= 0 ? '+' : ''}${momentum}%`}
                                </div>
                            </div>
                        </div>
                        <div className="text-xs text-slate-400 mb-2">Top Predicted Subject</div>
                        <p className="text-sm text-white mb-4">
                            {bestPredictive ? `${bestPredictive.subjectName} • ${bestPredictive.estimatedExamScore}%` : 'Not enough predictive data yet'}
                        </p>
                        <div className="space-y-2">
                            {battlePlan.map((item) => (
                                <div key={item} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
                    <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full bg-white/5 border border-white/10 p-1 h-auto">
                        <TabsTrigger
                            value="swot"
                            className="data-[state=active]:bg-red-500/80 data-[state=active]:text-white rounded-lg"
                        >
                            <Target className="w-4 h-4 mr-2" /> SWOT
                        </TabsTrigger>
                        <TabsTrigger
                            value="grades"
                            className="data-[state=active]:bg-orange-500/80 data-[state=active]:text-white rounded-lg"
                        >
                            <BookOpen className="w-4 h-4 mr-2" /> Grades
                        </TabsTrigger>
                        <TabsTrigger
                            value="predictions"
                            className="data-[state=active]:bg-purple-500/80 data-[state=active]:text-white rounded-lg"
                        >
                            <TrendingUp className="w-4 h-4 mr-2" /> Predictions
                        </TabsTrigger>
                        <TabsTrigger
                            value="revision"
                            className="data-[state=active]:bg-cyan-500/80 data-[state=active]:text-white rounded-lg"
                        >
                            <CalendarDays className="w-4 h-4 mr-2" /> Revision
                        </TabsTrigger>
                        <TabsTrigger
                            value="battle"
                            className="data-[state=active]:bg-emerald-500/80 data-[state=active]:text-white rounded-lg"
                        >
                            <Swords className="w-4 h-4 mr-2" /> Battle
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="swot" className="mt-6">
                        <SWOTAnalysis examType={selectedExam} allowExamTypeChange={false} />
                    </TabsContent>

                    <TabsContent value="grades" className="mt-6">
                        <GradeEntryManager examType={selectedExam} allowExamTypeEdit={false} />
                    </TabsContent>

                    <TabsContent value="predictions" className="mt-6">
                        <div className="space-y-6">
                            <PredictiveScoreCard examType={selectedExam} title={`${selectedExam} Predictive Scoreboard`} />
                            <ProductivityInsights examType={selectedExam} days={14} />
                        </div>
                    </TabsContent>

                    <TabsContent value="revision" className="mt-6">
                        <RevisionScheduler initialExam={selectedExam} />
                    </TabsContent>

<<<<<<< HEAD
                    <TabsContent value="battle" className="mt-6">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-xl p-6">
                                    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Timer className="w-5 h-5 text-emerald-300" />
                                            Mock Test Timer
                                        </h2>
                                        <div className="flex gap-2">
                                            {[60, 90, 120].map((duration) => (
                                                <button
                                                    key={duration}
                                                    onClick={() => setMockDurationMin(duration)}
                                                    disabled={mockStarted}
                                                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${mockDurationMin === duration
                                                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                                        } disabled:opacity-50`}
                                                >
                                                    {duration}m
                                                </button>
                                            ))}
=======
                {/* Subject Performance Summary */}
                {perfLoading ? (
                    <Skeleton className="h-48 w-full bg-white/5" />
                ) : subjects.length > 0 && (
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-orange-400" />
                            Subject Performance Summary
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {subjects.map((subject) => (
                                <div key={subject.subjectName} className="bg-white/5 border border-white/10 rounded-lg p-4">
                                    <h3 className="font-semibold text-white mb-2">{subject.subjectName}</h3>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Avg Score</span>
                                            <span className="text-white font-semibold">{subject.avgScore?.toFixed(1) || 'N/A'}%</span>
>>>>>>> origin/main
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-black/20 border border-white/10 px-4 py-6 text-center mb-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">{selectedExam} simulation</p>
                                        <div className="text-5xl font-black tracking-wider text-emerald-200 tabular-nums">
                                            {formatTimer(mockTimeLeftSec)}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">
                                            {mockRunning ? 'Timer running' : mockStarted ? 'Timer paused' : 'Ready to start'}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            onClick={handleMockStartPause}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                        >
                                            {mockRunning ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                                            {mockRunning ? 'Pause' : (mockStarted ? 'Resume' : 'Start Mock')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleMockReset}
                                            className="bg-transparent border-white/20 text-white hover:bg-white/10"
                                        >
                                            <RotateCcw className="w-4 h-4 mr-1" />
                                            Reset
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleOpenAnalysis}
                                            className="bg-transparent border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/10"
                                        >
                                            <ClipboardCheck className="w-4 h-4 mr-1" />
                                            Submit Mock Result
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-orange-400" />
                                        Mission Checklist
                                    </h2>
                                    <div className="space-y-3 text-sm">
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-200">
                                            Complete at least 2 weak chapters from SWOT list.
                                        </div>
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-200">
                                            Attempt 1 timed mock and log every mistake pattern.
                                        </div>
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-200">
                                            Review low-momentum subject for 45 minutes in peak window.
                                        </div>
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-200">
                                            Close the day with rapid-fire PYQ recap.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {latestMockReport && (
                                <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-400/20 rounded-xl p-6">
                                    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <ClipboardCheck className="w-5 h-5 text-emerald-300" />
                                            Latest Mock Analysis
                                        </h3>
                                        <span className="text-xs text-slate-300">
                                            {new Date(latestMockReport.completedAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                                        <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
                                            <div className="text-xs text-slate-400">Score</div>
                                            <div className="text-xl font-bold text-white">{latestMockReport.score}%</div>
                                        </div>
                                        <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
                                            <div className="text-xs text-slate-400">Accuracy</div>
                                            <div className="text-xl font-bold text-white">{latestMockReport.accuracy}%</div>
                                        </div>
                                        <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
                                            <div className="text-xs text-slate-400">Readiness</div>
                                            <div className="text-xl font-bold text-emerald-200">{latestMockReport.readinessBand}</div>
                                        </div>
                                        <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
                                            <div className="text-xs text-slate-400">Confidence</div>
                                            <div className="text-xl font-bold text-white">{latestMockReport.confidence}/5</div>
                                        </div>
                                        <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
                                            <div className="text-xs text-slate-400">Duration</div>
                                            <div className="text-xl font-bold text-white">{latestMockReport.durationMin}m</div>
                                        </div>
                                    </div>

                                    {latestMockReport.weakChapters.length > 0 && (
                                        <div className="mb-4">
                                            <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Weak Chapters</div>
                                            <div className="flex flex-wrap gap-2">
                                                {latestMockReport.weakChapters.map((chapter) => (
                                                    <span
                                                        key={chapter}
                                                        className="px-2.5 py-1 rounded-lg border border-red-400/30 bg-red-500/10 text-red-200 text-xs"
                                                    >
                                                        {chapter}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-sm text-slate-200">{latestMockReport.recommendation}</p>
                                </div>
                            )}

                            <PredictiveScoreCard examType={selectedExam} />
                        </div>
                    </TabsContent>
                </Tabs>

                <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
                    <DialogContent className="bg-slate-950 border-white/10 text-white sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Post-Mock Analysis</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Log your latest mock performance to generate a tactical recommendation.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <label className="space-y-1">
                                    <span className="text-xs text-slate-400">Score (%)</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={mockScore}
                                        onChange={(e) => setMockScore(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                                        placeholder="0-100"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-xs text-slate-400">Confidence (1-5)</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={5}
                                        value={mockConfidence}
                                        onChange={(e) => setMockConfidence(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <label className="space-y-1">
                                    <span className="text-xs text-slate-400">Attempted Questions</span>
                                    <input
                                        type="number"
                                        min={1}
                                        value={mockAttempted}
                                        onChange={(e) => setMockAttempted(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                                        placeholder="e.g. 75"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-xs text-slate-400">Incorrect Questions</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={mockIncorrect}
                                        onChange={(e) => setMockIncorrect(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                                        placeholder="e.g. 18"
                                    />
                                </label>
                            </div>

                            <label className="space-y-1 block">
                                <span className="text-xs text-slate-400">Weak Chapters (comma separated)</span>
                                <textarea
                                    value={mockWeakChapters}
                                    onChange={(e) => setMockWeakChapters(e.target.value)}
                                    className="w-full min-h-[84px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none"
                                    placeholder="Electrostatics, Organic Reactions, Probability"
                                />
                            </label>

                            {analysisError && (
                                <p className="text-xs text-red-300">{analysisError}</p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                className="bg-transparent border-white/20 text-white hover:bg-white/10"
                                onClick={() => setIsAnalysisOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmitMockAnalysis}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                Save Analysis
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
