import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { ScreenWrapper } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useResetPasswordMutation } from '@repo/store';
import type { AuthScreenProps } from '../../navigation/types';

export const ResetPasswordScreen: React.FC<AuthScreenProps<'ResetPassword'>> = ({ navigation, route }) => {
    const { token } = route.params;
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [resetApi, { isLoading }] = useResetPasswordMutation();

    const handleReset = async () => {
        if (!password || password !== confirm) return;
        try {
            await resetApi({ token, password }).unwrap();
            navigation.navigate('Login');
        } catch (err) {
            console.error('Reset password failed', err);
        }
    };

    return (
        <ScreenWrapper scrollable>
            <View style={styles.container}>
                <Text style={styles.headline}>Set new password</Text>
                <Text style={styles.subline}>Choose a strong password for your account.</Text>
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Min. 8 characters"
                            placeholderTextColor={Colors.textMuted}
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Repeat password"
                            placeholderTextColor={Colors.textMuted}
                            secureTextEntry
                            value={confirm}
                            onChangeText={setConfirm}
                        />
                    </View>
                    {password && confirm && password !== confirm && (
                        <Text style={styles.errorText}>Passwords do not match</Text>
                    )}
                    <TouchableOpacity
                        style={[styles.btn, (isLoading || password !== confirm) && styles.btnDisabled]}
                        onPress={handleReset}
                        disabled={isLoading || password !== confirm}
                    >
                        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', paddingVertical: Spacing['12'] },
    headline: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700', marginBottom: Spacing['2'] },
    subline: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, marginBottom: Spacing['8'] },
    form: { gap: Spacing['3'] },
    inputGroup: { gap: Spacing['1'] },
    label: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '500' },
    input: {
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
        borderRadius: Radius.md, paddingHorizontal: Spacing['4'], paddingVertical: Spacing['3'],
        color: Colors.textPrimary, fontSize: Typography.fontSize.base,
    },
    errorText: { color: Colors.error, fontSize: Typography.fontSize.sm },
    btn: {
        backgroundColor: Colors.primary, borderRadius: Radius.md,
        paddingVertical: Spacing['4'], alignItems: 'center', marginTop: Spacing['2'],
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '600' },
});
