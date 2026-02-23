import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { ScreenWrapper } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useLoginMutation, setCredentials, useAppDispatch } from '@repo/store';
import type { AuthScreenProps } from '../../navigation/types';

export const LoginScreen: React.FC<AuthScreenProps<'Login'>> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginApi, { isLoading }] = useLoginMutation();

    const handleLogin = async () => {
        if (!email.trim() || !password) return;
        try {
            const result = await loginApi({ email: email.trim(), password }).unwrap();
            dispatch(setCredentials(result));
        } catch (err) {
            // TODO: show toast error
            console.error('Login failed', err);
        }
    };

    return (
        <ScreenWrapper scrollable>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.kav}
            >
                <View style={styles.container}>
                    {/* Logo */}
                    <View style={styles.logoRow}>
                        <View style={styles.logoBox}>
                            <Text style={styles.logoLetter}>T</Text>
                        </View>
                        <Text style={styles.appName}>TheProgressio</Text>
                    </View>

                    <Text style={styles.headline}>Welcome back</Text>
                    <Text style={styles.subline}>Sign in to continue your journey</Text>

                    {/* Inputs */}
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="you@example.com"
                                placeholderTextColor={Colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor={Colors.textMuted}
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('ForgotPassword')}
                            style={styles.forgotRow}
                        >
                            <Text style={styles.forgotText}>Forgot password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, isLoading && styles.btnDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnText}>Sign In</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.signupRow}>
                            <Text style={styles.signupLabel}>Don&apos;t have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                                <Text style={styles.signupLink}>Create one</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    kav: { flex: 1 },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing['12'],
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing['8'],
    },
    logoBox: {
        width: 36,
        height: 36,
        borderRadius: Radius.md,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing['2'],
    },
    logoLetter: {
        color: '#fff',
        fontSize: Typography.fontSize.xl,
        fontWeight: '700',
    },
    appName: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.xl,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    headline: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize['3xl'],
        fontWeight: '700',
        marginBottom: Spacing['1'],
    },
    subline: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.base,
        marginBottom: Spacing['8'],
    },
    form: {
        width: '100%',
        gap: Spacing['3'],
    },
    inputGroup: { gap: Spacing['1'] },
    label: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        fontWeight: '500',
    },
    input: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing['4'],
        paddingVertical: Spacing['3'],
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.base,
    },
    forgotRow: { alignSelf: 'flex-end' },
    forgotText: { color: Colors.primaryLight, fontSize: Typography.fontSize.sm },
    btn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.md,
        paddingVertical: Spacing['4'],
        alignItems: 'center',
        marginTop: Spacing['2'],
    },
    btnDisabled: { opacity: 0.6 },
    btnText: {
        color: '#fff',
        fontSize: Typography.fontSize.base,
        fontWeight: '600',
    },
    signupRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: Spacing['2'],
    },
    signupLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
    signupLink: { color: Colors.primaryLight, fontSize: Typography.fontSize.sm, fontWeight: '600' },
});
