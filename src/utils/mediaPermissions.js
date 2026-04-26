import { Platform } from 'react-native';

/**
 * Check if WebRTC is supported.
 * On React Native, this is handled by react-native-webrtc.
 */
export const checkWebRTCSupport = () => {
    if (Platform.OS !== 'web') return true; // react-native-webrtc handles it
    return !!(
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia &&
        typeof window !== 'undefined' &&
        window.RTCPeerConnection
    );
};

/**
 * Check current permission status for media devices.
 * On React Native, use expo-av or react-native-webrtc permissions instead.
 */
export const checkMediaPermissions = async (video = false) => {
    if (Platform.OS !== 'web') {
        // On native, permissions are handled by expo-av / react-native-webrtc
        return { microphone: 'prompt', camera: 'prompt' };
    }

    if (
        typeof navigator === 'undefined' ||
        !navigator.permissions ||
        !navigator.permissions.query
    ) {
        return { microphone: 'prompt', camera: 'prompt' };
    }

    try {
        const micPermission = await navigator.permissions.query({
            name: 'microphone',
        });
        let cameraPermission = { state: 'prompt' };

        if (video) {
            try {
                cameraPermission = await navigator.permissions.query({
                    name: 'camera',
                });
            } catch {
                console.warn('Camera permission query not supported');
            }
        }

        return {
            microphone: micPermission.state,
            camera: cameraPermission.state,
        };
    } catch (error) {
        console.warn('Permission query not supported:', error);
        return { microphone: 'prompt', camera: 'prompt' };
    }
};

/**
 * Request permissions with better UX.
 * On React Native, use expo-av or react-native-webrtc permissions instead.
 */
export const requestMediaPermissions = async (video = false) => {
    if (Platform.OS !== 'web') {
        // On native, permissions are handled by expo-av / react-native-webrtc
        return { granted: true, error: null };
    }

    try {
        if (
            typeof navigator === 'undefined' ||
            !navigator?.mediaDevices?.getUserMedia
        ) {
            return {
                granted: false,
                error: 'Trình duyệt không hỗ trợ mediaDevices/getUserMedia.',
            };
        }

        const constraints = {
            audio: true,
            video: video ? { width: 1280, height: 720 } : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach((track) => track.stop());

        return { granted: true, error: null };
    } catch (error) {
        let errorMessage = 'Unknown error';

        if (
            error.name === 'NotAllowedError' ||
            error.name === 'PermissionDeniedError'
        ) {
            errorMessage =
                'Bạn đã từ chối quyền truy cập. Vui lòng bật lại trong cài đặt trình duyệt.';
        } else if (
            error.name === 'NotFoundError' ||
            error.name === 'DevicesNotFoundError'
        ) {
            errorMessage =
                'Không tìm thấy microphone/camera. Vui lòng kiểm tra thiết bị.';
        } else if (
            error.name === 'NotReadableError' ||
            error.name === 'TrackStartError'
        ) {
            errorMessage = 'Thiết bị đang được sử dụng bởi ứng dụng khác.';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage =
                'Thiết bị không đáp ứng yêu cầu. Hãy thử lại với cài đặt khác.';
        } else if (error.name === 'SecurityError') {
            errorMessage =
                'Lỗi bảo mật. Vui lòng sử dụng HTTPS hoặc localhost.';
        }

        return { granted: false, error: errorMessage };
    }
};

/**
 * Get user-friendly device names.
 * On React Native, this is not applicable.
 */
export const getMediaDevices = async () => {
    if (Platform.OS !== 'web') {
        return { audioInputs: [], videoInputs: [] };
    }

    try {
        if (
            typeof navigator === 'undefined' ||
            !navigator.mediaDevices ||
            !navigator.mediaDevices.enumerateDevices
        ) {
            return { audioInputs: [], videoInputs: [] };
        }

        const devices = await navigator.mediaDevices.enumerateDevices();

        const audioInputs = devices.filter(
            (device) => device.kind === 'audioinput',
        );
        const videoInputs = devices.filter(
            (device) => device.kind === 'videoinput',
        );

        return { audioInputs, videoInputs };
    } catch (error) {
        console.error('Error enumerating devices:', error);
        return { audioInputs: [], videoInputs: [] };
    }
};
