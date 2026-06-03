// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
    Image, Modal, Pressable, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
    askAiAssistant,
    getAiConversations,
    createAiConversation,
    getAiConversationMessages,
    saveAiConversationMessages,
    deleteAiConversation,
} from '../../src/api/aiApi';
import localStorage from '../../src/utils/localStoragePolyfill';

const WELCOME_MSG = {
    id: 'welcome',
    senderId: 'ai',
    content: 'Xin chào! Tôi là Trợ lý AI của OTT Education. Tôi có thể giúp gì cho học tập của bạn hôm nay?',
    createAt: new Date().toISOString(),
};

export default function AiChatScreen() {
    const [messages, setMessages] = useState([WELCOME_MSG]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const flatListRef = useRef(null);

    // Conversation management
    const [conversations, setConversations] = useState([]);
    const [currentConvId, setCurrentConvId] = useState(null);
    const [convListVisible, setConvListVisible] = useState(false);
    const [convLoading, setConvLoading] = useState(false);

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

    // Load conversations on mount
    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        setConvLoading(true);
        try {
            const data = await getAiConversations(token);
            setConversations(data || []);
        } catch (e) {
            console.log('Không tải được danh sách conversations:', e.message);
        } finally {
            setConvLoading(false);
        }
    };

    const handleNewConversation = async () => {
        try {
            const conv = await createAiConversation(token, 'Cuộc trò chuyện mới');
            const convId = conv.id || conv._id;
            setCurrentConvId(convId);
            setMessages([WELCOME_MSG]);
            setConvListVisible(false);
            await loadConversations();
        } catch (e) {
            // Nếu API không hỗ trợ, chỉ reset local
            setCurrentConvId(null);
            setMessages([WELCOME_MSG]);
            setConvListVisible(false);
        }
    };

    const handleSwitchConversation = async (conv) => {
        const convId = conv.id || conv._id;
        setCurrentConvId(convId);
        setConvListVisible(false);
        setIsLoading(true);
        try {
            const data = await getAiConversationMessages(token, convId);
            const msgs = (data?.messages || []).map((m, idx) => ({
                id: m.id || m._id || String(idx),
                senderId: m.role === 'user' ? 'me' : 'ai',
                content: m.content || '',
                createAt: m.createdAt || new Date().toISOString(),
            }));
            setMessages(msgs.length > 0 ? [...msgs].reverse() : [WELCOME_MSG]);
        } catch {
            setMessages([WELCOME_MSG]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteConversation = async (convId) => {
        Alert.alert('Xóa cuộc trò chuyện', 'Bạn có chắc muốn xóa?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteAiConversation(token, convId);
                        if (currentConvId === convId) {
                            setCurrentConvId(null);
                            setMessages([WELCOME_MSG]);
                        }
                        await loadConversations();
                    } catch { Alert.alert('Lỗi', 'Không thể xóa cuộc trò chuyện'); }
                },
            },
        ]);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            selectionLimit: 3,
        });
        if (!result.canceled) {
            setSelectedImages((prev) => [...prev, ...result.assets]);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() && selectedImages.length === 0) return;

        const tempId = Date.now().toString();
        const userMsgContent = inputText.trim() || 'Gửi hình ảnh đính kèm...';
        const userMsg = {
            id: tempId, senderId: 'me', content: userMsgContent,
            images: selectedImages, createAt: new Date().toISOString(),
        };

        setMessages((prev) => [userMsg, ...prev]);
        setInputText('');
        const imagesToSend = [...selectedImages];
        setSelectedImages([]);
        setIsLoading(true);

        try {
            const files = imagesToSend.map((img, idx) => ({
                uri: img.uri,
                name: `image_${idx}.jpg`,
                type: img.mimeType || 'image/jpeg',
            }));

            const history = messages
                .slice(0, 10)
                .reverse()
                .map((m) => ({ role: m.senderId === 'ai' ? 'assistant' : 'user', content: m.content || '' }));

            const data = await askAiAssistant(userMsgContent, history, token, files);
            const aiReply = data?.reply || data?.content || data?.message || data?.text;
            if (aiReply) {
                const aiMsg = {
                    id: (Date.now() + 1).toString(), senderId: 'ai',
                    content: aiReply, createAt: new Date().toISOString(),
                };
                setMessages((prev) => {
                    const updated = [aiMsg, ...prev];
                    // Lưu conversation nếu đang có convId
                    if (currentConvId) {
                        const saveMsgs = [...updated].reverse()
                            .filter((m) => m.id !== 'welcome')
                            .map((m) => ({ role: m.senderId === 'ai' ? 'assistant' : 'user', content: m.content }));
                        saveAiConversationMessages(token, currentConvId, saveMsgs, userMsgContent.slice(0, 50)).catch(() => {});
                    }
                    return updated;
                });
            }
        } catch {
            setMessages((prev) => [{
                id: (Date.now() + 1).toString(), senderId: 'ai',
                content: 'Xin lỗi, kết nối tới máy chủ AI đang gặp sự cố. Bạn vui lòng thử lại nhé.',
                createAt: new Date().toISOString(), isError: true,
            }, ...prev]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessage = ({ item }) => {
        const isMe = item.senderId === 'me';
        return (
            <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.theirMessageWrapper]}>
                {!isMe && (
                    <View style={styles.avatarMiniAI}>
                        <MaterialIcons name="smart-toy" size={18} color="#fff" />
                    </View>
                )}
                <View style={[styles.messageBubble, isMe ? styles.myMessageBubble : styles.theirMessageBubble, item.isError && styles.errorBubble]}>
                    {item.images && item.images.length > 0 && (
                        <View style={styles.imageGallery}>
                            {item.images.map((img, idx) => (
                                <Image key={idx} source={{ uri: img.uri }} style={styles.chatImage} />
                            ))}
                        </View>
                    )}
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                        {item.content}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Trợ lý AI OTT</Text>
                    <Text style={styles.headerSubtitle}>
                        {currentConvId ? 'Đang trong cuộc trò chuyện' : 'Luôn sẵn sàng giải đáp'}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => { setConvListVisible(true); loadConversations(); }} style={styles.headerBtn}>
                    <MaterialIcons name="history" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNewConversation} style={styles.headerBtn}>
                    <MaterialIcons name="add-comment" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {isLoading && messages.length <= 1 ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    inverted
                    contentContainerStyle={styles.messageList}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
            >
                {selectedImages.length > 0 && (
                    <View style={styles.previewContainer}>
                        {selectedImages.map((img, idx) => (
                            <View key={idx} style={styles.previewItem}>
                                <Image source={{ uri: img.uri }} style={styles.previewImage} />
                                <TouchableOpacity
                                    style={styles.removePreviewBtn}
                                    onPress={() => setSelectedImages((prev) => prev.filter((_, i) => i !== idx))}
                                >
                                    <MaterialIcons name="cancel" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
                        <MaterialIcons name="image" size={26} color="#64748b" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Hỏi AI bất kỳ điều gì..."
                        placeholderTextColor="#475569"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!inputText.trim() && selectedImages.length === 0) && styles.sendBtnDisabled]}
                        onPress={handleSend}
                        disabled={(!inputText.trim() && selectedImages.length === 0) || isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#10b981" />
                        ) : (
                            <MaterialIcons name="send" size={24} color={(inputText.trim() || selectedImages.length > 0) ? '#10b981' : '#475569'} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Modal lịch sử conversations */}
            <Modal visible={convListVisible} transparent animationType="slide" onRequestClose={() => setConvListVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setConvListVisible(false)}>
                    <Pressable style={styles.convModal} onPress={() => {}}>
                        <View style={styles.convModalHeader}>
                            <Text style={styles.convModalTitle}>Lịch sử trò chuyện</Text>
                            <TouchableOpacity onPress={() => setConvListVisible(false)}>
                                <MaterialIcons name="close" size={22} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.newConvBtn} onPress={handleNewConversation}>
                            <MaterialIcons name="add" size={20} color="#10b981" />
                            <Text style={styles.newConvBtnText}>Cuộc trò chuyện mới</Text>
                        </TouchableOpacity>

                        {convLoading ? (
                            <ActivityIndicator size="large" color="#10b981" style={{ padding: 24 }} />
                        ) : conversations.length === 0 ? (
                            <Text style={styles.emptyText}>Chưa có lịch sử trò chuyện</Text>
                        ) : (
                            <FlatList
                                data={conversations}
                                keyExtractor={(item) => String(item.id || item._id)}
                                style={{ maxHeight: 320 }}
                                renderItem={({ item }) => {
                                    const convId = item.id || item._id;
                                    const isActive = convId === currentConvId;
                                    return (
                                        <TouchableOpacity
                                            style={[styles.convItem, isActive && styles.convItemActive]}
                                            onPress={() => handleSwitchConversation(item)}
                                        >
                                            <MaterialIcons name="chat" size={18} color={isActive ? '#10b981' : '#475569'} />
                                            <Text style={[styles.convItemText, isActive && { color: '#10b981', fontWeight: '700' }]} numberOfLines={1}>
                                                {item.title || 'Cuộc trò chuyện'}
                                            </Text>
                                            <TouchableOpacity onPress={() => handleDeleteConversation(convId)} style={{ padding: 4 }}>
                                                <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingTop: Platform.OS === 'ios' ? 50 : 36, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    headerBtn: { padding: 6, marginLeft: 8 },
    headerTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: 'bold' },
    headerSubtitle: { color: '#64748b', fontSize: 13 },
    messageList: { padding: 16, gap: 12 },
    messageWrapper: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    myMessageWrapper: { justifyContent: 'flex-end' },
    theirMessageWrapper: { justifyContent: 'flex-start' },
    avatarMiniAI: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    messageBubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
    myMessageBubble: { backgroundColor: '#10b981', borderBottomRightRadius: 4 },
    theirMessageBubble: { backgroundColor: '#1e293b', borderBottomLeftRadius: 4 },
    errorBubble: { backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#ef4444' },
    messageText: { fontSize: 16, lineHeight: 24 },
    myMessageText: { color: '#fff' },
    theirMessageText: { color: '#e2e8f0' },
    imageGallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
    chatImage: { width: 120, height: 120, borderRadius: 8 },
    previewContainer: { flexDirection: 'row', padding: 8, backgroundColor: '#1e293b', borderTopWidth: 1, borderColor: '#334155' },
    previewItem: { marginRight: 8, position: 'relative' },
    previewImage: { width: 60, height: 60, borderRadius: 8 },
    removePreviewBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#0f172a', borderRadius: 10 },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#0f172a', padding: 10, borderTopWidth: 1, borderTopColor: '#1e293b' },
    attachBtn: { padding: 8 },
    textInput: { flex: 1, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 16, maxHeight: 100, minHeight: 40, marginHorizontal: 8, color: '#f1f5f9' },
    sendBtn: { padding: 8, paddingBottom: 10 },
    sendBtnDisabled: { opacity: 0.4 },
    // Conversations modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    convModal: { backgroundColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '65%' },
    convModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    convModalTitle: { fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
    newConvBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155', marginBottom: 4 },
    newConvBtnText: { fontSize: 15, color: '#10b981', fontWeight: '600' },
    convItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
    convItemActive: { backgroundColor: '#0d2d22', borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8 },
    convItemText: { flex: 1, fontSize: 14, color: '#94a3b8' },
    emptyText: { textAlign: 'center', color: '#475569', padding: 24 },
});
