import { AnalyticsErrorBoundary } from '@/components/providers/AnalyticsErrorBoundary';

/**
 * Analytics sub-section layout.
 *
 * Wraps every analytics page (overview, strategic, weekly-review) in a
 * client-side AnalyticsErrorBoundary so a render crash in one chart card
 * (e.g. undefined stats from backend, recharts shape mismatch) never takes
 * down the whole dashboard.
 *
 * Next.js `error.tsx` handles async route-level errors;
 * this boundary catches synchronous render errors inside components.
 */
export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
    return (
        <AnalyticsErrorBoundary context="analytics">
            {children}
        </AnalyticsErrorBoundary>
    );
}
