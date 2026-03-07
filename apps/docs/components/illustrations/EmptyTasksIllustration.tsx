"use client";

import { motion } from "framer-motion";

export function EmptyTasksIllustration({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 200 150"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Background elements */}
            <motion.rect
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                x="40"
                y="30"
                width="120"
                height="90"
                rx="12"
                fill="currentColor"
                className="text-white/5"
            />

            <motion.rect
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                x="55"
                y="50"
                width="60"
                height="8"
                rx="4"
                fill="currentColor"
                className="text-white/10"
            />
            <motion.rect
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                x="55"
                y="70"
                width="90"
                height="8"
                rx="4"
                fill="currentColor"
                className="text-white/10"
            />
            <motion.rect
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                x="55"
                y="90"
                width="70"
                height="8"
                rx="4"
                fill="currentColor"
                className="text-white/10"
            />

            {/* Checkmark circle */}
            <motion.circle
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
                cx="130"
                cy="90"
                r="18"
                fill="url(#paint0_linear)"
            />
            <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.7 }}
                d="M123 90L128 95L137 85"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <defs>
                <linearGradient
                    id="paint0_linear"
                    x1="112"
                    y1="72"
                    x2="148"
                    y2="108"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#A855F7" />
                    <stop offset="1" stopColor="#EC4899" />
                </linearGradient>
            </defs>
        </svg>
    );
}
