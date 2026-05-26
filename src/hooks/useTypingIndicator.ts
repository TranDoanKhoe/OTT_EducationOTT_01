// @ts-nocheck
// useTypingIndicator - Custom hook quản lý typing status
import { useRef, useCallback } from 'react';
import { sendTypingStatus } from '../api/messageApi';
import { getAccessTokenSync } from '../utils/authHeader';

const TYPING_HEARTBEAT_MS = 3000; // Re-send typing:true every 3s
const TYPING_STOP_DEBOUNCE_MS = 1200; // Stop typing after 1.2s of inactivity

export const useTypingIndicator = (
    userId: string,
    conversationId: string | null,
    isGroup: boolean
) => {
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasSentTypingRef = useRef(false);
    const lastTypingHeartbeatRef = useRef(0);

    const emitTypingStatus = useCallback(
        (typing: boolean) => {
            const token = getAccessTokenSync();
            if (!token || !userId || !conversationId) return;

            sendTypingStatus(
                userId,
                isGroup ? null : conversationId,
                isGroup ? conversationId : null,
                typing,
                token
            );
        },
        [userId, conversationId, isGroup]
    );

    const handleInputChange = useCallback(
        (hasText: boolean) => {
            // Reset trailing "stop typing" timer on every keystroke
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }

            if (!hasText) {
                // No text - stop typing
                if (hasSentTypingRef.current) {
                    emitTypingStatus(false);
                    hasSentTypingRef.current = false;
                    lastTypingHeartbeatRef.current = 0;
                }
                return;
            }

            // Send typing:true on the leading edge AND every TYPING_HEARTBEAT_MS
            // while user keeps typing. Without the heartbeat, receiver's 5s TTL
            // auto-clears the indicator even though sender is still typing.
            const now = Date.now();
            if (
                !hasSentTypingRef.current ||
                now - lastTypingHeartbeatRef.current >= TYPING_HEARTBEAT_MS
            ) {
                emitTypingStatus(true);
                hasSentTypingRef.current = true;
                lastTypingHeartbeatRef.current = now;
            }

            // Set timer to stop typing after debounce period
            typingTimeoutRef.current = setTimeout(() => {
                emitTypingStatus(false);
                hasSentTypingRef.current = false;
                lastTypingHeartbeatRef.current = 0;
                typingTimeoutRef.current = null;
            }, TYPING_STOP_DEBOUNCE_MS);
        },
        [emitTypingStatus]
    );

    const cleanup = useCallback(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        if (hasSentTypingRef.current) {
            emitTypingStatus(false);
            hasSentTypingRef.current = false;
            lastTypingHeartbeatRef.current = 0;
        }
    }, [emitTypingStatus]);

    return {
        handleInputChange,
        cleanup,
    };
};
