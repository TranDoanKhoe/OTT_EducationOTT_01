let peerConnection = null;
let localStream = null;
let remoteStream = null;
let pendingIceCandidates = [];
let preInitIceCandidates = [];
let canProcessRemoteIce = false;

const flushPendingIceCandidates = async () => {
    if (!peerConnection || !peerConnection.remoteDescription) {
        return;
    }

    if (pendingIceCandidates.length > 0) {
        const queuedCandidates = [...pendingIceCandidates];
        pendingIceCandidates = [];
        for (const candidate of queuedCandidates) {
            try {
                await peerConnection.addIceCandidate(
                    new RTCIceCandidate(candidate),
                );
            } catch (error) {
                console.error('Error applying queued ICE candidate:', error);
            }
        }
    }
};

const parseCsv = (value) =>
    String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const buildIceServers = () => {
    const stunUrls = parseCsv(import.meta.env.VITE_STUN_URLS);
    const defaultStunUrls = [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
    ];

    const servers = [
        {
            urls: stunUrls.length ? stunUrls : defaultStunUrls,
        },
    ];

    const turnUrls = parseCsv(
        import.meta.env.VITE_TURN_URLS || import.meta.env.VITE_TURN_URL,
    );
    const turnUsername = import.meta.env.VITE_TURN_USERNAME;
    const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

    if (turnUrls.length && turnUsername && turnCredential) {
        servers.push({
            urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls,
            username: turnUsername,
            credential: turnCredential,
        });
    }

    return servers;
};

const configuration = {
    iceServers: buildIceServers(),
    iceCandidatePoolSize: 10,
};

export const initializePeerConnection = (onIceCandidate, onTrack) => {
    pendingIceCandidates = [];
    canProcessRemoteIce = false;
    peerConnection = new RTCPeerConnection(configuration);

    if (preInitIceCandidates.length > 0) {
        pendingIceCandidates = [...preInitIceCandidates];
        preInitIceCandidates = [];
    }

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            onIceCandidate(event.candidate);
        }
    };

    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        onTrack(remoteStream);
    };

    return peerConnection;
};

export const startCall = async (isVideoCall = false) => {
    try {
        if (!navigator?.mediaDevices?.getUserMedia) {
            const hostname = window.location.hostname;
            const isLocalhost =
                hostname === 'localhost' || hostname === '127.0.0.1';

            if (!window.isSecureContext && !isLocalhost) {
                throw new Error(
                    'Trinh duyet chan micro/camera tren HTTP voi dia chi IP. Hay mo frontend bang localhost hoac HTTPS.',
                );
            }

            throw new Error(
                'Trinh duyet khong ho tro mediaDevices/getUserMedia.',
            );
        }

        const constraints = {
            audio: true,
            video: isVideoCall ? { width: 1280, height: 720 } : false,
        };

        localStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (peerConnection) {
            localStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, localStream);
            });
        }

        return localStream;
    } catch (error) {
        console.error('Error accessing media devices:', error);

        // Provide more specific error messages
        if (error.name === 'NotAllowedError') {
            throw new Error(
                'Bạn cần cho phép quyền truy cập microphone/camera. Vui lòng click vào icon ổ khóa bên cạnh URL và bật quyền.',
            );
        } else if (error.name === 'NotFoundError') {
            throw new Error(
                'Không tìm thấy microphone/camera. Vui lòng kiểm tra thiết bị của bạn.',
            );
        } else if (error.name === 'NotReadableError') {
            throw new Error('Thiết bị đang được sử dụng bởi ứng dụng khác.');
        } else {
            throw new Error(`Không thể truy cập thiết bị: ${error.message}`);
        }
    }
};

export const createOffer = async () => {
    if (!peerConnection) {
        throw new Error('Peer connection not initialized');
    }

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return offer;
};

export const createAnswer = async () => {
    if (!peerConnection) {
        throw new Error('Peer connection not initialized');
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
};

export const setRemoteDescription = async (description) => {
    if (!peerConnection) {
        throw new Error('Peer connection not initialized');
    }
    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(description),
    );
};

export const enableIceProcessing = async () => {
    canProcessRemoteIce = true;
    await flushPendingIceCandidates();
};

export const addIceCandidate = async (candidate) => {
    if (!peerConnection) {
        preInitIceCandidates.push(candidate);
        return;
    }

    if (!canProcessRemoteIce || !peerConnection.remoteDescription) {
        pendingIceCandidates.push(candidate);
        return;
    }

    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

export const endCall = () => {
    if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        localStream = null;
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    remoteStream = null;
    pendingIceCandidates = [];
    preInitIceCandidates = [];
    canProcessRemoteIce = false;
};

const getTrackByKind = (kind) => {
    if (localStream) {
        const tracks =
            kind === 'audio'
                ? localStream.getAudioTracks()
                : localStream.getVideoTracks();
        if (tracks && tracks[0]) {
            return tracks[0];
        }
    }

    if (peerConnection) {
        const sender = peerConnection
            .getSenders()
            .find((s) => s.track && s.track.kind === kind);
        if (sender && sender.track) {
            return sender.track;
        }
    }

    return null;
};

export const toggleAudio = () => {
    const audioTrack = getTrackByKind('audio');
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
    }
    return false;
};

export const toggleVideo = () => {
    const videoTrack = getTrackByKind('video');
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
    }
    return false;
};

export const getLocalStream = () => localStream;
export const getRemoteStream = () => remoteStream;
