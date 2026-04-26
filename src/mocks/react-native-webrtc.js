import React from 'react';
import { View } from 'react-native';

// Mock RTCView as a plain View - no-op khi chạy Expo Go
export const RTCView = ({ style }) => React.createElement(View, { style });

export class RTCPeerConnection {
    constructor() {
        this.remoteDescription = null;
        this.onicecandidate = null;
        this.ontrack = null;
        this.onaddstream = null;
    }
    close() {}
    createOffer() { return Promise.resolve({}); }
    createAnswer() { return Promise.resolve({}); }
    setLocalDescription() { return Promise.resolve(); }
    setRemoteDescription(desc) { this.remoteDescription = desc; return Promise.resolve(); }
    addIceCandidate() { return Promise.resolve(); }
    addTrack() {}
    getSenders() { return []; }
}

export class RTCIceCandidate {
    constructor(init) { Object.assign(this, init || {}); }
}

export class RTCSessionDescription {
    constructor(init) { Object.assign(this, init || {}); }
}

export const mediaDevices = {
    getUserMedia: () => Promise.reject(new Error('Tính năng gọi không khả dụng khi chạy Expo Go')),
};
