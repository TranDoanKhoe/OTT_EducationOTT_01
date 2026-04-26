import localStorage from '../utils/localStoragePolyfill';
import axios from 'axios';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Lấy backend URL trực tiếp - backend dùng /message không phải /api/message
const BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    'https://ott-education-be.onrender.com';
const API_BASE_URL = `${BACKEND_URL}/message`;
const SOCKJS_URL =
    process.env.EXPO_PUBLIC_WS_URL ||
    'https://ott-education-be.onrender.com/ws';

let stompClient = null;
let _globalCallSignalHandler = null;
let _globalTypingHandler = null;

// Chờ cho tới khi STOMP client kết nối (tối đa timeoutMs).
// Trả về true nếu kết nối sẵn sàng, false nếu quá hạn/không có client.
async function ensureConnected(timeoutMs = 15000) {
    return new Promise((resolve) => {
        if (stompClient && stompClient.connected) return resolve(true);
        const start = Date.now();
        const check = () => {
            if (stompClient && stompClient.connected) return resolve(true);
            if (Date.now() - start >= timeoutMs) return resolve(false);
            setTimeout(check, 200);
        };
        setTimeout(check, 200);
    });
}

export function registerCallSignalHandler(handler) {
    _globalCallSignalHandler = handler;
}
export function unregisterCallSignalHandler() {
    _globalCallSignalHandler = null;
}

export function updateTypingCallback(handler) {
    _globalTypingHandler = handler;
}

const extractArrayPayload = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.messages)) return payload.messages;
    return [];
};

// Hàm lấy lịch sử tin nhắn 1-1
export const getChatHistory = async (userId, token) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/chat-history/${userId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        const deletedMessageIds = JSON.parse(
            localStorage.getItem('deletedMessageIds') || '[]',
        );
        const rows = extractArrayPayload(response.data);
        return rows
            .filter((msg) => !deletedMessageIds.includes(msg._id || msg.id))
            .map((msg) => ({
                ...msg,
                id: msg._id || msg.id,
                _id: undefined,
            }));
    } catch (error) {
        console.error('Error fetching chat history:', error);
        throw error;
    }
};

// Hàm lấy lịch sử tin nhắn nhóm
export const getGroupChatHistory = async (groupId, token) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/chat-history/group/${groupId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        const deletedMessageIds = JSON.parse(
            localStorage.getItem('deletedMessageIds') || '[]',
        );
        const rows = extractArrayPayload(response.data);
        return rows
            .filter((msg) => !deletedMessageIds.includes(msg._id || msg.id))
            .map((msg) => ({
                ...msg,
                id: msg._id || msg.id,
                _id: undefined,
            }));
    } catch (error) {
        console.error('Error fetching group chat history:', error);
        throw error;
    }
};

