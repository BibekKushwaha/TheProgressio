import { Suspense } from 'react';
import { FocusSessionClient } from './FocusSessionClient';

export default function FocusSessionPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
            <FocusSessionClient />
        </Suspense>
    );
}
