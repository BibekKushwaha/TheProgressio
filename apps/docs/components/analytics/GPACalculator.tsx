'use client';

import { useState } from 'react';
import { useGetGPAQuery, useAddCourseGradeMutation, useUpdateCourseGradeMutation, useDeleteCourseGradeMutation, usePreviewGPAComponentsMutation } from '@repo/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Plus, TrendingUp, Award, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';

export function GPACalculator() {
    const { data, isLoading } = useGetGPAQuery();
    const [addCourse] = useAddCourseGradeMutation();
    const [updateCourse] = useUpdateCourseGradeMutation();
    const [deleteCourse] = useDeleteCourseGradeMutation();
    const [previewComponents, { data: componentPreview, isLoading: isPreviewingComponents }] = usePreviewGPAComponentsMutation();
    const { toast } = useToast();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [newCourse, setNewCourse] = useState({
        courseName: '',
        credits: '',
        gradePoint: '',
        grade: '',
        semester: '',
    });
    const [components, setComponents] = useState([
        { name: 'Assignment', weight: '30', obtainedMarks: '0', totalMarks: '100' },
        { name: 'Midterm', weight: '30', obtainedMarks: '0', totalMarks: '100' },
        { name: 'Final', weight: '40', obtainedMarks: '0', totalMarks: '100' },
    ]);
    const [componentScale, setComponentScale] = useState<'INDIA_10' | 'US_4' | 'PERCENTAGE'>('INDIA_10');

    type SemesterBreakdown = { semester: number; gpa?: number; credits?: number };
    type CourseItem = { id: string; courseName: string; semester?: number; grade?: string; gradePoint?: number; credits?: number };

    const handleAddCourse = async () => {
        try {
            if (editingCourseId) {
                await updateCourse({
                    id: editingCourseId,
                    courseName: newCourse.courseName,
                    credits: parseFloat(newCourse.credits),
                    gradePoint: parseFloat(newCourse.gradePoint),
                    grade: newCourse.grade || undefined,
                    semester: newCourse.semester ? parseInt(newCourse.semester) : undefined,
                }).unwrap();
                toast('Course updated successfully!', 'success');
            } else {
                await addCourse({
                    courseName: newCourse.courseName,
                    credits: parseFloat(newCourse.credits),
                    gradePoint: parseFloat(newCourse.gradePoint),
                    grade: newCourse.grade || undefined,
                    semester: newCourse.semester ? parseInt(newCourse.semester) : undefined,
                }).unwrap();
                toast('Course added successfully!', 'success');
            }

            setIsAddOpen(false);
            setEditingCourseId(null);
            setNewCourse({ courseName: '', credits: '', gradePoint: '', grade: '', semester: '' });
        } catch {
            toast(editingCourseId ? 'Failed to update course' : 'Failed to add course', 'error');
        }
    };

    const handleDeleteCourse = async (id: string) => {
        if (!confirm('Are you sure you want to delete this course grade?')) return;
        try {
            await deleteCourse(id).unwrap();
            toast('Course deleted successfully!', 'success');
        } catch {
            toast('Failed to delete course', 'error');
        }
    };

    const startEditing = (course: CourseItem) => {
        setEditingCourseId(course.id);
        setNewCourse({
            courseName: course.courseName,
            credits: String(course.credits ?? ''),
            gradePoint: String(course.gradePoint ?? ''),
            grade: course.grade ?? '',
            semester: String(course.semester ?? ''),
        });
        setIsAddOpen(true);
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
    const semesterBreakdown = (gpaData?.semesterBreakdown ?? []) as SemesterBreakdown[];
    const courses = (gpaData?.courses ?? []) as CourseItem[];
    const updateComponent = (index: number, patch: Partial<{ name: string; weight: string; obtainedMarks: string; totalMarks: string }>) => {
        setComponents((current) =>
            current.map((item, currentIndex) =>
                currentIndex === index ? { ...item, ...patch } : item,
            ),
        );
    };

    const handlePreviewComponents = async () => {
        try {
            await previewComponents({
                scale: componentScale,
                components: components.map((component) => ({
                    name: component.name,
                    weight: parseFloat(component.weight) || 0,
                    obtainedMarks: parseFloat(component.obtainedMarks) || 0,
                    totalMarks: parseFloat(component.totalMarks) || 0,
                })),
            }).unwrap();
        } catch {
            toast('Unable to preview component GPA', 'error');
        }
    };

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
                    <Dialog open={isAddOpen} onOpenChange={(open) => {
                        setIsAddOpen(open);
                        if (!open) {
                            setEditingCourseId(null);
                            setNewCourse({ courseName: '', credits: '', gradePoint: '', grade: '', semester: '' });
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-500 hover:bg-indigo-600">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Course
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-white/10 text-white">
                            <DialogHeader>
                                <DialogTitle>{editingCourseId ? 'Edit Course Grade' : 'Add Course Grade'}</DialogTitle>
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
                                    {editingCourseId ? 'Update Course' : 'Add Course'}
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
            <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Weighted Component Preview</h3>
                <p className="text-xs text-slate-400 mb-3">
                    Configure custom grading components (for example: Finals 40%, Internals 60%).
                </p>

                <div className="mb-3 flex items-center gap-2">
                    <label className="text-xs text-slate-400">Scale</label>
                    <select
                        value={componentScale}
                        onChange={(event) => setComponentScale(event.target.value as 'INDIA_10' | 'US_4' | 'PERCENTAGE')}
                        className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white"
                    >
                        <option value="INDIA_10" className="bg-slate-900">INDIA_10</option>
                        <option value="US_4" className="bg-slate-900">US_4</option>
                        <option value="PERCENTAGE" className="bg-slate-900">PERCENTAGE</option>
                    </select>
                </div>

                <div className="space-y-2">
                    {components.map((component, index) => (
                        <div key={`${component.name}-${index}`} className="grid grid-cols-4 gap-2">
                            <Input
                                value={component.name}
                                onChange={(event) => updateComponent(index, { name: event.target.value })}
                                className="bg-white/5 border-white/10"
                                placeholder="Component"
                            />
                            <Input
                                value={component.weight}
                                onChange={(event) => updateComponent(index, { weight: event.target.value })}
                                className="bg-white/5 border-white/10"
                                placeholder="Weight %"
                                type="number"
                                step="any"
                                min="0"
                            />
                            <Input
                                value={component.obtainedMarks}
                                onChange={(event) => updateComponent(index, { obtainedMarks: event.target.value })}
                                className="bg-white/5 border-white/10"
                                placeholder="Scored"
                                type="number"
                                step="any"
                                min="0"
                            />
                            <Input
                                value={component.totalMarks}
                                onChange={(event) => updateComponent(index, { totalMarks: event.target.value })}
                                className="bg-white/5 border-white/10"
                                placeholder="Total"
                                type="number"
                                step="any"
                                min="1"
                            />
                        </div>
                    ))}
                </div>

                <Button onClick={handlePreviewComponents} className="mt-4 bg-indigo-500 hover:bg-indigo-600">
                    {isPreviewingComponents ? 'Calculating...' : 'Preview Weighted GPA'}
                </Button>

                {componentPreview?.result && (
                    <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                        <p className="text-sm text-cyan-200">
                            Weighted Score: <span className="font-bold text-white">{componentPreview.result.weightedPercentage.toFixed(2)}%</span>
                        </p>
                        <p className="text-sm text-cyan-200 mt-1">
                            Grade Point: <span className="font-bold text-white">{componentPreview.result.weightedGradePoint.toFixed(2)}</span> ({componentPreview.result.scale})
                        </p>
                    </div>
                )}
            </Card>

            {/* Semester Breakdown */}
            {gpaData && semesterBreakdown.length > 0 && (
                <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Semester Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {semesterBreakdown.map((sem) => (
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
                        {courses.map((course, idx) => (
                            <div key={course.id || idx} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3 group">
                                <div className="flex-1">
                                    <div className="font-semibold text-white">{course.courseName}</div>
                                    {course.semester && <div className="text-xs text-slate-500">Semester {course.semester}</div>}
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="hidden group-hover:flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-white"
                                            onClick={() => startEditing(course)}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-400"
                                            onClick={() => handleDeleteCourse(course.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
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
