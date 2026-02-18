'use client';

import React, { useState } from 'react';
import { usePredictGradeMutation } from '@repo/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { BrainCircuit, Loader2, Sparkles, TrendingUp, Info, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface SubjectGradePredictorProps {
    subjectId: string;
    subjectName: string;
}

export function SubjectGradePredictor({ subjectId, subjectName }: SubjectGradePredictorProps) {
    const [hoursPerWeek, setHoursPerWeek] = useState(10);
    const [predict, { data, isLoading }] = usePredictGradeMutation();

    const handlePredict = async () => {
        try {
            await predict({ subjectId, hoursPerWeek }).unwrap();
        } catch (_error) {
            toast.error(`Prediction failed for ${subjectName}`);
        }
    };

    const prediction = data?.data;

    return (
        <Card className="bg-white/5 border-white/10 overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <BrainCircuit className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <CardTitle className="text-base">Grade Predictor: {subjectName}</CardTitle>
                        <CardDescription className="text-xs">Based on simulated study workload</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                <div className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-slate-300">Simulated Weekly Hours</Label>
                            <span className="text-blue-400 font-bold">{hoursPerWeek}h</span>
                        </div>
                        <Slider
                            value={[hoursPerWeek]}
                            min={1}
                            max={40}
                            step={1}
                            onValueChange={(vals) => setHoursPerWeek(vals[0] ?? 1)}
                            className="py-4"
                        />
                    </div>

                    <Button
                        onClick={handlePredict}
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Predict Exam Score
                    </Button>
                </div>

                {prediction && (
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-400" />
                                <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Estimated Score</span>
                            </div>
                            <div className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/20 text-[10px] text-blue-200 uppercase font-black">
                                {prediction.confidenceLabel} Confidence
                            </div>
                        </div>

                        <div className="flex items-baseline gap-2">
                            <div className="text-4xl font-black text-white">{prediction.estimatedFinalExamScore.toFixed(0)}%</div>
                            <div className="text-xs text-slate-400">probable outcome</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <TrendingUp className="w-3 h-3 text-emerald-400" />
                                {prediction.simulationRuns} simulations run
                            </div>
                        </div>

                        <div className="text-[10px] text-slate-500 leading-relaxed italic border-t border-white/5 pt-3">
                            *This prediction uses Bayesian inference on your past test data and the selected workload intensity.
                        </div>
                    </div>
                )}

                {!prediction && (
                    <div className="flex gap-3 p-3 bg-white/5 rounded-lg border border-dashed border-white/10">
                        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-500 leading-tight">
                            Increasing your simulated hours will adjust the Bayesian weights used in the model. Use this to find your optimal study-life balance.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

