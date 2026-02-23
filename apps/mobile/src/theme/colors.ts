// TheProgressio dark theme – matches apps/docs indigo/violet palette

export const Colors = {
    // Backgrounds
    background: '#020617',      // slate-950
    card: 'rgba(15,23,42,0.8)', // slate-900/80
    surface: 'rgba(255,255,255,0.05)',
    surfaceHover: 'rgba(255,255,255,0.1)',
    border: 'rgba(255,255,255,0.1)',

    // Brand
    primary: '#6366f1',         // indigo-500
    primaryLight: '#818cf8',    // indigo-400
    primaryDark: '#4f46e5',     // indigo-600
    secondary: '#8b5cf6',       // violet-500
    accent: '#a78bfa',          // violet-400

    // Text
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',   // slate-400
    textMuted: '#64748b',       // slate-500

    // Status
    success: '#22c55e',         // green-500
    warning: '#f59e0b',         // amber-500
    error: '#ef4444',           // red-500
    info: '#3b82f6',            // blue-500

    // Tab bar
    tabActive: '#6366f1',
    tabInactive: '#64748b',
    tabBackground: 'rgba(2,6,23,0.95)',
    tabBorder: 'rgba(255,255,255,0.08)',

    // Overlays
    overlay: 'rgba(0,0,0,0.5)',
    glassBg: 'rgba(15,23,42,0.7)',
    glassBorder: 'rgba(255,255,255,0.08)',

    // Gradients (used with LinearGradient)
    gradientStart: '#6366f1',
    gradientEnd: '#8b5cf6',
} as const;

export type AppColors = typeof Colors;
