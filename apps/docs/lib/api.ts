import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // We will proxy this in next.config.ts or just rely on relative paths if on same domain, but services are on ports.
    // Actually, for microservices, we probably want a reverse proxy or direct calls.
    // Assuming simpler setup: direct calls or Next.js API routes acting as proxy.
    // The plan implies direct integration. 
    // Let's assume we point to a gateway or individual services. 
    // For now, I'll set base URL to be configurable or empty to allow absolute URLs.
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const AUTH_SERVICE = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';
export const PLANNER_SERVICE = process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:3002';
export const HABIT_SERVICE = process.env.NEXT_PUBLIC_HABIT_SERVICE_URL || 'http://localhost:3003';
export const ANALYTICS_SERVICE = process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL || 'http://localhost:3004';

export default api;
