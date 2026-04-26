import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    mediaDevices,
} from 'react-native-webrtc';

// ─── Single-peer state (1-1 calls) ────────────────────────────────────────────
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let pendingIceCandidates = [];
let preInitIceCandidates = [];
let canProcessRemoteIce = false;

// ─── Multi-peer state (group calls) ───────────────────────────────────────────
const groupPeerConnections = new Map(); // peerId → { pc, remoteStream, pendingCandidates, iceReady }
let groupLocalStream = null;

const parseCsv = (value) =>
    String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const FREE_TURN_SERVERS = [
    { urls: 'turn:openrelay.metered.ca:80',                username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443',               username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

const buildIceServers = () => {
    const stunUrls = parseCsv(process.env.EXPO_PUBLIC_STUN_URLS);
    const defaultStunUrls = [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
    ];

    const servers = [{ urls: stunUrls.length ? stunUrls : defaultStunUrls }];

    const turnUrls = parseCsv(
        process.env.EXPO_PUBLIC_TURN_URLS || process.env.EXPO_PUBLIC_TURN_URL,
    );
    const turnUsername = process.env.EXPO_PUBLIC_TURN_USERNAME;
    const turnCredential = process.env.EXPO_PUBLIC_TURN_CREDENTIAL;

    if (turnUrls.length && turnUsername && turnCredential) {
        servers.push({
            urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls,
            username: turnUsername,
            credential: turnCredential,
        });
    } else {
        servers.push(...FREE_TURN_SERVERS);
    }

    return servers;
};

const configuration = {
    iceServers: buildIceServers(),
    iceCandidatePoolSize: 10,
};

// ─── 1-1 Call API ──────────────────────────────────────────────────────────────

const flushPendingIceCandidates = async () => {
    if (!peerConnection || !peerConnection.remoteDescription) return;

    const queued = [...pendingIceCandidates];
    pendingIceCandidates = [];
    for (const candidate of queued) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Error applying queued ICE candidate:', error);
        }
    }
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
        if (event.candidate) onIceCandidate(event.candidate);
    };

    peerConnection.ontrack = (event) => {
        if (event.streams?.[0]) {
            remoteStream = event.streams[0];
            onTrack(remoteStream);
        }
    };

    peerConnection.onaddstream = (event) => {
        remoteStream = event.stream;
        onTrack(remoteStream);
    };

    return peerConnection;
};

export const startCall = async (isVideoCall = false) => {
    try {
        const constraints = {
            audio: true,
            video: isVideoCall
                ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
                : false,
        };
        localStream = await mediaDevices.getUserMedia(constraints);

        if (peerConnection) {
            localStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, localStream);
            });
        }
        return localStream;
    } catch (error) {
        if (error.name === 'NotAllowedError' || error.message?.includes('denied')) {
            throw new Error('Bạn cần cấp quyền truy cập microphone/camera trong cài đặt thiết bị.');
        } else if (error.name === 'NotFoundError') {
            throw new Error('Không tìm thấy microphone/camera. Vui lòng kiểm tra thiết bị của bạn.');
        } else if (error.name === 'NotReadableError') {
            throw new Error('Thiết bị đang được sử dụng bởi ứng dụng khác.');
        } else {
            throw new Error(`Không thể truy cập thiết bị: ${error.message}`);
        }
    }
};

export const createOffer = async () => {
    if (!peerConnection) throw new Error('Peer connection not initialized');
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return offer;
};

export const createAnswer = async () => {
    if (!peerConnection) throw new Error('Peer connection not initialized');
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
};

export const setRemoteDescription = async (description) => {
    if (!peerConnection) throw new Error('Peer connection not initialized');
    await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
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
        const tracks = kind === 'audio'
            ? localStream.getAudioTracks()
            : localStream.getVideoTracks();
        if (tracks?.[0]) return tracks[0];
    }
    if (peerConnection) {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === kind);
        if (sender?.track) return sender.track;
    }
    return null;
};

export const toggleAudio = () => {
    const track = getTrackByKind('audio');
    if (track) { track.enabled = !track.enabled; return track.enabled; }
    return false;
};

export const toggleVideo = () => {
    const track = getTrackByKind('video');
    if (track) { track.enabled = !track.enabled; return track.enabled; }
    return false;
};

