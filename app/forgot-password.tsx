import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { resetPassword } from '../src/api/user';

export default function ForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleReset = async () => {
        if (!email) {
            Alert.alert('Lỗi', 'Vui lòng nhập Email khôi phục.');
            return;
        }

        setIsLoading(true);
        try {
            await resetPassword(email);
            Alert.alert('Thành công', 'Nếu email tồn tại trên hệ thống, mật khẩu mới/mã khôi phục sẽ được gửi tới bạn.', [
                { text: 'Trở về đăng nhập', onPress: () => router.replace('/login') }
            ]);
        } catch (error) {
            Alert.alert('Lỗi', error.message || 'Hệ thống gửi Email đang quá tải, vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>Quên Mật Khẩu</Text>
                    <Text style={styles.subtitle}>Nhập Email để nhận mã xác nhận</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email của bạn</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập email..."
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <TouchableOpacity style={styles.resetBtn} onPress={handleReset} disabled={isLoading}>
                        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.resetBtnText}>Gửi yêu cầu khôi phục</Text>}
                    </TouchableOpacity>

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
    resetBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
    resetBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    backBtn: { marginTop: 24, alignItems: 'center' },
    backBtnText: { color: '#6b7280', fontSize: 14 },
});
