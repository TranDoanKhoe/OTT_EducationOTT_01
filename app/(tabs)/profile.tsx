// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    Image,
    ScrollView,
    Modal,
    Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import localStorage from '../../src/utils/localStoragePolyfill';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { fetchUserProfile, updateUserProfile, updatePassword } from '../../src/api/user';

export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarChanged, setAvatarChanged] = useState(false);
    const [changePasswordVisible, setChangePasswordVisible] = useState(false);
    const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [isSavingPw, setIsSavingPw] = useState(false);
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        birthday: '',
        gender: '',
    });

    const mapProfileToForm = (data) => ({
        firstName: data?.firstName || '',
        lastName: data?.lastName || '',
        email: data?.email || '',
        phone: data?.phone || '',
        birthday: data?.birthday ? String(data.birthday).split('T')[0] : '',
        gender: data?.gender || '',
    });

    // Gọi API để lấy thông tin của người dùng đang đăng nhập
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await fetchUserProfile();
                setProfile(data);
                setForm(mapProfileToForm(data || {}));
            } catch (error) {
                console.error('Lỗi khi tải thông tin cá nhân:', error);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const reloadProfile = async () => {
        const data = await fetchUserProfile();
        setProfile(data);
        setForm(mapProfileToForm(data || {}));
    };

    const handlePickAvatar = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (result.canceled || !result.assets?.length) return;

            const asset = result.assets[0];
            const fileName = asset.fileName || `avatar-${Date.now()}.jpg`;
            const mimeType = asset.mimeType || 'image/jpeg';

            setAvatarFile({
                uri: asset.uri,
                name: fileName,
                type: mimeType,
            });
            setAvatarChanged(true);
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể chọn ảnh');
        }
    };

    const handleSaveProfile = async () => {
        if (!form.firstName.trim() || !form.lastName.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...form,
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                birthday: form.birthday ? form.birthday.trim() : null,
                avatar: avatarChanged ? avatarFile : null,
            };

            const updated = await updateUserProfile(payload);
            if (!updated) {
                throw new Error('Không thể cập nhật thông tin');
            }

            await reloadProfile();
            setAvatarFile(null);
            setAvatarChanged(false);
            setIsEditing(false);
            Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân');
        } catch (error) {
            const msg = String(error?.message || 'Cập nhật thất bại');
            const status = Number(error?.status || 0);
            const isAuthError = status === 401;

            if (isAuthError) {
                Alert.alert(
                    'Phiên đăng nhập hết hạn',
                    'Vui lòng đăng nhập lại để cập nhật thông tin.',
                );
                return;
            }
            Alert.alert('Lỗi', msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        const { oldPassword, newPassword, confirmPassword } = pwForm;
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Không khớp', 'Mật khẩu mới và xác nhận không khớp');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Mật khẩu yếu', 'Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }
        setIsSavingPw(true);
        try {
            const result = await updatePassword(oldPassword, newPassword);
            if (!result) throw new Error('Đổi mật khẩu thất bại');
            Alert.alert('Thành công', 'Mật khẩu đã được cập nhật');
            setChangePasswordVisible(false);
            setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            Alert.alert('Lỗi', String(error?.message || 'Đổi mật khẩu thất bại'));
        } finally {
            setIsSavingPw(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setAvatarFile(null);
        setAvatarChanged(false);
        setForm(mapProfileToForm(profile || {}));
    };

    // Hàm xử lý việc Đăng xuất: Xoá LocalStorage (AsyncStorage) và đẩy người dùng về Login
    const handleLogout = () => {
        Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất không?', [
            { text: 'Huỷ', style: 'cancel' },
            {
                text: 'Đồng ý',
                onPress: () => {
                    localStorage.clear();
                    // Trở về trang login và xoá lịch sử router để không thể quay lại bằng nút back
                    router.replace('/login');
                },
                style: 'destructive',
            },
        ]);
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    const initials = profile
        ? `${profile.firstName?.charAt(0) || ''}${profile.lastName?.charAt(0) || ''}`.toUpperCase()
        : 'U';

    const avatarUri = avatarFile?.uri || profile?.avatar || null;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
        >
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.avatarWrap}
                    activeOpacity={isEditing ? 0.8 : 1}
                    onPress={isEditing ? handlePickAvatar : undefined}
                >
                    <View style={styles.avatar}>
                        {avatarUri ? (
                            <Image
                                source={{ uri: avatarUri }}
                                style={styles.avatarImage}
                                onLoadStart={() => setAvatarLoading(true)}
                                onLoadEnd={() => setAvatarLoading(false)}
                                onError={() => {
                                    setAvatarLoading(false);
                                    if (avatarFile?.uri) {
                                        setAvatarFile(null);
                                    }
                                }}
                            />
                        ) : (
                            <Text style={styles.avatarText}>{initials}</Text>
                        )}
                        {avatarLoading && (
                            <View style={styles.avatarLoadingOverlay}>
                                <ActivityIndicator
                                    size="small"
                                    color="#10b981"
                                />
                            </View>
                        )}
                    </View>
                    {isEditing && (
                        <View style={styles.cameraBadge}>
                            <MaterialIcons
                                name="photo-camera"
                                size={14}
                                color="#fff"
                            />
                        </View>
                    )}
                </TouchableOpacity>
                <Text style={styles.name}>
                    {profile?.firstName} {profile?.lastName}
                </Text>
                <Text style={styles.role}>{profile?.role || 'Học viên'}</Text>

                <View style={styles.headerActionRow}>
                    {!isEditing ? (
                        <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => {
                                setAvatarFile(null);
                                setAvatarChanged(false);
                                setIsEditing(true);
                            }}
                        >
                            <MaterialIcons
                                name="edit"
                                size={18}
                                color="#065f46"
                            />
                            <Text style={styles.editBtnText}>Chỉnh sửa</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={handleCancelEdit}
                            >
                                <Text style={styles.cancelBtnText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleSaveProfile}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#fff"
                                    />
                                ) : (
                                    <Text style={styles.saveBtnText}>Lưu</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                    <MaterialIcons name="person" size={22} color="#6b7280" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Họ</Text>
                        {isEditing ? (
                            <TextInput
                                value={form.firstName}
                                onChangeText={(v) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        firstName: v,
                                    }))
                                }
                                style={styles.input}
                                placeholder="Nhập họ"
                            />
                        ) : (
                            <Text style={styles.infoText}>
                                {profile?.firstName || 'Chưa cập nhật'}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <MaterialIcons name="badge" size={22} color="#6b7280" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Tên</Text>
                        {isEditing ? (
                            <TextInput
                                value={form.lastName}
                                onChangeText={(v) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        lastName: v,
                                    }))
                                }
                                style={styles.input}
                                placeholder="Nhập tên"
                            />
                        ) : (
                            <Text style={styles.infoText}>
                                {profile?.lastName || 'Chưa cập nhật'}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <MaterialIcons name="email" size={22} color="#6b7280" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Email</Text>
                        {isEditing ? (
                            <TextInput
                                value={form.email}
                                onChangeText={(v) =>
                                    setForm((prev) => ({ ...prev, email: v }))
                                }
                                style={styles.input}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholder="Nhập email"
                            />
                        ) : (
                            <Text style={styles.infoText}>
                                {profile?.email || 'Chưa cập nhật Email'}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <MaterialIcons name="phone" size={22} color="#6b7280" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Số điện thoại</Text>
                        {isEditing ? (
                            <TextInput
                                value={form.phone}
                                onChangeText={(v) =>
                                    setForm((prev) => ({ ...prev, phone: v }))
                                }
                                style={styles.input}
                                keyboardType="phone-pad"
                                placeholder="Nhập số điện thoại"
                            />
                        ) : (
                            <Text style={styles.infoText}>
                                {profile?.phone ||
                                    'Chưa cập nhật Số điện thoại'}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <MaterialIcons name="cake" size={22} color="#6b7280" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>
                            Ngày sinh (YYYY-MM-DD)
                        </Text>
                        {isEditing ? (
                            <TextInput
                                value={form.birthday}
                                onChangeText={(v) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        birthday: v,
                                    }))
                                }
                                style={styles.input}
                                placeholder="2004-07-08"
                            />
                        ) : (
                            <Text style={styles.infoText}>
                                {form.birthday || 'Chưa cập nhật Sinh nhật'}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={[styles.infoRow, styles.lastInfoRow]}>
                    <MaterialIcons name="wc" size={22} color="#6b7280" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Giới tính</Text>
                        {isEditing ? (
                            <View style={styles.genderRow}>
                                {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                                    <TouchableOpacity
                                        key={g}
                                        style={[
                                            styles.genderChip,
                                            form.gender === g && styles.genderChipActive,
                                        ]}
                                        onPress={() =>
                                            setForm((prev) => ({ ...prev, gender: g }))
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.genderChipText,
                                                form.gender === g && styles.genderChipTextActive,
                                            ]}
                                        >
                                            {g === 'MALE' ? 'Nam' : g === 'FEMALE' ? 'Nữ' : 'Khác'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.infoText}>
                                {form.gender === 'MALE' ? 'Nam' : form.gender === 'FEMALE' ? 'Nữ' : form.gender === 'OTHER' ? 'Khác' : 'Chưa cập nhật'}
                            </Text>
                        )}
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={styles.notifButton}
                onPress={() => router.push('/settings/notifications')}
            >
                <MaterialIcons name="notifications" size={20} color="#fff" />
                <Text style={styles.notifButtonText}>Cài đặt thông báo</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.changePasswordButton}
                onPress={() => setChangePasswordVisible(true)}
            >
                <MaterialIcons name="lock" size={20} color="#fff" />
                <Text style={styles.changePasswordText}>Đổi mật khẩu</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
            >
                <MaterialIcons name="logout" size={20} color="#fff" />
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>

            <Modal
                visible={changePasswordVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setChangePasswordVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setChangePasswordVisible(false)}
                >
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <Text style={styles.modalTitle}>Đổi mật khẩu</Text>

                        <Text style={styles.pwLabel}>Mật khẩu hiện tại</Text>
                        <TextInput
                            style={styles.pwInput}
                            secureTextEntry
                            placeholder="Nhập mật khẩu hiện tại"
                            value={pwForm.oldPassword}
                            onChangeText={(v) => setPwForm((p) => ({ ...p, oldPassword: v }))}
                        />

                        <Text style={styles.pwLabel}>Mật khẩu mới</Text>
                        <TextInput
                            style={styles.pwInput}
                            secureTextEntry
                            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                            value={pwForm.newPassword}
                            onChangeText={(v) => setPwForm((p) => ({ ...p, newPassword: v }))}
                        />

                        <Text style={styles.pwLabel}>Xác nhận mật khẩu mới</Text>
                        <TextInput
                            style={styles.pwInput}
                            secureTextEntry
                            placeholder="Nhập lại mật khẩu mới"
                            value={pwForm.confirmPassword}
                            onChangeText={(v) => setPwForm((p) => ({ ...p, confirmPassword: v }))}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => {
                                    setChangePasswordVisible(false);
                                    setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                                }}
                            >
                                <Text style={styles.modalCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={handleChangePassword}
                                disabled={isSavingPw}
                            >
                                {isSavingPw ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalSaveText}>Xác nhận</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    contentContainer: {
        paddingBottom: 20,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    avatarWrap: {
        position: 'relative',
        marginBottom: 14,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#d1fae5',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraBadge: {
        position: 'absolute',
        right: -2,
        bottom: -2,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#047857',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    role: {
        fontSize: 16,
        color: '#6b7280',
    },
    headerActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        gap: 10,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    editBtnText: {
        color: '#065f46',
        fontWeight: '700',
        marginLeft: 6,
    },
    cancelBtn: {
        backgroundColor: '#e5e7eb',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    cancelBtnText: {
        color: '#374151',
        fontWeight: '700',
    },
    saveBtn: {
        backgroundColor: '#10b981',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        minWidth: 58,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: '700',
    },
    infoSection: {
        backgroundColor: '#fff',
        marginTop: 20,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#e5e7eb',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    lastInfoRow: {
        borderBottomWidth: 0,
    },
    infoContent: {
        marginLeft: 14,
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 16,
        color: '#374151',
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        fontSize: 15,
        color: '#111827',
        backgroundColor: '#f9fafb',
    },
    notifButton: {
        flexDirection: 'row',
        backgroundColor: '#10b981',
        marginHorizontal: 20,
        marginTop: 20,
        padding: 16,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    changePasswordButton: {
        flexDirection: 'row',
        backgroundColor: '#3b82f6',
        marginHorizontal: 20,
        marginTop: 20,
        padding: 16,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    changePasswordText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: '#ef4444',
        marginHorizontal: 20,
        marginTop: 12,
        padding: 16,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoutText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 36,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 20,
        textAlign: 'center',
    },
    pwLabel: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 4,
        marginTop: 12,
    },
    pwInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: '#111827',
        backgroundColor: '#f9fafb',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
    },
    modalCancelBtn: {
        backgroundColor: '#e5e7eb',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    modalCancelText: {
        color: '#374151',
        fontWeight: '700',
        fontSize: 15,
    },
    modalSaveBtn: {
        backgroundColor: '#10b981',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        minWidth: 90,
        alignItems: 'center',
    },
    modalSaveText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    genderRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    genderChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#f9fafb',
    },
    genderChipActive: {
        backgroundColor: '#ecfdf5',
        borderColor: '#10b981',
    },
    genderChipText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    genderChipTextActive: {
        color: '#065f46',
        fontWeight: '700',
    },
});
