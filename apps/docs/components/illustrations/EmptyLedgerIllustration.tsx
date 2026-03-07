"use client";

import { motion } from "framer-motion";

export function EmptyLedgerIllustration({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 200 150"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <motion.rect
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                x="30" y="40" width="140" height="80" rx="10"
                fill="currentColor" className="text-white/5"
            />

            {/* Chart bars */}
            <motion.rect initial={{ height: 0, y: 100 }} animate={{ height: 30, y: 70 }} transition={{ duration: 0.5, delay: 0.2 }} x="50" y="100" width="15" height="0" rx="4" fill="currentColor" className="text-white/10" />
            <motion.rect initial={{ height: 0, y: 100 }} animate={{ height: 50, y: 50 }} transition={{ duration: 0.5, delay: 0.3 }} x="80" y="100" width="15" height="0" rx="4" fill="url(#paint0_linear_ledger)" />
            <motion.rect initial={{ height: 0, y: 100 }} animate={{ height: 20, y: 80 }} transition={{ duration: 0.5, delay: 0.4 }} x="110" y="100" width="15" height="0" rx="4" fill="currentColor" className="text-white/10" />
            <motion.rect initial={{ height: 0, y: 100 }} animate={{ height: 40, y: 60 }} transition={{ duration: 0.5, delay: 0.5 }} x="140" y="100" width="15" height="0" rx="4" fill="currentColor" className="text-white/10" />

            <defs>
                <linearGradient id="paint0_linear_ledger" x1="80" y1="50" x2="95" y2="100" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#A855F7" />
                    <stop offset="1" stopColor="#EC4899" />
                </linearGradient>
            </defs>
        </svg>
    );
}
