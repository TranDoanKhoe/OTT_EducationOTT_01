// @ts-nocheck
// Forward Message Screen - Chuyển tiếp tin nhắn
import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { forwardMessage } from '../../src/api/messageApi';
import { getAccessTokenSync, getUserId } from '../../src/utils/authHeader';
import { Toast } from 'react-native-toast-message/lib/src/Toast';

export default function ForwardMessageScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Parse message data from params
    const messageId = params.messageId as string;
    const messageContent = params.messageContent as string;
    const messageType = params.messageType as string;
    const contactsJson = params.contacts as string;

    const contacts = useMemo(() => {
        try {
            return JSON.parse(contactsJson || '[]');
        } catch {
            return [];
        }
    }, [contactsJson]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
    const [isSending, setIsSending] = useState(false);

    const filteredContacts = useMemo(() => {
        if (!searchQuery.trim()) return contacts;
        const query = searchQuery.toLowerCase();
        return contacts.filter((contact: any) =>
            contact.name?.toLowerCase().includes(query)
        );
    }, [contacts, searchQuery]);

    const toggleContact = (contactId: string) => {
        setSelectedContacts((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(contactId)) {
                newSet.delete(contactId);
            } else {
                newSet.add(contactId);
            }
            return newSet;
        });
    };

    const handleForward = async () => {
        if (selectedContacts.size === 0) {
            Toast.show({
                type: 'error',
                text1: 'Vui lòng chọn ít nhất một người nhận',
            });
            return;
        }

        const token = getAccessTokenSync();
        const userId = getUserId();

        if (!token || !userId) {
            Toast.show({
                type: 'error',
                text1: 'Vui lòng đăng nhập để chuyển tiếp tin nhắn',
            });
            return;
        }

        setIsSending(true);

        try {
            let successCount = 0;
            let failCount = 0;

            for (const contactId of Array.from(selectedContacts)) {
                const contact = contacts.find((c: any) => c.id === contactId);
                if (!contact) continue;

                const success = forwardMessage(
                    messageId,
                    userId,
                    contact.isGroup ? null : contact.id,
                    contact.isGroup ? contact.id : null,
                    messageContent,
                    token
                );

                if (success) {
                    successCount++;
                } else {
                    failCount++;
                }
            }

            if (successCount > 0) {
                Toast.show({
                    type: 'success',
                    text1: `Đã chuyển tiếp đến ${successCount} cuộc trò chuyện`,
                });
                router.back();
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Không thể chuyển tiếp tin nhắn',
                });
            }
        } catch (error) {
            console.error('Error forwarding message:', error);
            Toast.show({
                type: 'error',
                text1: 'Lỗi chuyển tiếp tin nhắn',
                text2: error.message,
            });
        } finally {
            setIsSending(false);
        }
    };

    const renderContact = ({ item }: { item: any }) => {
        const isSelected = selectedContacts.has(item.id);

        return (
            <TouchableOpacity
                style={styles.contactItem}
                onPress={() => toggleContact(item.id)}
                activeOpacity={0.7}
            >
                <View style={styles.contactLeft}>
                    {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <MaterialIcons
                                name={item.isGroup ? 'group' : 'person'}
                                size={24}
                                color="#9ca3af"
                            />
                        </View>
                    )}
                    <View style={styles.contactInfo}>
                        <Text style={styles.contactName} numberOfLines={1}>
                            {item.name || 'Không có tên'}
                        </Text>
                        {item.isGroup && (
                            <Text style={styles.contactType}>Nhóm</Text>
                        )}
                    </View>
                </View>
                <View
                    style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                    ]}
                >
                    {isSelected && (
                        <MaterialIcons name="check" size={18} color="#fff" />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chuyển tiếp tin nhắn</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#9ca3af" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#9ca3af"
                />
            </View>

            {/* Selected count */}
            {selectedContacts.size > 0 && (
                <View style={styles.selectedBanner}>
                    <Text style={styles.selectedText}>
                        Đã chọn {selectedContacts.size} cuộc trò chuyện
                    </Text>
                </View>
            )}

            {/* Contact list */}
            <FlatList
                data={filteredContacts}
                keyExtractor={(item) => item.id}
                renderItem={renderContact}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="inbox" size={48} color="#d1d5db" />
                        <Text style={styles.emptyText}>
                            {searchQuery
                                ? 'Không tìm thấy kết quả'
                                : 'Không có liên hệ'}
                        </Text>
                    </View>
                }
            />

            {/* Forward button */}
            {selectedContacts.size > 0 && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.forwardButton,
                            isSending && styles.forwardButtonDisabled,
                        ]}
                        onPress={handleForward}
                        disabled={isSending}
                        activeOpacity={0.8}
                    >
                        {isSending ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <MaterialIcons name="send" size={20} color="#fff" />
                                <Text style={styles.forwardButtonText}>
                                    Chuyển tiếp
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    placeholder: {
        width: 32,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f3f4f6',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1f2937',
    },
    selectedBanner: {
        backgroundColor: '#dbeafe',
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 12,
    },
    selectedText: {
        fontSize: 14,
        color: '#1e40af',
        fontWeight: '500',
    },
    listContent: {
        paddingVertical: 8,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    contactLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1f2937',
        marginBottom: 2,
    },
    contactType: {
        fontSize: 13,
        color: '#6b7280',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#d1d5db',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 15,
        color: '#9ca3af',
        marginTop: 12,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    forwardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#3b82f6',
        paddingVertical: 14,
        borderRadius: 12,
    },
    forwardButtonDisabled: {
        opacity: 0.6,
    },
    forwardButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
