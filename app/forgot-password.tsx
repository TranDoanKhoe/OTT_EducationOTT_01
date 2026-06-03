import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { requestPasswordReset, resetPasswordWithCode } from '../src/api/user';

const isValidEmail = (value) => /\S+@\S+\.\S+/.test(String(value || '').trim());

export default function ForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState('request');
    const [isLoading, setIsLoading] = useState(false);

    const handleRequestReset = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!isValidEmail(normalizedEmail)) {
            Alert.alert('Lỗi', 'Vui lòng nhập email hợp lệ.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await requestPasswordReset(normalizedEmail);
            setEmail(normalizedEmail);
            setStep('reset');
            Alert.alert('Kiểm tra email', result?.message || 'Mã đặt lại mật khẩu đã được gửi tới email của bạn.', [
                { text: 'Nhập mã' }
            ]);
        } catch (error) {
            Alert.alert('Lỗi', error.message || 'Hệ thống gửi Email đang quá tải, vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitNewPassword = async () => {
        const normalizedCode = code.trim();
        if (!normalizedCode) {
            Alert.alert('Lỗi', 'Vui lòng nhập mã xác nhận.');
            return;
        }
        if (password.length < 8) {
            Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 8 ký tự.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await resetPasswordWithCode(normalizedCode, password);
            Alert.alert('Thành công', result?.message || 'Đặt lại mật khẩu thành công.', [
                { text: 'Đăng nhập', onPress: () => router.replace('/login') }
            ]);
        } catch (error) {
            Alert.alert('Lỗi', error.message || 'Mã xác nhận không đúng hoặc đã hết hạn.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>Quên Mật Khẩu</Text>
                    <Text style={styles.subtitle}>{step === 'request' ? 'Nhập email để nhận mã xác nhận' : 'Nhập mã và mật khẩu mới'}</Text>
                </View>

                <View style={styles.formContainer}>
                    {step === 'request' ? (
                        <>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email của bạn</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập email..."
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            <TouchableOpacity style={styles.resetBtn} onPress={handleRequestReset} disabled={isLoading}>
                                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.resetBtnText}>Gửi mã khôi phục</Text>}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View style={styles.noticeBox}>
                                <Text style={styles.noticeText}>Mã xác nhận đã được gửi tới {email}</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Mã xác nhận</Text>
                                <TextInput
                                    style={[styles.input, styles.codeInput]}
                                    placeholder="Nhập mã"
                                    value={code}
                                    onChangeText={setCode}
                                    keyboardType="number-pad"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Mật khẩu mới</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập mật khẩu mới"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Xác nhận mật khẩu</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập lại mật khẩu mới"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                />
                            </View>

                            <TouchableOpacity style={styles.resetBtn} onPress={handleSubmitNewPassword} disabled={isLoading}>
                                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.resetBtnText}>Đặt lại mật khẩu</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.secondaryBtn} onPress={handleRequestReset} disabled={isLoading}>
                                <Text style={styles.secondaryBtnText}>Gửi lại mã</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Trở về Đăng nhập</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#eff6ff' },
    content: { flex: 1, padding: 24, justifyContent: 'center' },
    headerContainer: { alignItems: 'center', marginBottom: 40 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#047857', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#6b7280' },
    formContainer: { backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 24, borderRadius: 16, elevation: 5 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
    input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f9fafb', color: '#111827' },
    codeInput: { textAlign: 'center', fontSize: 20, letterSpacing: 4 },
    noticeBox: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 20 },
    noticeText: { color: '#047857', fontSize: 14 },
    resetBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
    resetBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    secondaryBtn: { marginTop: 14, alignItems: 'center' },
    secondaryBtnText: { color: '#047857', fontSize: 14, fontWeight: '600' },
    backBtn: { marginTop: 24, alignItems: 'center' },
    backBtnText: { color: '#6b7280', fontSize: 14 },
});
