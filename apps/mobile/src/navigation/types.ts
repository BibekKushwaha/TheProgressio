// Navigation type definitions for the entire mobile app

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// ─── Auth Stack ───────────────────────────────────────────────────────────────
export type AuthStackParamList = {
    Login: undefined;
    Signup: undefined;
    ForgotPassword: undefined;
    ResetPassword: { token: string };
};

// ─── Home Stack ───────────────────────────────────────────────────────────────
export type HomeStackParamList = {
    Dashboard: undefined;
    NotificationCenter: undefined;
    MorningBriefing: undefined;
};

// ─── Tasks Stack ─────────────────────────────────────────────────────────────
export type TasksStackParamList = {
    TaskList: undefined;
    TaskDetail: { taskId: string };
    CreateTask: { prefillSubjectId?: string; taskId?: string } | undefined;
    SubjectLibrary: undefined;
    SubjectDetail: { subjectId: string; subjectName: string };
    Calendar: { date?: string } | undefined;
    EventDetail: { eventId: string; eventType: 'task' | 'exam' | 'holiday' };
    Planner: undefined;
    SyllabusDigitizer: undefined;
};

// ─── Focus Stack ─────────────────────────────────────────────────────────────
export type FocusStackParamList = {
    MenuHome: undefined;
    FocusSession: { taskId?: string } | undefined;
    SessionComplete: { sessionId: string; duration: number; taskId?: string };
    FocusHistory: undefined;
};

// ─── Insights Stack ───────────────────────────────────────────────────────────
export type InsightsStackParamList = {
    AnalyticsOverview: undefined;
    StrategicAnalytics: undefined;
    ExamWarRoom: { tab?: 'overview' | 'academic' | 'revision' } | undefined;
    GPACalculator: undefined;
    HabitGallery: undefined;
    HabitDetail: { habitId: string };
    Achievements: undefined;
    Reports: undefined;
};

// ─── Profile Stack ────────────────────────────────────────────────────────────
export type ProfileStackParamList = {
    Profile: undefined;
    FamilyConnect: undefined;
    FamilyInvite: { token: string };
    Subscription: undefined;
    QRAttendance: undefined;
    Advanced: undefined;
    AdminDashboard: undefined;
};

// ─── Tab Navigator ────────────────────────────────────────────────────────────
export type TabParamList = {
    HomeTab: undefined;
    TasksTab: undefined;
    MenuTab: undefined;
    InsightsTab: undefined;
    ProfileTab: undefined;
};

// ─── Root Navigator ───────────────────────────────────────────────────────────
export type RootStackParamList = {
    Auth: undefined;
    App: undefined;
    // Root-level modals
    CreateTaskModal: { prefillSubjectId?: string } | undefined;
    HabitLogModal: { habitId: string };
    NotificationDetailModal: { notificationId: string };
};

// ─── Screen Props Helpers ─────────────────────────────────────────────────────
export type RootStackScreenProps<T extends keyof RootStackParamList> =
    NativeStackScreenProps<RootStackParamList, T>;

export type AuthScreenProps<T extends keyof AuthStackParamList> =
    NativeStackScreenProps<AuthStackParamList, T>;

export type HomeScreenProps<T extends keyof HomeStackParamList> =
    CompositeScreenProps<
        NativeStackScreenProps<HomeStackParamList, T>,
        BottomTabScreenProps<TabParamList>
    >;

export type TasksScreenProps<T extends keyof TasksStackParamList> =
    CompositeScreenProps<
        NativeStackScreenProps<TasksStackParamList, T>,
        BottomTabScreenProps<TabParamList>
    >;

export type FocusScreenProps<T extends keyof FocusStackParamList> =
    CompositeScreenProps<
        NativeStackScreenProps<FocusStackParamList, T>,
        BottomTabScreenProps<TabParamList>
    >;

export type InsightsScreenProps<T extends keyof InsightsStackParamList> =
    CompositeScreenProps<
        NativeStackScreenProps<InsightsStackParamList, T>,
        BottomTabScreenProps<TabParamList>
    >;

export type ProfileScreenProps<T extends keyof ProfileStackParamList> =
    CompositeScreenProps<
        NativeStackScreenProps<ProfileStackParamList, T>,
        BottomTabScreenProps<TabParamList>
    >;
