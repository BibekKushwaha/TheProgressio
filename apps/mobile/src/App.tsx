import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

// Background heartbeat task name
const HEARTBEAT_TASK = 'FOCUS_SESSION_HEARTBEAT';

// Register heartbeat background task
TaskManager.defineTask(HEARTBEAT_TASK, async () => {
    // This runs in the background to keep focus sessions alive
    try {
        const sessionData = await getActiveSession();
        if (sessionData) {
            await sendHeartbeat(sessionData.sessionId, sessionData.auth);
        }
    } catch (error) {
        console.warn('[Heartbeat] Background task error:', error);
    }
});

// Placeholder functions — these will be implemented with the native bridge
async function getActiveSession(): Promise<{ sessionId: string; auth: any } | null> {
    // TODO: Read from AsyncStorage or MMKV
    return null;
}

async function sendHeartbeat(_sessionId: string, _auth: any): Promise<void> {
    // Delegates to focusBridge.update()
}

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

export default function App() {
    useEffect(() => {
        // Request notification permissions on first launch
        Notifications.requestPermissionsAsync();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Transition</Text>
            <Text style={styles.subtitle}>Academic Companion</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#F1F5F9',
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        marginTop: 8,
    },
});
