// @ts-nocheck
// useMessageReactions - Custom hook quản lý message reactions
import { useState, useRef, useCallback } from 'react';
import { reactToMessage } from '../api/messageApi';
import { getAccessTokenSync } from '../utils/authHeader';

interface Reaction {
    emoji: string;
    userIds: string[];
    count?: number;
}

export const useMessageReactions = (userId: string) => {
    const [localReactions, setLocalReactions] = useState<Record<string, Reaction[]>>({});
    const reactingIds = useRef(new Set<string>());

    const handleReaction = useCallback(
        (message: any, emoji: string) => {
            const key = `${message.id}-${emoji}`;
            
            // Debounce: ignore rapid clicks
            if (reactingIds.current.has(key)) return;
            reactingIds.current.add(key);
            setTimeout(() => reactingIds.current.delete(key), 800);

            const msgId = message.id;
            const token = getAccessTokenSync();

            if (!token) {
                console.error('No token available for reaction');
                return;
            }

            // Optimistic update — cập nhật UI ngay lập tức
            setLocalReactions((prev) => {
                const current = [...(prev[msgId] ?? message.reactions ?? [])];
                const idx = current.findIndex((r) => r.emoji === emoji);

                if (idx !== -1) {
                    // Emoji đã tồn tại
                    const already = current[idx].userIds.includes(userId);
                    if (already) {
                        // Remove reaction
                        const newIds = current[idx].userIds.filter((id) => id !== userId);
                        return {
                            ...prev,
                            [msgId]:
                                newIds.length === 0
                                    ? current.filter((_, i) => i !== idx)
                                    : current.map((r, i) =>
                                          i === idx
                                              ? { ...r, userIds: newIds, count: newIds.length }
                                              : r
                                      ),
                        };
                    }
                    // Add reaction
                    return {
                        ...prev,
                        [msgId]: current.map((r, i) =>
                            i === idx
                                ? {
                                      ...r,
                                      userIds: [...r.userIds, userId],
                                      count: r.userIds.length + 1,
                                  }
                                : r
                        ),
                    };
                }

                // Emoji mới
                return {
                    ...prev,
                    [msgId]: [...current, { emoji, userIds: [userId], count: 1 }],
                };
            });

            // Gửi lên backend qua WebSocket
            reactToMessage(msgId, emoji, userId, token, message.groupId || null);
        },
        [userId]
    );

    const getReactions = useCallback(
        (message: any): Reaction[] => {
            return localReactions[message.id] ?? message.reactions ?? [];
        },
        [localReactions]
    );

    const updateReactionsFromServer = useCallback((messageId: string, reactions: Reaction[]) => {
        setLocalReactions((prev) => ({
            ...prev,
            [messageId]: reactions,
        }));
    }, []);

    return {
        localReactions,
        handleReaction,
        getReactions,
        updateReactionsFromServer,
    };
};
