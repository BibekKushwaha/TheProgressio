/**
 * Reusable placeholder for screens under active development.
 * Shows the screen name and planned features.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenWrapper } from './ScreenWrapper';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface PlaceholderScreenProps {
    title: string;
    description?: string;
    plannedFeatures?: string[];
}

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({
    title,
    description,
    plannedFeatures = [],
}) => (
    <ScreenWrapper scrollable>
        <View style={styles.container}>
            {/* Glow circle */}
            <View style={styles.glowBg} />

            <View style={styles.badge}>
                <Text style={styles.badgeText}>🚧 In Progress</Text>
            </View>

            <Text style={styles.title}>{title}</Text>

            {description && (
                <Text style={styles.description}>{description}</Text>
            )}

            {plannedFeatures.length > 0 && (
                <View style={styles.featureList}>
                    <Text style={styles.featureHeader}>Planned Features</Text>
                    {plannedFeatures.map((f, i) => (
                        <View key={i} style={styles.featureRow}>
                            <View style={styles.dot} />
                            <Text style={styles.featureText}>{f}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    </ScreenWrapper>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing['12'],
    },
    glowBg: {
        position: 'absolute',
        top: -80,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: Colors.primary,
        opacity: 0.04,
    },
    badge: {
        backgroundColor: 'rgba(99,102,241,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.3)',
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['4'],
        paddingVertical: Spacing['1'],
        marginBottom: Spacing['4'],
    },
    badgeText: {
        color: Colors.primaryLight,
        fontSize: Typography.fontSize.sm,
        fontWeight: '500',
    },
    title: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize['3xl'],
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: Spacing['3'],
    },
    description: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.base,
        textAlign: 'center',
        marginBottom: Spacing['8'],
        lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
        paddingHorizontal: Spacing['4'],
    },
    featureList: {
        width: '100%',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.xl,
        padding: Spacing['5'],
    },
    featureHeader: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing['3'],
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing['2'],
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
        marginRight: Spacing['3'],
    },
    featureText: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        flex: 1,
    },
});
