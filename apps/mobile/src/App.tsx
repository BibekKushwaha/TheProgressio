import React, { useRef, useEffect } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
// @ts-ignore — navigation type-mismatch under strict React 18/19 compat; safe at runtime
const NavContainer = NavigationContainer as React.ElementType;
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { StoreProvider, useAppSelector, useAppDispatch } from '@repo/store';
import { RootNavigator } from './navigation/RootNavigator';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { initSentry, setSentryUser } from './native/sentry';
import { startSyncEngine, stopSyncEngine } from './native/syncEngine';
import { usePushNotifications } from './native/pushNotifications';
import type { RootStackParamList } from './navigation/types';

// ─── Initialise Sentry once at module load ────────────────────────────────────
initSentry();

// ─── Deep linking configuration ───────────────────────────────────────────────
const linking = {
    prefixes: ['theprogressio://'],
    config: {
        screens: {
            Auth: {
                screens: {
                    Login: 'login',
                    Signup: 'signup',
                    ForgotPassword: 'forgot-password',
                    ResetPassword: 'reset-password',
                },
            },
            App: {
                screens: {
                    HomeTab: {
                        screens: {
                            Dashboard: 'dashboard',
                            NotificationCenter: 'notifications',
                            MorningBriefing: 'briefing',
                        },
                    },
                    TasksTab: {
                        screens: {
                            TaskList: 'tasks',
                            TaskDetail: 'tasks/:taskId',
                            CreateTask: 'tasks/new',
                            Calendar: 'calendar',
                            SubjectLibrary: 'subjects',
                            SubjectDetail: 'subjects/:subjectId',
                            Planner: 'planner',
                            SyllabusDigitizer: 'syllabus',
                        },
                    },
                    FocusTab: {
                        screens: {
                            FocusSession: 'focus',
                            FocusHistory: 'focus/history',
                            SessionComplete: 'focus/complete',
                        },
                    },
                    InsightsTab: {
                        screens: {
                            AnalyticsOverview: 'analytics',
                            StrategicAnalytics: 'analytics/strategic',
                            HabitGallery: 'habits',
                            HabitDetail: 'habits/:habitId',
                            ExamWarRoom: 'exam-warroom',
                            GPACalculator: 'gpa',
                            Achievements: 'achievements',
                            Reports: 'reports',
                        },
                    },
                    ProfileTab: {
                        screens: {
                            Profile: 'profile',
                            FamilyConnect: 'family-connect',
                            FamilyInvite: 'family-connect/accept',
                            Subscription: 'subscription',
                            QRAttendance: 'qr-attendance',
                            Advanced: 'settings/advanced',
                        },
                    },
                },
            },
        },
    },
};

// ─── Inner app — has access to Redux store ────────────────────────────────────

const InnerApp: React.FC = () => {
    const dispatch = useAppDispatch();
    const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
    const user = useAppSelector((state: any) => state.auth?.user);

    // Start offline sync engine, stop on unmount
    useEffect(() => {
        startSyncEngine(dispatch);
        return () => stopSyncEngine();
    }, [dispatch]);

    // Update Sentry user when auth changes
    useEffect(() => {
        setSentryUser(user ? { id: user.id, email: user.email, name: user.name } : null);
    }, [user]);

    // Register push notification token and handle deep-link taps
    usePushNotifications(navRef as any, user?.id);

    return (
        <NavContainer ref={navRef} linking={linking as any}>
            <RootNavigator />
        </NavContainer>
    );
};

// ─── Root entry point ─────────────────────────────────────────────────────────

const AppEntry: React.FC = () => (
    <GlobalErrorBoundary>
        <GestureHandlerRootView style={styles.root}>
            <StoreProvider>
                <InnerApp />
            </StoreProvider>
        </GestureHandlerRootView>
    </GlobalErrorBoundary>
);

const styles = StyleSheet.create({
    root: { flex: 1 },
});

export default AppEntry;
