import { Calendar, Download } from 'lucide-react';
import { FilterDropdown } from '../planner/FilterDropdown';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../ui/button';

interface AnalyticsHeaderProps {
    pastDays: string;
    setPastDays: (value: string) => void;
    onExport?: () => void;
}

export function AnalyticsHeader({ pastDays, setPastDays, onExport }: AnalyticsHeaderProps) {
    const PAST_DAYS_OPTIONS = [
        { label: "Daily", value: "1" },
        { label: "Weekly", value: "7" },
    ] as const;

    return (
        <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl p-4 md:p-6 mb-6">
            <div className="max-w-7xl mx-auto">
                <PageHeader
                    title="Analytics Overview"
                    subtitle="Track your productivity trends and study habits."
                    className="mb-0" // Remove default margin as header provides padding
                >
                    <div className="flex gap-3">
                        <FilterDropdown
                            value={pastDays}
                            options={PAST_DAYS_OPTIONS}
                            onChange={setPastDays}
                            icon={<Calendar className="w-4 h-4" />}
                            placeholder={'Select'}
                        />
                        <Button
                            onClick={onExport}
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-cyan-500/25 h-12 px-6 rounded-xl font-bold"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export Report
                        </Button>
                    </div>
                </PageHeader>
            </div>
        </header>
    );
}
