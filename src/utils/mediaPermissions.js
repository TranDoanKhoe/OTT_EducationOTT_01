// Media permissions helper for React Native
// Đồng bộ với Web mediaPermissions.js
import { PermissionsAndroid, Platform, Alert } from 'react-native';

/**
 * Request camera and microphone permissions
 * @param {boolean} needsVideo - Whether video permission is needed
 * @returns {Promise<boolean>} - True if permissions granted
 */
export const requestMediaPermissions = async (needsVideo = true) => {
    if (Platform.OS === 'ios') {
        // iOS permissions are handled automatically by react-native-webrtc
        // when getUserMedia is called
        return true;
    }

    if (Platform.OS === 'android') {
        try {
            const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
            
            if (needsVideo) {
                permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
            }

            const results = await PermissionsAndroid.requestMultiple(permissions);

            const audioGranted = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === 
                PermissionsAndroid.RESULTS.GRANTED;
            
            const videoGranted = !needsVideo || 
                results[PermissionsAndroid.PERMISSIONS.CAMERA] === 
                PermissionsAndroid.RESULTS.GRANTED;

            if (!audioGranted || !videoGranted) {
                Alert.alert(
                    'Cần cấp quyền',
                    'Vui lòng cấp quyền truy cập microphone và camera trong cài đặt để thực hiện cuộc gọi.',
                    [
                        { text: 'Hủy', style: 'cancel' },
                        { text: 'Mở cài đặt', onPress: () => {
                            // Open app settings
                            if (Platform.OS === 'android') {
                                const { Linking } = require('react-native');
                                Linking.openSettings();
                            }
                        }},
                    ]
                );
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error requesting permissions:', error);
            return false;
        }
    }

    return true;
};

/**
 * Check if media permissions are granted
 * @param {boolean} needsVideo - Whether to check video permission
 * @returns {Promise<boolean>} - True if permissions granted
 */
export const checkMediaPermissions = async (needsVideo = true) => {
    if (Platform.OS === 'ios') {
        // iOS doesn't provide a way to check permissions before requesting
        return true;
    }

    if (Platform.OS === 'android') {
        try {
            const audioGranted = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
            );

            if (!needsVideo) {
                return audioGranted;
            }

            const videoGranted = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.CAMERA
            );

            return audioGranted && videoGranted;
        } catch (error) {
            console.error('Error checking permissions:', error);
            return false;
        }
    }

    return true;
};

/**
 * Show permission denied alert
 * @param {string} type - 'audio' or 'video'
 */
export const showPermissionDeniedAlert = (type = 'audio') => {
    const message = type === 'video'
        ? 'Bạn cần cấp quyền truy cập camera và microphone để thực hiện cuộc gọi video.'
        : 'Bạn cần cấp quyền truy cập microphone để thực hiện cuộc gọi thoại.';

    Alert.alert(
        'Quyền bị từ chối',
        message,
        [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Mở cài đặt', onPress: () => {
                if (Platform.OS === 'android') {
                    const { Linking } = require('react-native');
                    Linking.openSettings();
                }
            }},
        ]
    );
};

/**
 * Handle media permission errors
 * @param {Error} error - The error object
 */
export const handleMediaPermissionError = (error) => {
    console.error('Media permission error:', error);

    if (error.name === 'NotAllowedError' || error.message?.includes('denied')) {
        showPermissionDeniedAlert('video');
    } else if (error.name === 'NotFoundError') {
        Alert.alert(
            'Thiết bị không tìm thấy',
            'Không tìm thấy microphone hoặc camera. Vui lòng kiểm tra thiết bị của bạn.'
        );
    } else if (error.name === 'NotReadableError') {
        Alert.alert(
            'Thiết bị đang bận',
            'Thiết bị đang được sử dụng bởi ứng dụng khác. Vui lòng đóng ứng dụng đó và thử lại.'
        );
    } else {
        Alert.alert(
            'Lỗi',
            `Không thể truy cập thiết bị: ${error.message || 'Unknown error'}`
        );
    }
};
