import { Calendar, Download } from 'lucide-react';
import { FilterDropdown } from '../planner/FilterDropdown';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../ui/button';

interface AnalyticsHeaderProps {
    pastDays: string;
    setPastDays: (value: string) => void;
    onExport?: () => void;
}

const PAST_DAYS_OPTIONS = [
    { label: "Daily", value: "1" },
    { label: "Weekly", value: "7" },
] as const;

export function AnalyticsHeader({ pastDays, setPastDays, onExport }: AnalyticsHeaderProps) {
    return (
        <header className="mb-8">
            <PageHeader
                title="Analytics Overview"
                subtitle="Track your productivity trends and study habits."
            >
                    <div className="flex flex-wrap items-center justify-start md:justify-end gap-3 w-full md:w-auto min-w-0">
                        <FilterDropdown
                            value={pastDays}
                            options={PAST_DAYS_OPTIONS}
                            onChange={setPastDays}
                            icon={<Calendar className="w-4 h-4" />}
                            placeholder={'Select'}
                        />
                        <Button
                            onClick={onExport}
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-cyan-500/25 h-12 px-4 md:px-6 rounded-xl font-bold"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Export Report</span>
                        </Button>
                    </div>
                </PageHeader>
        </header>
    );
}
