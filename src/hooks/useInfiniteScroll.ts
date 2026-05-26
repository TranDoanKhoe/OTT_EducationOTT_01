// @ts-nocheck
// useInfiniteScroll - Custom hook cho infinite scroll messages
import { useState, useCallback, useRef } from 'react';
import { getChatHistory, getGroupChatHistory } from '../api/messageApi';
import { getAccessTokenSync } from '../utils/authHeader';

const HISTORY_PAGE_SIZE = 50;

export const useInfiniteScroll = (
    conversationId: string | null,
    isGroup: boolean,
    userId: string
) => {
    const [historyPage, setHistoryPage] = useState(0);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const isLoadingRef = useRef(false);

    const loadMoreMessages = useCallback(async () => {
        if (!conversationId || !userId || isLoadingRef.current || !hasMoreHistory) {
            return [];
        }

        isLoadingRef.current = true;
        setIsLoadingMore(true);

        try {
            const token = getAccessTokenSync();
            if (!token) {
                console.error('No token available for loading history');
                return [];
            }

            const nextPage = historyPage + 1;
            let olderMessages = [];

            if (isGroup) {
                olderMessages = await getGroupChatHistory(
                    conversationId,
                    userId,
                    nextPage,
                    HISTORY_PAGE_SIZE,
                    token
                );
            } else {
                olderMessages = await getChatHistory(
                    conversationId,
                    userId,
                    nextPage,
                    HISTORY_PAGE_SIZE,
                    token
                );
            }

            if (!olderMessages || olderMessages.length === 0) {
                setHasMoreHistory(false);
                return [];
            }

            if (olderMessages.length < HISTORY_PAGE_SIZE) {
                setHasMoreHistory(false);
            }

            setHistoryPage(nextPage);
            return olderMessages;
        } catch (error) {
            console.error('Error loading more messages:', error);
            return [];
        } finally {
            setIsLoadingMore(false);
            isLoadingRef.current = false;
        }
    }, [conversationId, isGroup, userId, historyPage, hasMoreHistory]);

    const reset = useCallback(() => {
        setHistoryPage(0);
        setHasMoreHistory(true);
        setIsLoadingMore(false);
        isLoadingRef.current = false;
    }, []);

    return {
        loadMoreMessages,
        isLoadingMore,
        hasMoreHistory,
        reset,
    };
};
