/**
 * Deep Link Validator
 *
 * Validates that every registered deep link in App.tsx resolves correctly.
 * Tests both the URL schema mapping AND the notification data.screen routing.
 *
 * Usage (DEV only):
 *   import { validateDeepLinks } from '../tests/deepLinkValidator';
 *   validateDeepLinks();          // logs results to console
 *
 * Manual device test commands:
 *   # iOS Simulator
 *   xcrun simctl openurl booted "transition://tasks/abc123"
 *   xcrun simctl openurl booted "transition://habits/xyz"
 *   xcrun simctl openurl booted "transition://family-connect/accept?token=abc"
 *
 *   # Android Emulator
 *   adb shell am start -W -a android.intent.action.VIEW -d "transition://tasks/abc123"
 */

export interface DeepLinkTest {
    url: string;
    expectedScreen: string;
    expectedParams?: Record<string, string>;
    source: 'schema' | 'notification';
}

/** All deep links registered in App.tsx linking config */
export const DEEP_LINK_TESTS: DeepLinkTest[] = [
    // ── Auth ──────────────────────────────────────────────────────────────
    { url: 'transition://login', expectedScreen: 'Login', source: 'schema' },
    { url: 'transition://signup', expectedScreen: 'Signup', source: 'schema' },
    { url: 'transition://forgot-password', expectedScreen: 'ForgotPassword', source: 'schema' },
    { url: 'transition://reset-password', expectedScreen: 'ResetPassword', source: 'schema' },

    // ── Home ──────────────────────────────────────────────────────────────
    { url: 'transition://dashboard', expectedScreen: 'Dashboard', source: 'schema' },
    { url: 'transition://notifications', expectedScreen: 'NotificationCenter', source: 'schema' },

    // ── Tasks ─────────────────────────────────────────────────────────────
    { url: 'transition://tasks', expectedScreen: 'TaskList', source: 'schema' },
    { url: 'transition://tasks/abc123', expectedScreen: 'TaskDetail', expectedParams: { taskId: 'abc123' }, source: 'schema' },
    { url: 'transition://tasks/new', expectedScreen: 'CreateTask', source: 'schema' },
    { url: 'transition://calendar', expectedScreen: 'Calendar', source: 'schema' },
    { url: 'transition://subjects', expectedScreen: 'SubjectLibrary', source: 'schema' },
    { url: 'transition://subjects/phy01', expectedScreen: 'SubjectDetail', expectedParams: { subjectId: 'phy01' }, source: 'schema' },

    // ── Focus ─────────────────────────────────────────────────────────────
    { url: 'transition://focus', expectedScreen: 'FocusSession', source: 'schema' },
    { url: 'transition://focus/history', expectedScreen: 'FocusHistory', source: 'schema' },

    // ── Insights ──────────────────────────────────────────────────────────
    { url: 'transition://analytics', expectedScreen: 'AnalyticsOverview', source: 'schema' },
    { url: 'transition://habits', expectedScreen: 'HabitGallery', source: 'schema' },
    { url: 'transition://habits/hab01', expectedScreen: 'HabitDetail', expectedParams: { habitId: 'hab01' }, source: 'schema' },
    { url: 'transition://exam-warroom', expectedScreen: 'ExamWarRoom', source: 'schema' },
    { url: 'transition://achievements', expectedScreen: 'Achievements', source: 'schema' },

    // ── Profile ───────────────────────────────────────────────────────────
    { url: 'transition://profile', expectedScreen: 'Profile', source: 'schema' },
    {
        url: 'transition://family-connect/accept?token=abc123',
        expectedScreen: 'FamilyInvite',
        expectedParams: { token: 'abc123' },
        source: 'schema',
    },
    { url: 'transition://subscription', expectedScreen: 'Subscription', source: 'schema' },

    // ── Notification data.screen routing ──────────────────────────────────
    { url: 'notification:TaskDetail?taskId=t1', expectedScreen: 'TaskDetail', expectedParams: { taskId: 't1' }, source: 'notification' },
    { url: 'notification:HabitDetail?habitId=h1', expectedScreen: 'HabitDetail', expectedParams: { habitId: 'h1' }, source: 'notification' },
    { url: 'notification:FocusSession', expectedScreen: 'FocusSession', source: 'notification' },
    { url: 'notification:Dashboard', expectedScreen: 'Dashboard', source: 'notification' },
    { url: 'notification:ExamWarRoom', expectedScreen: 'ExamWarRoom', source: 'notification' },
];

