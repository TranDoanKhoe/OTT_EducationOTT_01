// @ts-nocheck
// SearchMessages - Component tìm kiếm tin nhắn
import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Message {
    id: string;
    content: string;
    type: string;
    senderName?: string;
    createAt: string;
}

interface SearchMessagesProps {
    messages: Message[];
    onSelectMessage: (message: Message) => void;
    onClose: () => void;
}

const SearchMessages: React.FC<SearchMessagesProps> = ({
    messages,
    onSelectMessage,
    onClose,
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredMessages = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const query = searchQuery.toLowerCase();
        return messages.filter((msg) => {
            if (msg.type !== 'TEXT') return false;
            return msg.content?.toLowerCase().includes(query);
        });
    }, [messages, searchQuery]);

    const highlightText = (text: string, query: string) => {
        if (!query.trim()) return text;

        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, index) =>
            part.toLowerCase() === query.toLowerCase() ? (
                <Text key={index} style={styles.highlight}>
                    {part}
                </Text>
            ) : (
                part
            )
        );
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <TouchableOpacity
            style={styles.messageItem}
            onPress={() => {
                onSelectMessage(item);
                onClose();
            }}
            activeOpacity={0.7}
        >
            <View style={styles.messageContent}>
                <Text style={styles.senderName} numberOfLines={1}>
                    {item.senderName || 'Người dùng'}
                </Text>
                <Text style={styles.messageText} numberOfLines={2}>
                    {highlightText(item.content, searchQuery)}
                </Text>
                <Text style={styles.messageTime}>
                    {new Date(item.createAt).toLocaleDateString('vi-VN')}
                </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Search input */}
            <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#9ca3af" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm tin nhắn..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    placeholderTextColor="#9ca3af"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <MaterialIcons name="close" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Results */}
            {searchQuery.trim() ? (
                filteredMessages.length > 0 ? (
                    <FlatList
                        data={filteredMessages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.listContent}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="search-off" size={48} color="#d1d5db" />
                        <Text style={styles.emptyText}>
                            Không tìm thấy kết quả
                        </Text>
                    </View>
                )
            ) : (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="search" size={48} color="#d1d5db" />
                    <Text style={styles.emptyText}>
                        Nhập từ khóa để tìm kiếm
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
        marginBottom: 8,
        borderRadius: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1f2937',
    },
    listContent: {
        paddingVertical: 8,
    },
    messageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    messageContent: {
        flex: 1,
        marginRight: 8,
    },
    senderName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
        marginBottom: 4,
    },
    highlight: {
        backgroundColor: '#fef3c7',
        fontWeight: '600',
    },
    messageTime: {
        fontSize: 12,
        color: '#9ca3af',
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
});

export default SearchMessages;
