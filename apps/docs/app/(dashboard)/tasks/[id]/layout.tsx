import { TaskDetailProvider } from '@/components/planner/TaskDetailContext';

/**
 * Wraps all task-detail route children with TaskDetailProvider so every
 * sub-component reads from one shared RTK Query subscription instead of
 * independently calling useGetTaskByIdQuery (which was 4+ subscriptions
 * causing 4 re-renders per task mutation).
 */
export default function TaskDetailLayout({ children }: { children: React.ReactNode }) {
    return <TaskDetailProvider>{children}</TaskDetailProvider>;
}
