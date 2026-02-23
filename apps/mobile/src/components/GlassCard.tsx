/**
 * GlassCard – frosted glass surface matching apps/docs Card variant="glass"
 */
import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Colors, Radius, Shadow } from '../theme';

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style }) => (
    <View style={[styles.card, style]}>{children}</View>
);

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.glassBg,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        borderRadius: Radius.xl,
        padding: 16,
        ...Shadow.md,
    },
});
