/**
 * ScreenWrapper – base layout for every screen.
 * Provides SafeAreaView, status bar styling, and optional scroll.
 */
import React from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing } from '../theme';

// @ts-ignore — safe-area-context / React 18→19 JSX type mismatch; safe at runtime
const SafeArea = SafeAreaView as React.ElementType;

interface ScreenWrapperProps {
    children: React.ReactNode;
    scrollable?: boolean;
    style?: ViewStyle | ViewStyle[];
    contentStyle?: ViewStyle;
    edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
    children,
    scrollable = false,
    style,
    contentStyle,
    edges = ['top', 'left', 'right'],
}) => {
    return (
        <SafeArea style={[styles.safe, style]} edges={edges}>
            <StatusBar style="light" backgroundColor={Colors.background} />
            {scrollable ? (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, contentStyle]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {children}
                </ScrollView>
            ) : (
                <View style={[styles.content, contentStyle]}>{children}</View>
            )}
        </SafeArea>
    );
};

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing['4'],
        paddingBottom: Spacing['8'],
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing['4'],
    },
});
