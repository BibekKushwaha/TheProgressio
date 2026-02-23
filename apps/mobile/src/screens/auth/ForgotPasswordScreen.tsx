import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { ScreenWrapper } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useForgotPasswordMutation } from '@repo/store';
import type { AuthScreenProps } from '../../navigation/types';

export const ForgotPasswordScreen: React.FC<AuthScreenProps<'ForgotPassword'>> = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [forgotApi, { isLoading }] = useForgotPasswordMutation();

    const handleSubmit = async () => {
        if (!email.trim()) return;
        try {
            await forgotApi({ email: email.trim() }).unwrap();
            setSent(true);
        } catch (err) {
            console.error('Forgot password failed', err);
        }
    };

    return (
        <ScreenWrapper scrollable>
            <View style={styles.container}>
                {sent ? (
                    <View style={styles.successBox}>
                        <Text style={styles.successIcon}>📬</Text>
                        <Text style={styles.headline}>Check your email</Text>
                        <Text style={styles.subline}>
                            We sent a reset link to {email}. Check your inbox and follow the instructions.
                        </Text>
                        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.btnText}>Back to Sign In</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <Text style={styles.headline}>Forgot password?</Text>
                        <Text style={styles.subline}>
                            Enter your email and we&apos;ll send you a reset link.
                        </Text>
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="you@example.com"
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.btn, isLoading && styles.btnDisabled]}
                                onPress={handleSubmit}
                                disabled={isLoading}
                            >
                                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Link</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
                                <Text style={styles.backText}>← Back to Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', paddingVertical: Spacing['12'] },
    successBox: { alignItems: 'center', paddingVertical: Spacing['8'] },
    successIcon: { fontSize: 48, marginBottom: Spacing['4'] },
    headline: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700', marginBottom: Spacing['2'] },
    subline: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, marginBottom: Spacing['8'], lineHeight: 22 },
    form: { gap: Spacing['3'] },
    inputGroup: { gap: Spacing['1'] },
    label: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '500' },
    input: {
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
        borderRadius: Radius.md, paddingHorizontal: Spacing['4'], paddingVertical: Spacing['3'],
        color: Colors.textPrimary, fontSize: Typography.fontSize.base,
    },
    btn: {
        backgroundColor: Colors.primary, borderRadius: Radius.md,
        paddingVertical: Spacing['4'], alignItems: 'center', marginTop: Spacing['2'],
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '600' },
    backRow: { alignItems: 'center', marginTop: Spacing['2'] },
    backText: { color: Colors.primaryLight, fontSize: Typography.fontSize.sm },
});
