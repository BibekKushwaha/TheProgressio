// components/focus-session/CircularProgress.tsx
interface CircularProgressProps {
    progress: number;
    children: React.ReactNode;
}

export function CircularProgress({ progress, children }: CircularProgressProps) {
    const radius = 160;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative">
            <svg className="w-96 h-96 -rotate-90" viewBox="0 0 400 400">
                <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgb(147, 51, 234)" />
                        <stop offset="100%" stopColor="rgb(79, 70, 229)" />
                    </linearGradient>
                </defs>

                <circle
                    cx="200"
                    cy="200"
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth="12"
                />

                <circle
                    cx="200"
                    cy="200"
                    r={radius}
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear drop-shadow-[0_0_20px_rgba(147,51,234,0.5)]"
                />
            </svg>

            <div className="absolute inset-0 flex items-center justify-center">
                {children}
            </div>
        </div>
    );
}