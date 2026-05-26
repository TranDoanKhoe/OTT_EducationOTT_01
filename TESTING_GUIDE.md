# 🧪 HƯỚNG DẪN TEST - OTT EDUCATION MOBILE

## 📋 CHUẨN BỊ

### 1. Yêu cầu:
- ✅ Backend đang chạy (Spring Boot)
- ✅ Web app đang chạy (React + Vite)
- ✅ Thiết bị Android/iOS thật (KHÔNG dùng emulator cho WebRTC)
- ✅ Expo Go app đã cài trên thiết bị
- ✅ Cùng mạng WiFi với máy dev

### 2. Khởi động Mobile App:
```bash
cd OTT_EducationOTT_01
npm install  # nếu chưa install
npm start
```

Scan QR code bằng:
- **Android**: Expo Go app
- **iOS**: Camera app → mở bằng Expo Go

---

## 🧪 TEST CASES

### ✅ TEST 1: LOGIN & TOKEN MANAGEMENT

**Mục tiêu:** Kiểm tra token được lưu và auto-refresh

**Steps:**
1. Mở app → Login screen
2. Nhập username/password → Tap "Đăng nhập"
3. **Kiểm tra:**
   - ✅ Console log: "✅ Login successful, tokens saved"
   - ✅ Navigate to /(tabs)
   - ✅ Token được lưu vào AsyncStorage

4. Đợi token hết hạn (hoặc xóa token thủ công)
5. Gọi API bất kỳ (mở chat, profile, etc.)
6. **Kiểm tra:**
   - ✅ Console log: "🔄 Attempting to refresh access token..."
   - ✅ Console log: "✅ Token refreshed successfully"
   - ✅ API call thành công, không bị logout

**Expected Result:** Token tự động refresh, user không bị gián đoạn

---

### ✅ TEST 2: REAL-TIME MESSAGING

**Mục tiêu:** Kiểm tra WebSocket và tin nhắn real-time

**Steps:**
1. Login trên Mobile
2. Login trên Web (user khác)
3. Web gửi tin nhắn đến Mobile
4. **Kiểm tra:**
   - ✅ Mobile nhận tin nhắn ngay lập tức
   - ✅ Notification badge cập nhật
   - ✅ Tin nhắn hiển thị đúng trong chat

5. Mobile gửi tin nhắn đến Web
6. **Kiểm tra:**
   - ✅ Web nhận tin nhắn ngay lập tức
   - ✅ Typing indicator hoạt động

**Expected Result:** Tin nhắn 2 chiều real-time, không delay

---

### ✅ TEST 3: WEBSOCKET RECONNECT

**Mục tiêu:** Kiểm tra WebSocket reconnect sau token refresh

**Steps:**
1. Login và mở chat
2. Force token refresh (xóa token hoặc đợi hết hạn)
3. Gọi API bất kỳ → Token refresh
4. **Kiểm tra:**
   - ✅ Console log: "🔄 Token refreshed, reconnecting WebSocket..."
   - ✅ Console log: "✅ STOMP connected successfully!"

5. Gửi tin nhắn từ Web
6. **Kiểm tra:**
   - ✅ Mobile vẫn nhận được tin nhắn
   - ✅ Không bị disconnect

**Expected Result:** WebSocket tự động reconnect, không mất tin nhắn

---

### ✅ TEST 4: 1-1 VIDEO CALL (Web → Mobile)

**Mục tiêu:** Kiểm tra video call giữa Web và Mobile

**Steps:**
1. Login trên Web (User A)
2. Login trên Mobile (User B)
3. Web user A click "Video Call" cho user B
4. **Kiểm tra Mobile:**
   - ✅ Incoming call screen xuất hiện
   - ✅ Avatar + tên user A hiển thị
   - ✅ "Cuộc gọi video đến..." text
   - ✅ Vibration hoạt động

5. Mobile tap "Chấp nhận"
6. **Kiểm tra:**
   - ✅ Permission dialog xuất hiện
   - ✅ Grant permissions

7. **Kiểm tra Active Call Screen:**
   - ✅ Remote video (Web) hiển thị full screen
   - ✅ Local video (Mobile) hiển thị PiP góc phải
   - ✅ Call duration đếm lên
   - ✅ CallControls hiển thị ở dưới

8. **Test Controls:**
   - Tap "Tắt mic" → ✅ Icon đổi màu đỏ, Web thấy muted
   - Tap "Bật mic" → ✅ Icon trở lại bình thường
   - Tap "Tắt camera" → ✅ Local PiP biến mất, Web thấy placeholder
   - Tap "Bật camera" → ✅ Local PiP xuất hiện lại

