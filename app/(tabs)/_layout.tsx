// @ts-nocheck
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { fetchPendingFriendRequests } from '../../src/api/user';
import { fetchGroupInvites } from '../../src/api/groupApi';
import localStorage from '../../src/utils/localStoragePolyfill';

export default function TabLayout() {
    const [notifCount, setNotifCount] = useState(0);

    // Load notification count (friend requests + group invites)
    useEffect(() => {
        const loadCount = async () => {
            try {
                const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
                if (!token) return;
                const [friendReqs, groupInvites] = await Promise.allSettled([
                    fetchPendingFriendRequests(),
                    fetchGroupInvites(token),
                ]);
                const friendCount = Array.isArray(friendReqs.value) ? friendReqs.value.length : 0;
                const groupCount = Array.isArray(groupInvites.value) ? groupInvites.value.length : 0;
                setNotifCount(friendCount + groupCount);
            } catch {
                // Ignore errors
            }
        };
        loadCount();
        // Refresh every 60s
        const interval = setInterval(loadCount, 60000);
        return () => clearInterval(interval);
    }, []);
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#10b981',
                tabBarInactiveTintColor: '#9ca3af',
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: '#d1fae5',
                    paddingBottom: Platform.OS === 'ios' ? 20 : 6,
                    paddingTop: 6,
                    height: Platform.OS === 'ios' ? 78 : 60,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Chats',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialIcons
                            name="chat-bubble"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="classes"
                options={{
                    title: 'Classes',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialIcons
                            name="school"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="ai"
                options={{
                    title: 'AI',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialIcons
                            name="smart-toy"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialIcons
                            name="person"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="contacts"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    href: null,
                    tabBarBadge: notifCount > 0 ? notifCount : undefined,
                }}
            />
            <Tabs.Screen
                name="resources"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
