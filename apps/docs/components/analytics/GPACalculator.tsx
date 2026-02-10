'use client';

import { useState } from 'react';
import { useGetGPAQuery, useAddCourseGradeMutation, CourseGrade } from '@repo/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Plus, TrendingUp, Award } from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';

export function GPACalculator() {
    const { data, isLoading } = useGetGPAQuery();
    const [addCourse] = useAddCourseGradeMutation();
    const { toast } = useToast();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newCourse, setNewCourse] = useState({
        courseName: '',
        credits: '',
        gradePoint: '',
        grade: '',
        semester: '',
    });

    const handleAddCourse = async () => {
        try {
            await addCourse({
                courseName: newCourse.courseName,
                credits: parseFloat(newCourse.credits),
                gradePoint: parseFloat(newCourse.gradePoint),
                grade: newCourse.grade || undefined,
                semester: newCourse.semester ? parseInt(newCourse.semester) : undefined,
            }).unwrap();

            toast('Course added successfully!', 'success');
            setIsAddOpen(false);
            setNewCourse({ courseName: '', credits: '', gradePoint: '', grade: '', semester: '' });
        } catch (error) {
            toast('Failed to add course', 'error');
        }
    };

    if (isLoading) {
        return (
            <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border-white/20 p-6">
                <Skeleton className="h-8 w-48 bg-white/5 mb-4" />
                <Skeleton className="h-32 w-full bg-white/5" />
            </Card>
        );
    }

    const gpaData = data?.result;

    return (
        <div className="space-y-6">
            {/* CGPA Overview */}
            <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-md border-indigo-500/20 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">GPA Calculator</h2>
                            <p className="text-sm text-slate-400">Track your academic performance</p>
                        </div>
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-500 hover:bg-indigo-600">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Course
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-white/10 text-white">
                            <DialogHeader>
                                <DialogTitle>Add Course Grade</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Input
                                    placeholder="Course Name"
                                    value={newCourse.courseName}
                                    onChange={(e) => setNewCourse({ ...newCourse, courseName: e.target.value })}
                                    className="bg-white/5 border-white/10"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        type="number"
                                        placeholder="Credits"
                                        value={newCourse.credits}
                                        onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })}
                                        className="bg-white/5 border-white/10"
                                    />
                                    <Input
                                        type="number"
                                        step="0.1"
                                        placeholder="Grade Point (0-10)"
                                        value={newCourse.gradePoint}
                                        onChange={(e) => setNewCourse({ ...newCourse, gradePoint: e.target.value })}
                                        className="bg-white/5 border-white/10"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Grade (e.g., A+)"
                                        value={newCourse.grade}
                                        onChange={(e) => setNewCourse({ ...newCourse, grade: e.target.value })}
                                        className="bg-white/5 border-white/10"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Semester"
                                        value={newCourse.semester}
                                        onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
                                        className="bg-white/5 border-white/10"
                                    />
                                </div>
                                <Button onClick={handleAddCourse} className="w-full bg-indigo-500 hover:bg-indigo-600">
                                    Add Course
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {gpaData ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Award className="w-5 h-5 text-indigo-400" />
                                <span className="text-sm text-slate-400">CGPA</span>
                            </div>
                            <div className="text-3xl font-bold text-indigo-400">{gpaData.cgpa.toFixed(2)}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-purple-400" />
                                <span className="text-sm text-slate-400">Total Credits</span>
                            </div>
                            <div className="text-3xl font-bold text-purple-400">{gpaData.totalCredits}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <GraduationCap className="w-5 h-5 text-blue-400" />
                                <span className="text-sm text-slate-400">Courses</span>
                            </div>
                            <div className="text-3xl font-bold text-blue-400">{gpaData.courses.length}</div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400">
                        No GPA data available. Add your first course to get started!
                    </div>
                )}
            </Card>

            {/* Semester Breakdown */}
            {gpaData && gpaData.semesterBreakdown && gpaData.semesterBreakdown.length > 0 && (
                <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Semester Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {gpaData.semesterBreakdown.map((sem: any) => (
                            <div key={sem.semester} className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <div className="text-sm text-slate-400 mb-1">Semester {sem.semester}</div>
                                <div className="text-2xl font-bold text-white">{sem.gpa.toFixed(2)}</div>
                                <div className="text-xs text-slate-500 mt-1">{sem.credits} credits</div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Course List */}
            {gpaData && gpaData.courses && gpaData.courses.length > 0 && (
                <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">All Courses</h3>
                    <div className="space-y-2">
                        {gpaData.courses.map((course: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                                <div className="flex-1">
                                    <div className="font-semibold text-white">{course.courseName}</div>
                                    {course.semester && <div className="text-xs text-slate-500">Semester {course.semester}</div>}
                                </div>
                                <div className="flex items-center gap-4">
                                    {course.grade && (
                                        <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-indigo-400 font-semibold">
                                            {course.grade}
                                        </div>
                                    )}
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-white">{course.gradePoint.toFixed(1)}</div>
                                        <div className="text-xs text-slate-500">{course.credits} credits</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