9. Tap "Kết thúc"
10. **Kiểm tra:**
    - ✅ Navigate back
    - ✅ Web cũng kết thúc cuộc gọi
    - ✅ Streams được cleanup

**Expected Result:** Video call 2 chiều hoạt động mượt mà

---

### ✅ TEST 5: 1-1 AUDIO CALL (Mobile → Web)

**Mục tiêu:** Kiểm tra audio call từ Mobile đến Web

**Steps:**
1. Mobile user tap "Audio Call" icon
2. **Kiểm tra:**
   - ✅ Active call screen với "Đang gọi..."
   - ✅ Avatar hiển thị (không có video)

3. Web nhận incoming call → Accept
4. **Kiểm tra Mobile:**
   - ✅ "Đang gọi..." đổi thành call duration
   - ✅ CallControls hiển thị (chỉ có Mute + End)
   - ✅ Không có video views

5. Test audio:
   - Nói từ Mobile → ✅ Web nghe được
   - Nói từ Web → ✅ Mobile nghe được
   - Tap "Tắt mic" → ✅ Web không nghe được

**Expected Result:** Audio call hoạt động, không có video

---

### ✅ TEST 6: GROUP VIDEO CALL

**Mục tiêu:** Kiểm tra group call với nhiều members

**Steps:**
1. Web user tạo group call với 3+ members
2. Mobile members nhận incoming call
3. **Kiểm tra Incoming Screen:**
   - ✅ "Cuộc gọi video nhóm đến..."
   - ✅ Group name hiển thị
   - ✅ "Từ [caller name]"

4. Mobile tap "Chấp nhận" → Grant permissions
5. **Kiểm tra Group Active Screen:**
   - ✅ Header: Group name + "X thành viên"
   - ✅ Call duration
   - ✅ Grid layout (2 cột nếu > 1 member)
   - ✅ VideoView cho mỗi remote stream
   - ✅ Local PiP góc phải trên
   - ✅ CallControls ở dưới

6. Member khác join
7. **Kiểm tra:**
   - ✅ Grid tự động update
   - ✅ VideoView mới xuất hiện

8. Test controls:
   - Toggle audio → ✅ Tất cả members thấy muted indicator
   - Toggle video → ✅ Local PiP biến mất/xuất hiện

**Expected Result:** Group call với grid layout, tất cả streams hiển thị

---

### ✅ TEST 7: PERMISSION DENIED

**Mục tiêu:** Kiểm tra xử lý khi user từ chối permissions

**Steps:**
1. Incoming call → Tap "Chấp nhận"
2. Permission dialog → Tap "Deny" hoặc "Don't allow"
3. **Kiểm tra:**
   - ✅ Alert xuất hiện: "Cần cấp quyền"
   - ✅ Message: "Vui lòng cấp quyền truy cập microphone và camera..."
   - ✅ 2 buttons: "Hủy" và "Mở cài đặt"

4. Tap "Mở cài đặt"
5. **Kiểm tra:**
   - ✅ Navigate to app settings
   - ✅ User có thể grant permissions

6. **Kiểm tra Caller Side:**
   - ✅ Nhận "call-reject" signal
   - ✅ Call screen đóng

**Expected Result:** User-friendly error handling, link to settings

---

### ✅ TEST 8: CALL INTERRUPTION

**Mục tiêu:** Kiểm tra xử lý khi cuộc gọi bị gián đoạn

**Steps:**
1. Đang trong cuộc gọi (Web ↔ Mobile)
2. **Test các scenarios:**

   **A. Caller ends call:**
   - Web tap "End call"
   - ✅ Mobile nhận "call-end" signal
   - ✅ Mobile screen đóng ngay lập tức

   **B. Network interruption:**
   - Tắt WiFi trên Mobile
   - ✅ Connection timeout
   - ✅ Error handling graceful

   **C. App goes to background:**
   - Press Home button trên Mobile
   - ✅ Call vẫn tiếp tục (audio)
   - ✅ Video pause (tùy platform)

   **D. Incoming phone call:**
   - Nhận cuộc gọi điện thoại thật
   - ✅ WebRTC call pause/end
   - ✅ Cleanup resources

**Expected Result:** Graceful handling cho tất cả interruptions

---

### ✅ TEST 9: MULTIPLE CALLS

**Mục tiêu:** Kiểm tra xử lý nhiều cuộc gọi cùng lúc

**Steps:**
1. Mobile đang trong cuộc gọi với User A
2. User B gọi đến Mobile
3. **Kiểm tra:**
   - ✅ Incoming call screen xuất hiện
   - ✅ Option để end call hiện tại và accept call mới
   - ✅ Hoặc reject call mới

