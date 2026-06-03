// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'notificationSettings';

const DEFAULT_SETTINGS = {
    pushEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    privateMessage: true,
    groupMessage: true,
    friendRequest: true,
    groupInvite: true,
};

export default function NotificationSettingsScreen() {
    const router = useRouter();
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
            }
        } catch (e) {
            console.error('Lỗi tải cài đặt thông báo:', e);
        }
    };

    const updateSetting = async (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        } catch (e) {
            console.error('Lỗi lưu cài đặt:', e);
        }
    };

    const resetToDefault = async () => {
        Alert.alert('Đặt lại mặc định', 'Đặt lại tất cả cài đặt thông báo về mặc định?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Đặt lại',
                onPress: async () => {
                    setSettings(DEFAULT_SETTINGS);
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
                },
            },
        ]);
    };

    const SettingRow = ({ icon, label, description, settingKey, disabled = false }) => (
        <View style={[styles.settingRow, disabled && { opacity: 0.4 }]}>
            <View style={styles.settingIcon}>
                <MaterialIcons name={icon} size={22} color="#10b981" />
            </View>
            <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{label}</Text>
                {description && <Text style={styles.settingDesc}>{description}</Text>}
            </View>
            <Switch
                value={settings[settingKey]}
                onValueChange={(v) => !disabled && updateSetting(settingKey, v)}
                disabled={disabled}
                trackColor={{ false: '#d1d5db', true: '#6ee7b7' }}
                thumbColor={settings[settingKey] ? '#10b981' : '#9ca3af'}
            />
        </View>
    );

    const isGlobalOff = !settings.pushEnabled;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#065f46" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cài đặt thông báo</Text>
                <TouchableOpacity onPress={resetToDefault} style={styles.resetBtn}>
                    <MaterialIcons name="refresh" size={22} color="#6b7280" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Thông báo tổng */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>TỔNG QUÁT</Text>
                    <SettingRow
                        icon="notifications"
                        label="Bật thông báo"
                        description="Nhận thông báo từ ứng dụng"
                        settingKey="pushEnabled"
                    />
                    <SettingRow
                        icon="volume-up"
                        label="Âm thanh thông báo"
                        description="Phát âm thanh khi nhận thông báo"
                        settingKey="soundEnabled"
                        disabled={isGlobalOff}
                    />
                    <SettingRow
                        icon="vibration"
                        label="Rung"
                        description="Rung khi nhận thông báo"
                        settingKey="vibrationEnabled"
                        disabled={isGlobalOff}
                    />
                </View>

                {/* Thông báo tin nhắn */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>TIN NHẮN</Text>
                    <SettingRow
                        icon="chat"
                        label="Tin nhắn riêng"
                        description="Thông báo khi có tin nhắn 1-1"
                        settingKey="privateMessage"
                        disabled={isGlobalOff}
                    />
                    <SettingRow
                        icon="group"
                        label="Tin nhắn nhóm"
                        description="Thông báo khi có tin nhắn trong nhóm"
                        settingKey="groupMessage"
                        disabled={isGlobalOff}
                    />
                </View>

                {/* Thông báo xã hội */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>XÃ HỘI</Text>
                    <SettingRow
                        icon="person-add"
                        label="Lời mời kết bạn"
                        description="Khi có người gửi lời mời kết bạn"
                        settingKey="friendRequest"
                        disabled={isGlobalOff}
                    />
                    <SettingRow
                        icon="mail"
                        label="Lời mời vào nhóm"
                        description="Khi được mời tham gia nhóm"
                        settingKey="groupInvite"
                        disabled={isGlobalOff}
                    />
                </View>

                {isGlobalOff && (
                    <View style={styles.warningBox}>
                        <MaterialIcons name="notifications-off" size={20} color="#d97706" />
                        <Text style={styles.warningText}>
                            Thông báo đang tắt. Bật lại để nhận thông báo.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#d1fae5',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#065f46' },
    resetBtn: { padding: 4 },
    content: { paddingBottom: 32 },
    section: {
        backgroundColor: '#fff', marginTop: 16, borderTopWidth: 1,
        borderBottomWidth: 1, borderColor: '#e5e7eb',
    },
    sectionTitle: {
        fontSize: 12, fontWeight: '700', color: '#9ca3af',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, letterSpacing: 0.5,
    },
    settingRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderTopWidth: 1, borderTopColor: '#f3f4f6',
    },
    settingIcon: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#ecfdf5',
        justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    settingInfo: { flex: 1 },
    settingLabel: { fontSize: 15, fontWeight: '500', color: '#111827' },
    settingDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    warningBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        margin: 16, padding: 14, backgroundColor: '#fffbeb',
        borderRadius: 10, borderWidth: 1, borderColor: '#fde68a',
    },
    warningText: { flex: 1, fontSize: 13, color: '#92400e' },
});
