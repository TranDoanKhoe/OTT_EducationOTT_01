import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { sendVerificationEmail, verifyEmailWithCode } from '../src/api/user';

// Kiểm tra độ mạnh mật khẩu (khớp với web)
const checkPasswordStrength = (password) => {
    if (!password) return null;
    const checks = {
        minLength: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    let level = 'weak';
    let color = '#ef4444';
    if (passed >= 4) { level = 'strong'; color = '#10b981'; }
    else if (passed >= 3) { level = 'medium'; color = '#f59e0b'; }
    return { ...checks, passed, level, color };
};

const PasswordStrengthBar = ({ password }) => {
    const strength = useMemo(() => checkPasswordStrength(password), [password]);
    if (!strength) return null;
    const labels = { weak: 'Yếu', medium: 'Trung bình', strong: 'Mạnh' };
    return (
        <View style={{ marginTop: 6, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Độ mạnh mật khẩu</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: strength.color }}>{labels[strength.level]}</Text>
            </View>
            <View style={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: 6, width: `${(strength.passed / 5) * 100}%`, backgroundColor: strength.color, borderRadius: 3 }} />
            </View>
        </View>
    );
};

export default function Register() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: '', email: '', phone: '',
        password: '', confirmPassword: '',
        firstName: '', lastName: '', gender: 'MALE', birthday: '2000-01-01'
    });
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSendVerification = async () => {
        if (!formData.username || !formData.email || !formData.phone || !formData.password || !formData.firstName || !formData.lastName) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các thông tin bắt buộc.');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu không khớp!');
            return;
        }

        setIsLoading(true);
        try {
            await sendVerificationEmail(formData.email);
            setStep(2);
            Alert.alert('Kiểm tra Email', 'Mã xác thực 6 số đã được gửi tới email của bạn.');
        } catch (error) {
            Alert.alert('Lỗi', error.message || 'Không thể gửi email xác thực.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyAndRegister = async () => {
        if (!code) {
            Alert.alert('Lỗi', 'Vui lòng nhập mã xác thực.');
            return;
        }
        
        setIsLoading(true);
        try {
            // Request mapping for backend
            const requestPayload = {
                username: formData.username,
                password: formData.password,
                email: formData.email,
                phone: formData.phone,
                firstName: formData.firstName,
                lastName: formData.lastName,
                gender: formData.gender,
                birthday: formData.birthday,
                role: 'STUDENT'
            };
            await verifyEmailWithCode(formData.email, code, requestPayload);
            Alert.alert('Thành công', 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.', [
                { text: 'Đăng nhập ngay', onPress: () => router.replace('/login') }
            ]);
        } catch (error) {
            Alert.alert('Lỗi xác nhận', error.message || 'Mã xác thực không đúng hoặc đã hết hạn.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>{step === 1 ? 'Tạo Tài Khoản' : 'Xác thực Email'}</Text>
                        <Text style={styles.subtitle}>{step === 1 ? 'Đăng ký trải nghiệm nền tảng' : 'Vui lòng kiểm tra hộp thư'}</Text>
                    </View>

                    <View style={styles.formContainer}>
                        {step === 1 ? (
                            <>
                                {['Họ (First Name)', 'Tên (Last Name)', 'Tài khoản (Username)', 'Số điện thoại', 'Email'].map((field, index) => {
                                    const keys = ['firstName', 'lastName', 'username', 'phone', 'email'];
                                    const key = keys[index];
                                    return (
                                        <View style={styles.inputGroup} key={key}>
                                            <Text style={styles.label}>{field}</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder={`Nhập ${field.toLowerCase()}`}
                                                value={formData[key]}
                                                onChangeText={(val) => handleChange(key, val)}
                                                keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'}
                                            />
                                        </View>
                                    );
                                })}

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Mật khẩu</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        secureTextEntry
                                        value={formData.password}
                                        onChangeText={(val) => handleChange('password', val)}
                                    />
                                    <PasswordStrengthBar password={formData.password} />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Xác nhận mật khẩu</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        secureTextEntry
                                        value={formData.confirmPassword}
                                        onChangeText={(val) => handleChange('confirmPassword', val)}
                                    />
                                </View>

                                <TouchableOpacity style={styles.loginBtn} onPress={handleSendVerification} disabled={isLoading}>
                                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Đăng ký ngay</Text>}
                                </TouchableOpacity>
                            </>
                        ) : (
                             <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Nhập mã OTP (6 số)</Text>
                                    <TextInput
                                        style={[styles.input, { textAlign: 'center', fontSize: 20, tracking: 4 }]}
                                        placeholder="- - - - - -"
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        value={code}
                                        onChangeText={setCode}
                                    />
                                </View>

                                <TouchableOpacity style={styles.loginBtn} onPress={handleVerifyAndRegister} disabled={isLoading}>
                                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Hoàn tất Đăng ký</Text>}
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.backBtn, {marginTop: 15}]} onPress={() => setStep(1)} disabled={isLoading}>
                                    <Text style={styles.backBtnText}>Sửa lại thông tin</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <Text style={styles.backBtnText}>Về trang Đăng nhập</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#eff6ff' },
    content: { flex: 1, padding: 24, justifyContent: 'center' },
    headerContainer: { alignItems: 'center', marginBottom: 30, marginTop: 40 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#047857', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#6b7280' },
    formContainer: { backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 24, borderRadius: 16, elevation: 5 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
    input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f9fafb', color: '#111827' },
    loginBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    loginBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    backBtn: { marginTop: 20, alignItems: 'center' },
    backBtnText: { color: '#6b7280', fontSize: 14 },
});
