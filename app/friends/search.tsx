import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-nocheck
import React, { useState } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, 
    ActivityIndicator, Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchUserByPhone, sendFriendRequest } from '../../src/api/user';

export default function FriendSearchScreen() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchResult, setSearchResult] = useState(null);
    const [isSendingRequest, setIsSendingRequest] = useState(false);

    const handleSearch = async () => {
        if (!phone.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
            return;
        }

        setIsLoading(true);
        setSearchResult(null);
        try {
            const data = await fetchUserByPhone(phone.trim());
            if (data && data.userId) {
                setSearchResult(data);
            } else {
                Alert.alert('Thông báo', 'Không tìm thấy người dùng');
            }
        } catch (error) {
            Alert.alert('Thông báo', error.message || 'Không tìm thấy người dùng với số điện thoại này');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddFriend = async () => {
        if (!searchResult) return;
        
        setIsSendingRequest(true);
        try {
            await sendFriendRequest(searchResult.phone);
            Alert.alert('Thành công', 'Đã gửi lời mời kết bạn');
            setSearchResult(null);
            setPhone('');
        } catch (error) {
            Alert.alert('Lỗi', error.message || 'Không thể gửi kết bạn. Có thể đã gửi trước đó rồi.');
        } finally {
            setIsSendingRequest(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tìm kiếm & Kết bạn</Text>
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBox}>
                    <MaterialIcons name="search" size={24} color="#9ca3af" />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Nhập số điện thoại..."
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                        onSubmitEditing={handleSearch}
                    />
                    {phone.length > 0 && (
                        <TouchableOpacity onPress={() => setPhone('')}>
                            <MaterialIcons name="cancel" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
                
                <TouchableOpacity 
                    style={[styles.searchButton, !phone.trim() && styles.searchButtonDisabled]}
                    onPress={handleSearch}
                    disabled={!phone.trim() || isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.searchButtonText}>Tìm</Text>
                    )}
                </TouchableOpacity>
            </View>

            {searchResult && (
                <View style={styles.resultCard}>
                    <View style={styles.avatarMini}>
                        <Text style={styles.avatarMiniText}>
                            {searchResult.firstName?.charAt(0) || '?'}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>
                            {searchResult.firstName} {searchResult.lastName}
                        </Text>
                        <Text style={styles.userPhone}>{searchResult.phone}</Text>
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.addBtn}
                        onPress={handleAddFriend}
                        disabled={isSendingRequest}
                    >
                        {isSendingRequest ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.addBtnText}>Kết bạn</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    searchSection: { flexDirection: 'row', padding: 16, alignItems: 'center' },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, height: 48 },
    searchInput: { flex: 1, height: '100%', marginLeft: 8, fontSize: 16 },
    searchButton: { backgroundColor: '#10b981', height: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, borderRadius: 8, marginLeft: 12 },
    searchButtonDisabled: { backgroundColor: '#9ca3af' },
    searchButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    resultCard: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    avatarMini: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    avatarMiniText: { color: '#047857', fontSize: 20, fontWeight: 'bold' },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    userPhone: { fontSize: 14, color: '#6b7280', marginTop: 4 },
    addBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
    addBtnText: { color: '#fff', fontWeight: 'bold' }
});
