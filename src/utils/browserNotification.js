import { Platform } from 'react-native';

/**
 * Browser/Web notification utilities.
 * On React Native (iOS/Android), these are no-ops.
 * Use expo-notifications for native push notifications instead.
 */

export const requestNotificationPermission = async () => {
    if (Platform.OS !== 'web') return 'denied';
    if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('This browser does not support desktop notification');
        return 'denied';
    }

    if (window.Notification.permission === 'granted') {
        return 'granted';
    }

    if (window.Notification.permission !== 'denied') {
        const permission = await window.Notification.requestPermission();
        return permission;
    }

    return window.Notification.permission;
};

export const showBrowserNotification = (title, options = {}) => {
    if (Platform.OS !== 'web') return null;
    if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('This browser does not support desktop notification');
        return null;
    }

    if (window.Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
    }

    try {
        const notification = new window.Notification(title, {
            body: options.body || '',
            icon: options.icon || '/ott-education-icon.png',
            tag: options.tag || 'ott-education-notification',
            requireInteraction: false,
            silent: false,
        });

        if (options.onClick) {
            notification.onclick = options.onClick;
        }

        setTimeout(() => {
            notification.close();
        }, 5000);

        return notification;
    } catch (error) {
        console.error('Error showing notification:', error);
        return null;
    }
};

export const isDocumentVisible = () => {
    if (Platform.OS !== 'web') return true;
    if (typeof document === 'undefined') return true;
    return !document.hidden && document.visibilityState === 'visible';
};

export const showNotificationIfHidden = (title, options = {}) => {
    if (!isDocumentVisible()) {
        return showBrowserNotification(title, options);
    }
    return null;
};
