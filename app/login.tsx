import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-nocheck
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import localStorage from '../src/utils/localStoragePolyfill';

const LOGIN_TIMEOUT_MS = 60000;

const fetchWithTimeout = async (
    url,
    options = {},
    timeoutMs = LOGIN_TIMEOUT_MS,
) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
};

export default function Login() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Lỗi', 'Vui lòng nhập tài khoản và mật khẩu.');
            return;
        }

        setIsLoading(true);
        try {
            const apiUrl =
                process.env.EXPO_PUBLIC_BACKEND_URL ||
                'https://ott-education-be.onrender.com';
            const normalizedBase = apiUrl.replace(/\/$/, '');
            const endpoints = [
                `${normalizedBase}/auth/login`,
                `${normalizedBase}/api/auth/login`,
            ];

            let data = null;
            let lastStatus = null;
            let lastErrorMessage = 'Không thể kết nối máy chủ.';

            for (const endpoint of endpoints) {
                try {
                    const response = await fetchWithTimeout(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password }),
                    });

                    if (response.ok) {
                        data = await response.json();
                        break;
                    }

                    lastStatus = response.status;
                    try {
                        const errorData = await response.json();
                        lastErrorMessage =
                            errorData?.message || lastErrorMessage;
                    } catch {
                        lastErrorMessage =
                            response.status === 403
                                ? 'Tên đăng nhập hoặc mật khẩu không đúng'
                                : `Lỗi ${response.status}: ${response.statusText}`;
                    }

                    if (response.status === 401 || response.status === 403) {
                        break;
                    }
                } catch (requestError) {
                    if (requestError?.name === 'AbortError') {
                        lastErrorMessage =
                            'Kết nối backend quá thời gian chờ, vui lòng thử lại.';
                    } else {
                        lastErrorMessage =
                            requestError?.message || 'Lỗi kết nối máy chủ.';
                    }
                }
            }

            if (!data) {
                if (lastStatus === 401 || lastStatus === 403) {
                    throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
                }
                throw new Error(lastErrorMessage);
            }

            // Save tokens
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('userRole', data.role || 'STUDENT');

            // Navigate to main tabs
            router.replace('/(tabs)');
        } catch (error) {
            Alert.alert('Lỗi đăng nhập', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>OTT Education</Text>
                    <Text style={styles.subtitle}>
                        Chào mừng bạn quay trở lại!
                    </Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Tài khoản (Số điện thoại / Username)
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập số điện thoại hoặc username"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            keyboardType="default"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mật khẩu</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeBtn}
                            >
                                <Text style={styles.eyeText}>
                                    {showPassword ? 'Ẩn' : 'Hiện'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.forgotBtn}
                        onPress={() => router.push('/forgot-password')}
                    >
                        <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginBtn}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginBtnText}>Đăng nhập</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>
                            Chưa có tài khoản?{' '}
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/register')}
                        >
                            <Text style={styles.registerLink}>
                                Đăng ký ngay
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eff6ff', // Light blue background matching web
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#047857', // emerald-700
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    formContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 24,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#f9fafb',
        color: '#111827',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        backgroundColor: '#f9fafb',
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    eyeBtn: {
        padding: 12,
    },
    eyeText: {
        color: '#6b7280',
        fontSize: 14,
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotText: {
        color: '#10b981', // emerald-500
        fontSize: 14,
        fontWeight: '500',
    },
    loginBtn: {
        backgroundColor: '#10b981', // emerald-500
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    loginBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    registerText: {
        color: '#6b7280',
        fontSize: 14,
    },
    registerLink: {
        color: '#10b981',
        fontSize: 14,
        fontWeight: 'bold',
    },
});