export const getLocalStream = () => localStream;
export const getRemoteStream = () => remoteStream;

// ─── Group Call API ────────────────────────────────────────────────────────────

export const startGroupCall = async (isVideoCall = false) => {
    if (!groupLocalStream) {
        const constraints = {
            audio: true,
            video: isVideoCall
                ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
                : false,
        };
        groupLocalStream = await mediaDevices.getUserMedia(constraints);
    }
    return groupLocalStream;
};

export const initializeGroupPeerConnection = (peerId, onIceCandidate, onRemoteStream) => {
    if (groupPeerConnections.has(peerId)) {
        groupPeerConnections.get(peerId).pc.close();
    }

    const pc = new RTCPeerConnection(configuration);
    const entry = { pc, remoteStream: null, pendingCandidates: [], iceReady: false };
    groupPeerConnections.set(peerId, entry);

    pc.onicecandidate = (event) => {
        if (event.candidate) onIceCandidate(peerId, event.candidate);
    };

    pc.ontrack = (event) => {
        if (event.streams?.[0]) {
            entry.remoteStream = event.streams[0];
            onRemoteStream(peerId, event.streams[0]);
        }
    };

    pc.onaddstream = (event) => {
        entry.remoteStream = event.stream;
        onRemoteStream(peerId, event.stream);
    };

    // Add local tracks if group stream already acquired
    if (groupLocalStream) {
        groupLocalStream.getTracks().forEach((track) => pc.addTrack(track, groupLocalStream));
    }

    return pc;
};

export const createGroupOffer = async (peerId) => {
    const entry = groupPeerConnections.get(peerId);
    if (!entry) throw new Error(`No peer connection for ${peerId}`);
    const offer = await entry.pc.createOffer();
    await entry.pc.setLocalDescription(offer);
    return offer;
};

export const createGroupAnswer = async (peerId, offerDescription) => {
    const entry = groupPeerConnections.get(peerId);
    if (!entry) throw new Error(`No peer connection for ${peerId}`);
    await entry.pc.setRemoteDescription(new RTCSessionDescription(offerDescription));
    const answer = await entry.pc.createAnswer();
    await entry.pc.setLocalDescription(answer);
    return answer;
};

export const setGroupRemoteDescription = async (peerId, description) => {
    const entry = groupPeerConnections.get(peerId);
    if (!entry) throw new Error(`No peer connection for ${peerId}`);
    await entry.pc.setRemoteDescription(new RTCSessionDescription(description));
};

export const enableGroupIceProcessing = async (peerId) => {
    const entry = groupPeerConnections.get(peerId);
    if (!entry) return;
    entry.iceReady = true;
    const queued = [...entry.pendingCandidates];
    entry.pendingCandidates = [];
    for (const candidate of queued) {
        try {
            await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error(`ICE candidate error for ${peerId}:`, e);
        }
    }
};

export const addGroupIceCandidate = async (peerId, candidate) => {
    const entry = groupPeerConnections.get(peerId);
    if (!entry) return;
    if (!entry.iceReady || !entry.pc.remoteDescription) {
        entry.pendingCandidates.push(candidate);
        return;
    }
    await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
};

export const closeGroupPeerConnection = (peerId) => {
    const entry = groupPeerConnections.get(peerId);
    if (entry) {
        entry.pc.close();
        groupPeerConnections.delete(peerId);
    }
};

export const endGroupCall = () => {
    groupPeerConnections.forEach(({ pc }) => pc.close());
    groupPeerConnections.clear();
    if (groupLocalStream) {
        groupLocalStream.getTracks().forEach((t) => t.stop());
        groupLocalStream = null;
    }
};

export const toggleGroupAudio = () => {
    if (!groupLocalStream) return false;
    const track = groupLocalStream.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; return track.enabled; }
    return false;
};

export const toggleGroupVideo = () => {
    if (!groupLocalStream) return false;
    const track = groupLocalStream.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; return track.enabled; }
    return false;
};

export const getGroupLocalStream = () => groupLocalStream;

export const getGroupRemoteStreams = () => {
    const streams = [];
    groupPeerConnections.forEach(({ remoteStream }, peerId) => {
        if (remoteStream) streams.push({ peerId, stream: remoteStream });
    });
    return streams;
};
