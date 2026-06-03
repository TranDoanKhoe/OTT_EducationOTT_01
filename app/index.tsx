// @ts-nocheck
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import localStorage from '../src/utils/localStoragePolyfill';

export default function Index() {
    const router = useRouter();
    // Chờ Root Layout mount xong mới điều hướng
    const rootNavState = useRootNavigationState();
    const [authChecked, setAuthChecked] = useState(false);
    const [target, setTarget] = useState(null);

    // Bước 1: Kiểm tra token ngay khi app khởi động
    useEffect(() => {
        const checkAuth = async () => {
            try {
                await localStorage.initPromise;
                // Kiểm tra cả accessToken và token để tương thích với login flow
                const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
                setTarget(token ? '/(tabs)' : '/login');
            } catch (error) {
                console.error('Auth check error:', error);
                setTarget('/login');
            } finally {
                setAuthChecked(true);
            }
        };
        checkAuth();
    }, [router]);

    // Bước 2: Chỉ điều hướng khi Root Layout đã mount xong VÀ đã biết target
    useEffect(() => {
        if (!authChecked || !target || !rootNavState?.key) return;
        router.replace(target);
    }, [authChecked, target, rootNavState?.key, router]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#10b981" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
    },
});
