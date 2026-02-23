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
import { useRegisterMutation, setCredentials, useAppDispatch } from '@repo/store';
import type { AuthScreenProps } from '../../navigation/types';

export const SignupScreen: React.FC<AuthScreenProps<'Signup'>> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [registerApi, { isLoading }] = useRegisterMutation();

    const handleSignup = async () => {
        if (!name.trim() || !email.trim() || !password) return;
        try {
            const result = await registerApi({ username: name.trim(), email: email.trim(), password, confirmPassword: password }).unwrap();
            dispatch(setCredentials(result));
        } catch (err) {
            console.error('Signup failed', err);
        }
    };

    return (
        <ScreenWrapper scrollable>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.kav}
            >
                <View style={styles.container}>
                    <View style={styles.logoRow}>
                        <View style={styles.logoBox}>
                            <Text style={styles.logoLetter}>T</Text>
                        </View>
                        <Text style={styles.appName}>TheProgressio</Text>
                    </View>

                    <Text style={styles.headline}>Create account</Text>
                    <Text style={styles.subline}>Start tracking your academic progress</Text>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Your name"
                                placeholderTextColor={Colors.textMuted}
                                autoCapitalize="words"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

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
                                placeholder="Min. 8 characters"
                                placeholderTextColor={Colors.textMuted}
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.btn, isLoading && styles.btnDisabled]}
                            onPress={handleSignup}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnText}>Create Account</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.loginRow}>
                            <Text style={styles.loginLabel}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.loginLink}>Sign in</Text>
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
    logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing['8'] },
    logoBox: {
        width: 36, height: 36, borderRadius: Radius.md,
        backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: Spacing['2'],
    },
    logoLetter: { color: '#fff', fontSize: Typography.fontSize.xl, fontWeight: '700' },
    appName: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '700', letterSpacing: -0.5 },
    headline: { color: Colors.textPrimary, fontSize: Typography.fontSize['3xl'], fontWeight: '700', marginBottom: Spacing['1'] },
    subline: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, marginBottom: Spacing['8'] },
    form: { width: '100%', gap: Spacing['3'] },
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
    loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing['2'] },
    loginLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
    loginLink: { color: Colors.primaryLight, fontSize: Typography.fontSize.sm, fontWeight: '600' },
});