// Hàm upload file
export const uploadFile = async (
    files,
    receiverId,
    token,
    groupId = null,
    replyToMessageId = null,
) => {
    // Không cần kiểm tra WebSocket cho upload file
    // if (!stompClient || !stompClient.connected) {
    //     throw new Error('Không thể gửi file: WebSocket không hoạt động');
    // }
    try {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('file', file);
        });
        if (receiverId) formData.append('receiverId', receiverId);
        if (groupId) formData.append('groupId', groupId);
        if (replyToMessageId)
            formData.append('replyToMessageId', replyToMessageId);

        console.log('Uploading to server:', {
            receiverId,
            groupId,
            filesCount: files.length,
        });

        const response = await axios.post(
            `${API_BASE_URL}/upload-file`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    // Do NOT set Content-Type manually — axios sets it with the correct boundary
                },
            },
        );
        console.log('Upload response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error uploading file:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

// Hàm tìm kiếm tin nhắn
export const searchMessages = async (
    userId,
    otherUserId,
    groupId,
    keyword,
    token,
) => {
    try {
        const effectiveOtherUserId = groupId ? userId : otherUserId || userId;
        const params = new URLSearchParams({
            otherUserId: effectiveOtherUserId,
            keyword,
        });
        if (groupId) params.append('groupId', groupId);

        console.log('Search messages params:', params.toString());
        const response = await axios.get(`${API_BASE_URL}/search`, {
            params,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const deletedMessageIds = JSON.parse(
            localStorage.getItem('deletedMessageIds') || '[]',
        );
        const rows = extractArrayPayload(response.data);
        return rows
            .filter((msg) => !deletedMessageIds.includes(msg._id || msg.id))
            .map((msg) => ({
                ...msg,
                id: msg._id || msg.id,
                _id: undefined,
                createAt: msg.createAt || msg.createdAt,
            }));
    } catch (error) {
        console.error(
            'Error searching messages:',
            error.response?.data || error.message,
        );
        throw error;
    }
};

// Hàm lấy danh sách tin nhắn đã ghim
export const getPinnedMessages = async (otherUserId, groupId, token) => {
    try {
        const params = new URLSearchParams();
        // Backend yêu cầu otherUserId bắt buộc, với nhóm gửi groupId thêm vào
        if (groupId) {
            params.append('groupId', groupId);
            params.append('otherUserId', otherUserId || ''); // Gửi empty string nếu là group
        } else {
            params.append('otherUserId', otherUserId);
        }

        console.log('Get pinned messages params:', params.toString());
        const response = await axios.get(
            `${API_BASE_URL}/all-pinned-messages`,
            {
                params,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        const deletedMessageIds = JSON.parse(
            localStorage.getItem('deletedMessageIds') || '[]',
        );
        const rows = extractArrayPayload(response.data);
        return rows
            .filter((msg) => !deletedMessageIds.includes(msg._id || msg.id))
            .map((msg) => ({
                ...msg,
                id: msg._id || msg.id,
                _id: undefined,
                createAt: msg.createAt || msg.createdAt,
            }));
    } catch (error) {
        console.error(
            'Error fetching pinned messages:',
            error.response?.data || error.message,
        );
        throw error;
    }
};

// Hàm ghim tin nhắn (dùng HTTP REST - không phụ thuộc WebSocket)
export const pinMessage = async (messageId, userId, token) => {
    try {
        await axios.post(
            `${API_BASE_URL}/pin/${messageId}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } },
        );
        console.log('Pinned message:', messageId);
        return true;
    } catch (error) {
        console.error('Error pinning message:', error.response?.data || error.message);
        return false;
    }
};

// Hàm bỏ ghim tin nhắn (dùng HTTP REST - không phụ thuộc WebSocket)
export const unpinMessage = async (messageId, userId, token) => {
    try {
        await axios.post(
            `${API_BASE_URL}/unpin/${messageId}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } },
        );
        console.log('Unpinned message:', messageId);
        return true;
    } catch (error) {
        console.error('Error unpinning message:', error.response?.data || error.message);
        return false;
    }
};

// Hàm chỉnh sửa tin nhắn
export const editMessage = async (
    messageId,
    userId,
    content,
    groupId,
    token,
) => {
    if (!stompClient || !stompClient.connected) {
        console.error('Cannot edit message: STOMP client is not connected');
        return false;
    }

    try {
        const message = {
            id: messageId,
            senderId: userId,
            content,
            groupId,
        };
        stompClient.publish({
            destination: '/app/chat.edit',
            body: JSON.stringify(message),
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Edited message:', messageId, 'with content:', content);
        return true;
    } catch (error) {
        console.error('Error editing message:', error);
        return false;
    }
};

// Hàm kết nối WebSocket với STOMP
export function connectWebSocket(
    token,
    userId,
    onMessageCallback,
    onDeleteCallback,
    onRecallCallback,
    onPinCallback,
    onUnpinCallback,
    groupIds = [],
    onFriendRequestCallback,
    onEditCallback,
    onStatusChangeCallback,
    onCallSignalCallback,
    onReadCallback,
    onGroupCreateCallback,
    onGroupUpdateCallback,
    onGroupDeleteCallback,
    onGroupInviteCallback,
    onFriendRequestAcceptedCallback,
    onFriendRequestRejectedCallback,
    onTypingCallback,
) {
    return new Promise((resolve, reject) => {
        if (!token) {
            reject(new Error('Token is missing'));
            return;
        }

        if (stompClient && stompClient.connected) {
            console.log('STOMP connection already in progress');
            resolve();
            return;
        }

        if (stompClient && stompClient.state !== 'CLOSED') {
            console.log('STOMP client state:', stompClient.state);
            resolve();
            return;
        }

        stompClient = new Client({
            webSocketFactory: () => {
                console.log('Connecting to SockJS:', SOCKJS_URL);
                return new SockJS(SOCKJS_URL);
            },
            connectHeaders: {
                Authorization: `Bearer ${token}`,
                userId: userId,
            },
            debug: (str) => {
                console.log('STOMP debug:', str);
            },
            reconnectDelay: 3000,
            heartbeatIncoming: 25000,
            heartbeatOutgoing: 25000,
        });

        stompClient.onConnect = (frame) => {
            console.log('✅ STOMP connected successfully!', frame);
            console.log(`🔌 Connected with userId: ${userId}`);

            try {
                // Use stompClient directly, it's guaranteed to exist in onConnect
                const client = stompClient;
                // Subscription cho tin nhắn 1-1
                client.subscribe(
                    `/user/${userId}/queue/messages`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            console.log(
                                'Raw WebSocket response:',
                                parsedMessage,
                            );
                            const normalizedMessage = {
                                id: parsedMessage._id || parsedMessage.id,
                                senderId: parsedMessage.senderId,
                                receiverId: parsedMessage.receiverId,
                                groupId: parsedMessage.groupId,
                                content: parsedMessage.content,
                                type: parsedMessage.type || 'TEXT',
                                createAt:
                                    parsedMessage.createdAt ||
                                    parsedMessage.createAt ||
                                    new Date().toISOString(),
                                recalled: parsedMessage.recalled || false,
                                deletedByUsers:
                                    parsedMessage.deletedByUsers || [],
                                isRead: parsedMessage.isRead || false,
                                isPinned: parsedMessage.isPinned || false,
                                fileName: parsedMessage.fileName || '',
                                thumbnail: parsedMessage.thumbnail || '',
                                publicId: parsedMessage.publicId || '',
                                isEdited: parsedMessage.isEdited || false,
                            };
                            const deletedMessageIds = JSON.parse(
                                localStorage.getItem('deletedMessageIds') ||
                                    '[]',
                            );
                            if (
                                !deletedMessageIds.includes(
                                    normalizedMessage.id,
                                )
                            ) {
                                onMessageCallback(normalizedMessage);
                            }
                        } catch (error) {
                            console.error('Error parsing message:', error);
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                // Subscription cho tin nhắn nhóm
                groupIds.forEach((groupId) => {
                    if (groupId) {
                        client.subscribe(
                            `/topic/group/${groupId}`,
                            (message) => {
                                try {
                                    const parsedMessage = JSON.parse(
                                        message.body,
                                    );
                                    console.log(
                                        'Raw group WebSocket response:',
                                        parsedMessage,
                                    );
                                    const normalizedMessage = {
                                        id:
                                            parsedMessage._id ||
                                            parsedMessage.id,
                                        senderId: parsedMessage.senderId,
                                        receiverId: parsedMessage.receiverId,
                                        groupId: parsedMessage.groupId,
                                        content: parsedMessage.content,
                                        type: parsedMessage.type || 'TEXT',
                                        createAt:
                                            parsedMessage.createdAt ||
                                            parsedMessage.createAt ||
                                            new Date().toISOString(),
                                        recalled:
                                            parsedMessage.recalled || false,
                                        deletedByUsers:
                                            parsedMessage.deletedByUsers || [],
                                        isRead: parsedMessage.isRead || false,
                                        isPinned:
                                            parsedMessage.isPinned || false,
                                        fileName: parsedMessage.fileName || '',
                                        thumbnail:
                                            parsedMessage.thumbnail || '',
                                        publicId: parsedMessage.publicId || '',
                                        isEdited:
                                            parsedMessage.isEdited || false,
                                    };
                                    const deletedMessageIds = JSON.parse(
                                        localStorage.getItem(
                                            'deletedMessageIds',
                                        ) || '[]',
                                    );
                                    if (
                                        !deletedMessageIds.includes(
                                            normalizedMessage.id,
                                        )
                                    ) {
                                        onMessageCallback(normalizedMessage);
                                    }
                                } catch (error) {
                                    console.error(
                                        'Error parsing group message:',
                                        error,
                                    );
                                }
                            },
                            { Authorization: `Bearer ${token}` },
                        );

                        client.subscribe(
                            `/topic/group/${groupId}/typing`,
                            (message) => {
                                try {
                                    const parsedMessage = JSON.parse(
                                        message.body,
                                    );
                                    const handler = _globalTypingHandler || onTypingCallback;
                                    if (handler) {
                                        handler(parsedMessage);
                                    }
                                } catch (error) {
                                    console.error(
                                        'Error parsing group typing notification:',
                                        error,
                                    );
                                }
                            },
                            { Authorization: `Bearer ${token}` },
                        );
                    } else {
                        console.warn(
                            'Skipping subscription for undefined groupId',
                        );
                    }
                });

                // Subscription cho thông báo xóa
                client.subscribe(
                    `/user/${userId}/queue/delete`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            console.log('Delete notification:', parsedMessage);
                            if (parsedMessage._id) {
                                parsedMessage.id = parsedMessage._id;
                                delete parsedMessage._id;
                            }
                            onDeleteCallback(parsedMessage);
                        } catch (error) {
                            console.error(
                                'Error parsing delete notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                // Subscription cho thông báo thu hồi
                client.subscribe(
                    `/user/${userId}/queue/recall`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            console.log('Recall notification:', parsedMessage);
                            if (parsedMessage._id) {
                                parsedMessage.id = parsedMessage._id;
                                delete parsedMessage._id;
                            }
                            onRecallCallback(parsedMessage);
                        } catch (error) {
                            console.error(
                                'Error parsing recall notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                // Subscription cho thông báo ghim tin nhắn
                client.subscribe(
                    `/user/${userId}/queue/pin`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            console.log('Pin notification:', parsedMessage);
                            if (parsedMessage._id) {
                                parsedMessage.id = parsedMessage._id;
                                delete parsedMessage._id;
                            }
                            if (onPinCallback) {
                                onPinCallback(parsedMessage);
                            } else {
                                console.warn('onPinCallback is not defined');
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing pin notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                // Subscription cho thông báo bỏ ghim tin nhắn
                client.subscribe(
                    `/user/${userId}/queue/unpin`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            console.log('Unpin notification:', parsedMessage);
                            if (parsedMessage._id) {
                                parsedMessage.id = parsedMessage._id;
                                delete parsedMessage._id;
                            }
                            if (onUnpinCallback) {
                                onUnpinCallback(parsedMessage);
                            } else {
                                console.warn('onUnpinCallback is not defined');
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing unpin notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                // Subscription cho thông báo chỉnh sửa tin nhắn
                client.subscribe(
                    `/user/${userId}/queue/edit`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            console.log('Edit notification:', parsedMessage);
                            if (parsedMessage._id) {
                                parsedMessage.id = parsedMessage._id;
                                delete parsedMessage._id;
                            }
                            if (onEditCallback) {
                                onEditCallback(parsedMessage);
                            } else {
                                console.warn('onEditCallback is not defined');
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing edit notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                // Subscription cho thông báo yêu cầu kết bạn
                client.subscribe(
                    `/user/${userId}/queue/friendRequest`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            console.log(
                                'Friend request notification:',
                                parsedMessage,
                            );
                            if (onFriendRequestCallback) {
                                onFriendRequestCallback(parsedMessage);
                            } else {
                                console.warn(
                                    'onFriendRequestCallback is not defined',
                                );
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing friend request notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                // Endpoint chuẩn mới cho friend request
                client.subscribe(
                    `/user/${userId}/queue/friend/request`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            if (onFriendRequestCallback) {
                                onFriendRequestCallback(parsedMessage);
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing friend request notification (new endpoint):',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                client.subscribe(
                    `/user/${userId}/queue/friend/request/accepted`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            if (onFriendRequestAcceptedCallback) {
                                onFriendRequestAcceptedCallback(parsedMessage);
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing friend request accepted notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                client.subscribe(
                    `/user/${userId}/queue/friend/request/rejected`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            if (onFriendRequestRejectedCallback) {
                                onFriendRequestRejectedCallback(parsedMessage);
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing friend request rejected notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                // Subscription cho thông báo thay đổi trạng thái online/offline
                client.subscribe(
                    `/user/${userId}/queue/status`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            console.log(
                                'Status change notification:',
                                parsedMessage,
                            );
                            if (onStatusChangeCallback) {
                                onStatusChangeCallback(parsedMessage);
                            } else {
                                console.warn(
                                    'onStatusChangeCallback is not defined',
                                );
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing status change notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                // Subscription cho WebRTC signaling (call/video call)
                client.subscribe(
                    `/user/${userId}/queue/call`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            console.log(
                                'Call signal notification:',
                                parsedMessage,
                            );
                            if (onCallSignalCallback) {
                                onCallSignalCallback(parsedMessage);
                            }
                            if (_globalCallSignalHandler) {
                                _globalCallSignalHandler(parsedMessage);
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing call signal notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                // Subscription cho thông báo tin nhắn đã đọc
                client.subscribe(
                    `/user/${userId}/queue/read`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            console.log(
                                '✅ Read receipt received:',
                                parsedMessage,
                            );
                            if (onReadCallback) {
                                onReadCallback(parsedMessage);
                            } else {
                                console.warn('onReadCallback is not defined');
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing read notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                client.subscribe(
                    `/user/${userId}/queue/typing`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            const handler = _globalTypingHandler || onTypingCallback;
                            if (handler) {
                                handler(parsedMessage);
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing typing notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                client.subscribe(
                    `/user/${userId}/queue/group/create`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            if (onGroupCreateCallback) {
                                onGroupCreateCallback(parsedMessage);
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing group create notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                client.subscribe(
                    `/user/${userId}/queue/group/updated`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            if (onGroupUpdateCallback) {
                                onGroupUpdateCallback(parsedMessage);
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing group update notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                client.subscribe(
                    `/user/${userId}/queue/group/delete`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            if (onGroupDeleteCallback) {
                                onGroupDeleteCallback(parsedMessage);
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing group delete notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                client.subscribe(
                    `/user/${userId}/queue/group/invite`,
                    (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            if (onGroupInviteCallback) {
                                onGroupInviteCallback(parsedMessage);
                            }
                        } catch (error) {
                            console.error(
                                'Error parsing group invite notification:',
                                error,
                            );
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );

                resolve();
            } catch (error) {
                console.error('Error in STOMP onConnect:', error);
                reject(error);
            }
        };

        stompClient.onStompError = (frame) => {
            console.error('STOMP error:', frame);
            reject(
                new Error(
                    `STOMP error: ${
                        frame.body || frame.headers?.message || 'Unknown error'
                    }`,
                ),
            );
        };

        stompClient.onWebSocketClose = (event) => {
            console.log('SockJS disconnected:', event);
            // Don't set to null here to avoid race condition
            // stompClient will be cleaned up in disconnectWebSocket()
        };

        stompClient.onWebSocketError = (error) => {
            console.error('SockJS error:', error);
            reject(
                new Error(
                    `SockJS error: ${error.message || 'Connection failed'}`,
                ),
            );
        };

        console.log(
            'Connecting STOMP with token:',
            token.substring(0, 20) + '...',
        );
        stompClient.activate();
    });
}

// Hàm gửi tin nhắn 1-1
export function sendMessage(destination, message, token) {
    if (!stompClient || !stompClient.connected) {
        console.error('Cannot send message: STOMP client is not connected');
        return false;
    }

    try {
        stompClient.publish({
            destination,
            body: JSON.stringify(message),
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Sent message to', destination, ':', message);
        return true;
    } catch (error) {
        console.error('Error sending message:', error);
        return false;
    }
}

// Hàm gửi tin nhắn nhóm
export function sendGroupMessage(destination, message, token) {
    if (!stompClient || !stompClient.connected) {
        console.error(
            'Cannot send group message: STOMP client is not connected',
        );
        return false;
    }

    try {
        stompClient.publish({
            destination,
            body: JSON.stringify(message),
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Sent group message to', destination, ':', message);
        return true;
    } catch (error) {
        console.error('Error sending group message:', error);
        return false;
    }
}

// Hàm thu hồi tin nhắn
export async function recallMessage(identifier, userId, token) {
    if (!(await ensureConnected())) {
        console.error('Cannot recall message: STOMP client is not connected');
        return false;
    }

    try {
        const message = { id: identifier, senderId: userId };
        stompClient.publish({
            destination: '/app/chat.recall',
            body: JSON.stringify(message),
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Recalled message:', identifier);
        return true;
    } catch (error) {
        console.error('Error recalling message:', error);
        return false;
    }
}

// Hàm xóa tin nhắn
export async function deleteMessage(identifier, userId, token) {
    if (!(await ensureConnected())) {
        console.error('Cannot delete message: STOMP client is not connected');
        return false;
    }

    try {
        const message = { id: identifier, senderId: userId };
        stompClient.publish({
            destination: '/app/chat.delete',
            body: JSON.stringify(message),
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Deleted message:', identifier);
        return true;
    } catch (error) {
        console.error('Error deleting message:', error);
        return false;
    }
}

// Hàm xóa lịch sử tin nhắn
export const clearChatHistory = async (otherUserId, groupId, token) => {
    try {
        const params = new URLSearchParams();
        if (otherUserId) params.append('otherUserId', otherUserId);
        if (groupId) params.append('groupId', groupId);

        const response = await axios.delete(
            `${API_BASE_URL}/clear-history?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        console.log('Chat history cleared:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error clearing chat history:', error);
        throw error;
    }
};

// Hàm chuyển tiếp tin nhắn
export function forwardMessage(
    identifier,
    userId,
    receiverId,
    groupId,
    content,
    token,
) {
    if (!stompClient || !stompClient.connected) {
        console.error('Cannot forward message: STOMP client is not connected');
        return false;
    }
    try {
        const message = {
            id: identifier,
            senderId: userId,
            receiverId,
            groupId,
            content,
            type: 'FORWARD',
        };
        stompClient.publish({
            destination: '/app/chat.forward',
            body: JSON.stringify(message),
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log(
            'Forwarded message:',
            identifier,
            'to',
            receiverId || groupId,
        );
        return true;
    } catch (error) {
        console.error('Error forwarding message:', error);
        return false;
    }
}

// Hàm ngắt kết nối
export function disconnectWebSocket() {
    if (stompClient) {
        console.log('Disconnecting STOMP');
        stompClient.deactivate();
        stompClient = null;
    } else {
        console.log('No active STOMP connection to disconnect');
    }
}

// Hàm đánh dấu tin nhắn đã đọc
export function readMessage(messageId, senderId, receiverId, token) {
    if (!stompClient || !stompClient.connected) {
        console.warn(
            'Cannot mark message as read: STOMP client is not connected yet. Message will be marked as read later.',
        );
        return false;
    }

    try {
        const message = {
            id: messageId,
            senderId: senderId,
            receiverId: receiverId,
        };
        stompClient.publish({
            destination: '/app/chat.read',
            body: JSON.stringify(message),
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Message marked as read:', messageId);
        return true;
    } catch (error) {
        console.error('Error marking message as read:', error);
        return false;
    }
}

export function sendTypingStatus(senderId, receiverId, groupId, typing, token) {
    if (!stompClient || !stompClient.connected) {
        return false;
    }

    try {
        stompClient.publish({
            destination: '/app/chat.typing',
            body: JSON.stringify({
                senderId,
                receiverId,
                groupId,
                typing,
            }),
            headers: { Authorization: `Bearer ${token}` },
        });
        return true;
    } catch (error) {
        console.error('Error sending typing status:', error);
        return false;
    }
}

// Hàm gửi WebRTC signaling cho voice/video call
export function sendCallSignal(signalType, data, receiverId, token) {
    if (!stompClient || !stompClient.connected) {
        console.error('Cannot send call signal: STOMP client is not connected');
        return false;
    }

    try {
        const signal = {
            type: signalType, // 'offer', 'answer', 'ice-candidate', 'call-start', 'call-end', 'call-reject'
            data,
            receiverId,
            timestamp: new Date().toISOString(),
        };

        stompClient.publish({
            destination: '/app/call.signal',
            body: JSON.stringify(signal),
            headers: { Authorization: `Bearer ${token}` },
        });

        console.log('Sent call signal:', signalType, 'to', receiverId);
        return true;
    } catch (error) {
        console.error('Error sending call signal:', error);
        return false;
    }
}