4. Accept call mới
5. **Kiểm tra:**
   - ✅ Call cũ end gracefully
   - ✅ Call mới start
   - ✅ User A nhận "call-end" signal

**Expected Result:** Chỉ 1 call active tại 1 thời điểm

---

### ✅ TEST 10: CROSS-PLATFORM COMPATIBILITY

**Mục tiêu:** Kiểm tra tương thích giữa Web và Mobile

**Test Matrix:**

| Caller | Callee | Video | Audio | Expected |
|--------|--------|-------|-------|----------|
| Web    | Mobile | ✅    | ✅    | ✅ Works |
| Mobile | Web    | ✅    | ✅    | ✅ Works |
| Web    | Mobile | ❌    | ✅    | ✅ Works |
| Mobile | Web    | ❌    | ✅    | ✅ Works |
| Web    | Mobile (Group) | ✅ | ✅ | ✅ Works |
| Mobile | Web (Group) | ✅ | ✅ | ✅ Works |

**Steps:**
1. Test tất cả combinations trong matrix
2. **Kiểm tra cho mỗi test:**
   - ✅ Signaling hoạt động
   - ✅ ICE candidates exchange
   - ✅ Media streams hiển thị
   - ✅ Controls hoạt động
   - ✅ End call cleanup

**Expected Result:** Tất cả combinations hoạt động

---

## 📊 PERFORMANCE TESTING

### 1. Call Quality:
- ✅ Video resolution: 720p (1280x720)
- ✅ Frame rate: 30fps
- ✅ Audio quality: Clear, no echo
- ✅ Latency: < 500ms

### 2. Battery Usage:
- Monitor battery drain during 10-minute call
- ✅ Acceptable: < 10% battery per 10 minutes

### 3. Memory:
- Monitor memory usage
- ✅ No memory leaks
- ✅ Proper cleanup after call ends

### 4. Network:
- Test on different networks:
  - ✅ WiFi (good)
  - ✅ 4G (medium)
  - ✅ 3G (poor)
- ✅ Adaptive bitrate

---

## 🐛 DEBUGGING

### Console Logs to Watch:

**Token Management:**
```
✅ Login successful, tokens saved
🔄 Attempting to refresh access token...
✅ Token refreshed successfully
```

**WebSocket:**
```
✅ STOMP connected successfully!
🔄 Token refreshed, reconnecting WebSocket...
📨 Message received: {...}
```

**WebRTC:**
```
🎥 Starting call (video: true)
🔗 Peer connection initialized
📡 ICE candidate: {...}
✅ Remote stream received
```

**Permissions:**
```
✅ Permissions granted
❌ Permissions denied
```

### Common Issues:

**1. "Permission denied"**
- Solution: Go to Settings → App → Permissions → Enable Camera/Mic

**2. "No remote stream"**
- Check: Network connection
- Check: TURN server configuration
- Check: Firewall rules

**3. "WebSocket disconnected"**
- Check: Backend running
- Check: Token valid
- Check: Network stable

**4. "Call not ringing"**
- Check: WebSocket connected
- Check: User online
- Check: Signaling working

---

## ✅ CHECKLIST HOÀN CHỈNH

### Authentication:
- [ ] Login thành công
- [ ] Token được lưu
- [ ] Auto-refresh token
- [ ] Logout cleanup

### Messaging:
- [ ] Send message (Mobile → Web)
- [ ] Receive message (Web → Mobile)
- [ ] Typing indicator
- [ ] Read receipts
- [ ] WebSocket reconnect

### 1-1 Calls:
- [ ] Video call (Web → Mobile)
- [ ] Video call (Mobile → Web)
- [ ] Audio call (Web → Mobile)
- [ ] Audio call (Mobile → Web)
- [ ] Toggle audio/video
- [ ] End call

### Group Calls:
- [ ] Join group call
- [ ] Multiple streams display
- [ ] Grid layout
- [ ] Toggle audio/video
- [ ] Member join/leave
- [ ] End call

### Permissions:
- [ ] Request permissions
- [ ] Handle denied
- [ ] Link to settings
- [ ] Error messages

### Edge Cases:
- [ ] Network interruption
- [ ] Token refresh during call
- [ ] Multiple incoming calls
- [ ] App background/foreground
- [ ] Phone call interruption

### Performance:
- [ ] Call quality good
- [ ] No memory leaks
- [ ] Battery usage acceptable
- [ ] Network adaptive

---

## 🎉 SUCCESS CRITERIA

✅ **Tất cả test cases pass**
✅ **Không có crash**
✅ **Performance tốt**
✅ **User experience mượt mà**
✅ **Cross-platform hoạt động**

---

**Happy Testing! 🚀**
