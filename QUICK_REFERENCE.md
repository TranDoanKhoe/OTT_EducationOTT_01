# ⚡ QUICK REFERENCE - WEBRTC COMPONENTS

## 🎯 Sử dụng nhanh

### 1. CallControls Component

```typescript
import { CallControls } from '../../src/components/call';

<CallControls
    isAudioEnabled={isAudioEnabled}
    isVideoEnabled={isVideoEnabled}
    onToggleAudio={handleToggleAudio}
    onToggleVideo={handleToggleVideo}  // Optional, for video calls
    onEndCall={handleEndCall}
    showVideo={true}                   // Optional, default true
    callDuration="02:35"               // Optional
/>
```

**Props:**
- `isAudioEnabled: boolean` - Trạng thái audio (true = unmuted)
- `isVideoEnabled: boolean` - Trạng thái video (true = camera on)
- `onToggleAudio: () => void` - Callback khi toggle audio
- `onToggleVideo?: () => void` - Callback khi toggle video (optional)
- `onEndCall: () => void` - Callback khi end call
- `showVideo?: boolean` - Hiển thị video button (default: true)
- `callDuration?: string` - Duration string (format: "MM:SS")

---

### 2. VideoView Component

```typescript
import { VideoView } from '../../src/components/call';

// Remote video (full screen)
<VideoView
    stream={remoteStream}
    isLocal={false}
    userName="John Doe"
    style={styles.remoteVideo}
/>

// Local video (PiP)
<VideoView
    stream={localStream}
    isLocal={true}
    isMuted={!isAudioEnabled}
    style={styles.localVideo}
/>
```

**Props:**
- `stream: any` - MediaStream object từ WebRTC
- `isLocal?: boolean` - Local stream hay remote (default: false)
- `isMuted?: boolean` - Hiển thị muted indicator (default: false)
- `userName?: string` - Tên user hiển thị
- `style?: any` - Custom styles

**Features:**
- Auto mirror cho local video
- Fallback UI khi không có stream
- User name label
- Muted indicator (icon mic-off)
- "Bạn" badge cho local stream

---

### 3. Media Permissions

```typescript
import {
    requestMediaPermissions,
    checkMediaPermissions,
    handleMediaPermissionError,
} from '../../src/utils/mediaPermissions';

// Request permissions
const hasPermissions = await requestMediaPermissions(isVideo);
if (!hasPermissions) {
    console.log('Permissions denied');
    return;
}

// Check permissions (không show dialog)
const granted = await checkMediaPermissions(isVideo);

// Handle errors
try {
    await webrtcService.startCall(isVideo);
} catch (error) {
    handleMediaPermissionError(error);
}
```

**Functions:**
- `requestMediaPermissions(needsVideo: boolean): Promise<boolean>`
  - Request camera/mic permissions
  - Show alert nếu denied
  - Return true nếu granted

- `checkMediaPermissions(needsVideo: boolean): Promise<boolean>`
  - Check permissions without requesting
  - Return true nếu đã granted

- `handleMediaPermissionError(error: Error): void`
  - Show user-friendly error alert
  - Handle NotAllowedError, NotFoundError, etc.

---

## 📋 Common Patterns

### Pattern 1: 1-1 Video Call Screen

```typescript
import { CallControls, VideoView } from '../../src/components/call';

const [isAudioEnabled, setIsAudioEnabled] = useState(true);
const [isVideoEnabled, setIsVideoEnabled] = useState(true);
const [localStream, setLocalStream] = useState(null);
const [remoteStream, setRemoteStream] = useState(null);

const handleToggleAudio = () => {
    const enabled = webrtcService.toggleAudio();
    setIsAudioEnabled(enabled);
};

const handleToggleVideo = () => {
    const enabled = webrtcService.toggleVideo();
    setIsVideoEnabled(enabled);
};

return (
    <View style={styles.container}>
        {/* Remote video full screen */}
        <VideoView
            stream={remoteStream}
            isLocal={false}
            userName={callerName}
            style={styles.remoteVideo}
        />

        {/* Local video PiP */}
        {isVideoEnabled && (
            <VideoView
                stream={localStream}
                isLocal={true}
                isMuted={!isAudioEnabled}
                style={styles.localVideo}
            />
        )}

        {/* Controls */}
        <CallControls
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            onToggleAudio={handleToggleAudio}
            onToggleVideo={handleToggleVideo}
            onEndCall={handleEndCall}
            showVideo={true}
            callDuration={formatDuration(callDuration)}
        />
    </View>
);
```

---

### Pattern 2: Group Call Screen

```typescript
const [remoteStreams, setRemoteStreams] = useState([]);
// remoteStreams = [{ peerId: string, stream: MediaStream }]

const renderRemoteStream = ({ item }) => (
    <View style={styles.peerTile}>
        <VideoView
            stream={item.stream}
            isLocal={false}
            userName={`Member ${item.peerId}`}
            style={{ flex: 1 }}
        />
    </View>
);

return (
    <View style={styles.container}>
        {/* Grid of remote streams */}
        <FlatList
            data={remoteStreams}
            keyExtractor={(item) => item.peerId}
            numColumns={2}
            renderItem={renderRemoteStream}
        />

        {/* Local PiP */}
        {isVideoEnabled && (
            <VideoView
                stream={localStream}
                isLocal={true}
                isMuted={!isAudioEnabled}
                style={styles.localPip}
            />
        )}

        {/* Controls */}
        <CallControls
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            onToggleAudio={handleToggleAudio}
            onToggleVideo={handleToggleVideo}
            onEndCall={handleEndCall}
            showVideo={true}
        />
    </View>
);
```

