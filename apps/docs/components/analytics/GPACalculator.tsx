'use client';

<<<<<<< HEAD
import { useMemo, useState } from 'react';
import { useGetGPAQuery, useAddCourseGradeMutation, CGPAResult } from '@repo/store';
=======
import { useState } from 'react';
import { useGetGPAQuery, useAddCourseGradeMutation } from '@repo/store';
>>>>>>> origin/main
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Plus, TrendingUp, Award } from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';
import { getApiErrorMessage } from '@/lib/api-error';

export function GPACalculator() {
    const { data, isLoading, isError } = useGetGPAQuery();
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    type SemesterBreakdown = { semester: number; gpa?: number; credits?: number };
    type CourseItem = { courseName: string; semester?: number; grade?: string; gradePoint?: number; credits?: number };

    const handleAddCourse = async () => {
        // Client-side validation to avoid sending NaN to the API
        const courseName = (newCourse.courseName || '').trim();
        const creditsNum = parseFloat(newCourse.credits);
        const gradePointNum = parseFloat(newCourse.gradePoint);
        const semesterNum = newCourse.semester ? parseInt(newCourse.semester) : undefined;

        if (!courseName) {
            toast('Please enter a course name', 'error');
            return;
        }
        if (isNaN(creditsNum) || creditsNum <= 0) {
            toast('Please enter valid credits (number > 0)', 'error');
            return;
        }
        if (isNaN(gradePointNum) || gradePointNum < 0 || gradePointNum > 10) {
            toast('Please enter a valid grade point (0 - 10)', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await addCourse({
                courseName,
                credits: creditsNum,
                gradePoint: gradePointNum,
                grade: newCourse.grade ? newCourse.grade.trim() : undefined,
                semester: semesterNum,
            }).unwrap();

            toast('Course added successfully!', 'success');
            setIsAddOpen(false);
            setNewCourse({ courseName: '', credits: '', gradePoint: '', grade: '', semester: '' });
<<<<<<< HEAD
        } catch (error: unknown) {
            toast(getApiErrorMessage(error, 'Failed to add course'), 'error');
        } finally {
            setIsSubmitting(false);
=======
        } catch {
            toast('Failed to add course', 'error');
>>>>>>> origin/main
        }
    };

    const gpaData: CGPAResult | undefined = useMemo(() => {
        const root = data as
            | (CGPAResult & { result?: CGPAResult; stats?: CGPAResult; semesters?: Array<{ semester: number; gpa: number; totalCredits: number; courses: Array<{ courseName: string; credits: number; gradePoint: number; grade?: string; id?: string }> }>; currentCGPA?: number; courseGrades?: Array<{ courseName: string; credits: number; gradePoint: number; grade?: string; semester?: number }> })
            | undefined;
        if (!root) return undefined;

        const source = root.result ?? root.stats ?? root;
        const coursesFromSource = source.courses ?? root.courseGrades ?? [];
        const normalizedCourses = coursesFromSource.map((course) => ({
            courseName: course.courseName,
            credits: Number(course.credits ?? 0),
            gradePoint: Number(course.gradePoint ?? 0),
            grade: course.grade ?? undefined,
            semester: course.semester ?? undefined,
        }));

        const semesterBreakdown =
            source.semesterBreakdown ??
            root.semesters?.map((semester) => ({
                semester: semester.semester,
                gpa: semester.gpa,
                credits: semester.totalCredits,
            })) ??
            [];

        const totalCredits =
            Number(source.totalCredits ?? 0) ||
            normalizedCourses.reduce((sum, course) => sum + course.credits, 0);

        return {
            cgpa: Number(source.cgpa ?? root.currentCGPA ?? 0),
            totalCredits,
            semesterBreakdown,
            courses: normalizedCourses,
        };
    }, [data]);

    if (isLoading) {
        return (
            <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border-white/20 p-6">
                <Skeleton className="h-8 w-48 bg-white/5 mb-4" />
                <Skeleton className="h-32 w-full bg-white/5" />
            </Card>
        );
    }

<<<<<<< HEAD
=======
    const gpaData = data?.result;
    const semesterBreakdown = (gpaData?.semesterBreakdown ?? []) as SemesterBreakdown[];
    const courses = (gpaData?.courses ?? []) as CourseItem[];

>>>>>>> origin/main
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
                                <Button
                                    onClick={handleAddCourse}
                                    disabled={isSubmitting}
                                    className={`w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
                                    {isSubmitting ? 'Adding…' : 'Add Course'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {isError ? (
                    <div className="text-center py-8 text-red-300">
                        Unable to load GPA data right now. Please refresh in a moment.
                    </div>
                ) : gpaData ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Award className="w-5 h-5 text-indigo-400" />
                                <span className="text-sm text-slate-400">CGPA</span>
                            </div>
                            <div className="text-3xl font-bold text-indigo-400">{(gpaData.cgpa ?? 0).toFixed(2)}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-purple-400" />
                                <span className="text-sm text-slate-400">Total Credits</span>
                            </div>
                            <div className="text-3xl font-bold text-purple-400">{gpaData.totalCredits ?? 0}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <GraduationCap className="w-5 h-5 text-blue-400" />
                                <span className="text-sm text-slate-400">Courses</span>
                            </div>
                            <div className="text-3xl font-bold text-blue-400">{gpaData.courses?.length ?? 0}</div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400">
                        No GPA data available. Add your first course to get started!
                    </div>
                )}
            </Card>

            {/* Semester Breakdown */}
            {gpaData && semesterBreakdown.length > 0 && (
                <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Semester Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
<<<<<<< HEAD
                        {gpaData.semesterBreakdown.map((sem) => (
=======
                        {semesterBreakdown.map((sem) => (
>>>>>>> origin/main
                            <div key={sem.semester} className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <div className="text-sm text-slate-400 mb-1">Semester {sem.semester}</div>
                                <div className="text-2xl font-bold text-white">{(sem.gpa ?? 0).toFixed(2)}</div>
                                <div className="text-xs text-slate-500 mt-1">{sem.credits ?? 0} credits</div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Course List */}
            {gpaData && courses.length > 0 && (
                <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">All Courses</h3>
                    <div className="space-y-2">
<<<<<<< HEAD
                        {gpaData.courses.map((course, idx) => (
                            <div key={`${course.courseName}-${course.semester ?? idx}-${idx}`} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
=======
                        {courses.map((course, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
>>>>>>> origin/main
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
                                        <div className="text-sm font-semibold text-white">{(course.gradePoint ?? 0).toFixed(1)}</div>
                                        <div className="text-xs text-slate-500">{course.credits ?? 0} credits</div>
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