/** Parse a deep link URL and extract screen + params (mirrors App.tsx linking config) */
export function parseDeepLink(url: string): { screen: string; params: Record<string, string> } | null {
    try {
        const SCHEMA = 'transition://';
        if (!url.startsWith(SCHEMA)) return null;

        const path = url.slice(SCHEMA.length);
        const [rawPath = '', queryString] = path.split('?');
        const params: Record<string, string> = {};

        if (queryString) {
            queryString.split('&').forEach((p) => {
                const [k, v] = p.split('=');
                if (k && v) params[k] = decodeURIComponent(v);
            });
        }

        const segments = rawPath.split('/');

        // Mapping mirrors App.tsx linking config
        const ROUTE_MAP: Record<string, { screen: string; paramKey?: string }> = {
            login: { screen: 'Login' },
            signup: { screen: 'Signup' },
            'forgot-password': { screen: 'ForgotPassword' },
            'reset-password': { screen: 'ResetPassword' },
            dashboard: { screen: 'Dashboard' },
            notifications: { screen: 'NotificationCenter' },
            briefing: { screen: 'MorningBriefing' },
            tasks: { screen: segments[1] === 'new' ? 'CreateTask' : segments[1] ? 'TaskDetail' : 'TaskList', paramKey: segments[1] !== 'new' ? 'taskId' : undefined },
            calendar: { screen: 'Calendar' },
            subjects: { screen: segments[1] ? 'SubjectDetail' : 'SubjectLibrary', paramKey: 'subjectId' },
            planner: { screen: 'Planner' },
            focus: { screen: segments[1] === 'history' ? 'FocusHistory' : segments[1] === 'complete' ? 'SessionComplete' : 'FocusSession' },
            analytics: { screen: segments[1] === 'strategic' ? 'StrategicAnalytics' : 'AnalyticsOverview' },
            habits: { screen: segments[1] ? 'HabitDetail' : 'HabitGallery', paramKey: 'habitId' },
            'exam-warroom': { screen: 'ExamWarRoom' },
            achievements: { screen: 'Achievements' },
            profile: { screen: 'Profile' },
            'family-connect': { screen: segments[1] === 'accept' ? 'FamilyInvite' : 'FamilyConnect' },
            subscription: { screen: 'Subscription' },
        };

        const key = segments[0] ?? '';
        const match = ROUTE_MAP[key];
        if (!match) return null;

        if (match.paramKey && segments[1] && segments[1] !== 'new' && segments[1] !== 'accept' && segments[1] !== 'history' && segments[1] !== 'complete' && segments[1] !== 'strategic') {
            params[match.paramKey] = segments[1];
        }

        return { screen: match.screen, params };
    } catch {
        return null;
    }
}

/** Run all deep link tests and return a report */
export function validateDeepLinks() {
    let passed = 0;
    let failed = 0;
    const failures: string[] = [];

    console.group('🔗 Deep Link Validation');

    DEEP_LINK_TESTS.filter((t) => t.source === 'schema').forEach((test) => {
        const result = parseDeepLink(test.url);
        const screenOk = result?.screen === test.expectedScreen;
        const paramsOk = !test.expectedParams || Object.entries(test.expectedParams).every(
            ([k, v]) => result?.params[k] === v
        );
        const ok = screenOk && paramsOk;

        if (ok) {
            passed++;
            console.log(`✅ ${test.url} → ${result?.screen}`);
        } else {
            failed++;
            const msg = `❌ ${test.url} → expected "${test.expectedScreen}" got "${result?.screen}"`;
            failures.push(msg);
            console.warn(msg);
        }
    });

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${DEEP_LINK_TESTS.filter((t) => t.source === 'schema').length} schema tests`);
    if (failures.length > 0) {
        console.warn('Failures:\n' + failures.join('\n'));
    }
    console.groupEnd();

    return { passed, failed, failures };
}