---

### Pattern 3: Incoming Call with Permissions

```typescript
import { requestMediaPermissions, handleMediaPermissionError } from '../../src/utils/mediaPermissions';

const handleAccept = async () => {
    // 1. Request permissions FIRST
    const hasPermissions = await requestMediaPermissions(isVideo);
    if (!hasPermissions) {
        console.log('Permissions denied, rejecting call');
        handleReject();
        return;
    }

    // 2. Start call
    try {
        await webrtcService.startCall(isVideo);
        // ... setup peer connection
        // ... navigate to active call screen
    } catch (error) {
        console.error('Error accepting call:', error);
        handleMediaPermissionError(error);
        handleReject();
    }
};
```

---

## 🎨 Styling Examples

### Full Screen Remote Video
```typescript
const styles = StyleSheet.create({
    remoteVideo: {
        flex: 1,  // Full screen
    },
});
```

### PiP Local Video
```typescript
const styles = StyleSheet.create({
    localVideo: {
        position: 'absolute',
        top: 60,
        right: 16,
        width: 100,
        height: 140,
        zIndex: 10,
    },
});
```

### Group Call Grid
```typescript
const styles = StyleSheet.create({
    peerTile: {
        width: SCREEN_WIDTH / 2,
        height: SCREEN_WIDTH / 2 * 0.9,
        backgroundColor: '#1e293b',
    },
});
```

---

## 🔧 State Management

### Recommended State Structure

```typescript
// Audio/Video states
const [isAudioEnabled, setIsAudioEnabled] = useState(true);
const [isVideoEnabled, setIsVideoEnabled] = useState(true);

// Stream states (objects, not URLs)
const [localStream, setLocalStream] = useState<MediaStream | null>(null);
const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

// For group calls
const [remoteStreams, setRemoteStreams] = useState<Array<{
    peerId: string;
    stream: MediaStream;
}>>([]);

// Call metadata
const [callDuration, setCallDuration] = useState(0);
const [callAccepted, setCallAccepted] = useState(false);
```

---

## 🐛 Common Mistakes

### ❌ DON'T: Use stream URLs
```typescript
// BAD
const [remoteStreamUrl, setRemoteStreamUrl] = useState(null);
setRemoteStreamUrl(stream.toURL());
<RTCView streamURL={remoteStreamUrl} />
```

### ✅ DO: Use stream objects
```typescript
// GOOD
const [remoteStream, setRemoteStream] = useState(null);
setRemoteStream(stream);
<VideoView stream={remoteStream} />
```

---

### ❌ DON'T: Forget permission handling
```typescript
// BAD
const handleAccept = async () => {
    await webrtcService.startCall(isVideo);  // Might fail silently
};
```

### ✅ DO: Request permissions first
```typescript
// GOOD
const handleAccept = async () => {
    const hasPermissions = await requestMediaPermissions(isVideo);
    if (!hasPermissions) {
        handleReject();
        return;
    }
    await webrtcService.startCall(isVideo);
};
```

---

### ❌ DON'T: Use inverted state names
```typescript
// BAD - confusing
const [isMuted, setIsMuted] = useState(false);
const [isCameraOff, setIsCameraOff] = useState(false);
```

### ✅ DO: Use positive state names
```typescript
// GOOD - clear
const [isAudioEnabled, setIsAudioEnabled] = useState(true);
const [isVideoEnabled, setIsVideoEnabled] = useState(true);
```

---

## 📱 Platform-Specific Notes

### Android
- Permissions MUST be requested at runtime
- Use `PermissionsAndroid` API
- Link to settings: `Linking.openSettings()`

### iOS
- Permissions requested automatically by WebRTC
- First time: System dialog
- Subsequent: Use cached permission

---

## 🎯 Performance Tips

1. **Use stream objects, not URLs**
   - Avoid `stream.toURL()` conversion
   - Pass stream directly to VideoView

2. **Memoize components**
   - VideoView already memoized
   - Memoize custom components if needed

3. **Cleanup streams**
   - Stop tracks on unmount
   - Close peer connections
   - Clear state

4. **Optimize re-renders**
   - Use `React.memo` for list items
   - Avoid inline functions in render

---

## 🔗 Related Files

- **Components:** `src/components/call/`
- **Utils:** `src/utils/mediaPermissions.js`
- **Screens:** `app/call/`
- **Service:** `src/services/webrtcService.js`
- **Docs:** `SYNC_PROGRESS.md`, `TESTING_GUIDE.md`

---

## 💡 Tips & Tricks

### Tip 1: Format Call Duration
```typescript
const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};
```

### Tip 2: Poll for Remote Stream
```typescript
useEffect(() => {
    const pollRef = setInterval(() => {
        const remote = webrtcService.getRemoteStream();
        if (remote) {
            setRemoteStream(remote);
            clearInterval(pollRef);
        }
    }, 500);

    return () => clearInterval(pollRef);
}, []);
```

### Tip 3: Handle Call End from Both Sides
```typescript
registerCallSignalHandler((signal) => {
    if (signal.type === 'call-end') {
        handleEndCall(false);  // Don't send signal back
    }
});
```

---

**📚 For more details, see:**
- `SYNC_PROGRESS.md` - Full implementation details
- `TESTING_GUIDE.md` - How to test
- `WEBRTC_INTEGRATION_SUMMARY.md` - Quick overview

---

**⚡ Happy Coding!**
