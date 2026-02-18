'use client';

import React, { useState } from 'react';
import { useWhatIfGPAMutation } from '@repo/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calculator, Target, Zap, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function WhatIfGPASimulator() {
    const [targetCGPA, setTargetCGPA] = useState(3.8);
    const [remainingCredits, setRemainingCredits] = useState(15);
    const [simulate, { data, isLoading }] = useWhatIfGPAMutation();
    const simulation = data?.result;

    const handleSimulate = async () => {
        try {
            await simulate({ targetCGPA, remainingCredits }).unwrap();
        } catch (_error) {
            toast.error('Simulation failed. Check your current grade data.');
        }
    };

    return (
        <Card variant="glass" className="overflow-hidden border-teal-500/20 shadow-lg shadow-teal-500/5 h-full">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-500/10 rounded-lg">
                        <Calculator className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                        <CardTitle>What-If GPA Simulator</CardTitle>
                        <CardDescription>Predict your final GPA based on future performance</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                <div className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-slate-300">Target Grade Point Average</Label>
                            <span className="text-teal-400 font-bold text-lg">{targetCGPA.toFixed(2)}</span>
                        </div>
                        <Slider
                            value={[targetCGPA]}
                            min={2.0}
                            max={4.0}
                            step={0.01}
                            onValueChange={(vals) => setTargetCGPA(vals[0] ?? 3.5)}
                            className="py-4"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-slate-300">Credits Remaining</Label>
                            <span className="text-white font-mono">{remainingCredits}</span>
                        </div>
                        <Slider
                            value={[remainingCredits]}
                            min={1}
                            max={60}
                            step={1}
                            onValueChange={(vals) => setRemainingCredits(vals[0] ?? 30)}
                            className="py-4"
                        />
                    </div>

                    <Button
                        onClick={handleSimulate}
                        disabled={isLoading}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-6"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-5 h-5 mr-2" />}
                        Run Simulation
                    </Button>
                </div>

                {simulation && (
                    <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-bottom-2 duration-500 ${simulation.isPossible ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                        <div className="flex items-start gap-3">
                            {simulation.isPossible ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            )}
                            <div className="space-y-1">
                                <div className={`font-bold ${simulation.isPossible ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {simulation.isPossible ? 'Target Reachable!' : 'Target Out of Reach'}
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    {data.message}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase">Projected GPA</div>
                                <div className="text-lg font-bold text-white">{simulation.projectedGPA.toFixed(2)}</div>
                            </div>
                            <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase text-center">Required Average</div>
                                <div className={`text-lg font-bold text-center ${simulation.isPossible ? 'text-teal-400' : 'text-red-400'}`}>
                                    {simulation.requiredAverage.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                    <Target className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-400 leading-tight">
                        Based on your current cumulative GPA of <strong>{simulation?.currentGPA.toFixed(2) || '---'}</strong>. Simulation assumes standard 4.0 scale and credit weighting.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

