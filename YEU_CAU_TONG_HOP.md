# Tổng hợp yêu cầu dự án OTT Education

## 1. CLO 1 (Công nghệ)

- Mobile app: `React Native` + `Expo`
- Web app: `React` + `Vite`
- Backend: `Spring Boot`
- Database: `MongoDB`
- Xác thực: `JWT` + `Refresh Token`
- Real-time messaging: `WebSocket` + `STOMP`
- Cuộc gọi audio/video: `WebRTC`
- Lưu token: `AsyncStorage` và `authHeader.js`

### HTTP là gì

- `HTTP` (HyperText Transfer Protocol) là giao thức truyền tải dữ liệu giữa client và server trên web.
- Client gửi request và server trả response, mỗi lần kết nối thường là một giao dịch mới.
- Dự án dùng HTTP để gọi API backend, lấy dữ liệu, đăng nhập, gửi tin nhắn không real-time.

### RESTful API là gì

- `RESTful API` là cách thiết kế API theo nguyên tắc REST: dùng tài nguyên (resource), HTTP verbs, và đường dẫn rõ nghĩa.
- Ví dụ: `GET /users`, `POST /auth/login`, `PUT /messages/{id}`.
- RESTful API giúp code dễ hiểu, dễ mở rộng và phù hợp với kiến trúc client-server.

### WebSocket là gì và dùng sao

- `WebSocket` là kết nối hai chiều giữa client và server mở liên tục.
- Khác với HTTP, WebSocket cho phép server gửi dữ liệu đến client ngay lập tức mà không cần client phải hỏi lại.
- Dự án dùng WebSocket để gửi/tin nhắn chat real-time và nhận sự kiện nhanh.
- `STOMP` là giao thức ở trên WebSocket để quản lý subscribe/publish dễ hơn.
- Cách dùng ở dự án: mobile/web mở kết nối tới backend, subscribe các kênh tin nhắn, server broadcast tin nhắn cho client.

### Nhận/gửi chat nhanh dùng công nghệ gì

- Người gửi (sender) gửi tin nhắn lên backend qua WebSocket hoặc API.
- Backend xử lý và gửi tin nhắn đến người nhận (receiver) ngay lập tức qua WebSocket.
- Ở dự án, `messageApi.js` và WebSocket/STOMP giữ vai trò gửi/nhận tin nhắn nhanh.
- Với WebSocket, kết nối mở liên tục nên tin nhắn không cần phải request lại nhiều lần.
- Người nhận chỉ cần lắng nghe (subscribe) sự kiện trên kênh tin nhắn, khi server gửi tới là hiển thị ngay.
- Đây là mô hình publish/subscribe: sender publish tin nhắn, server broadcast đến các subscriber.

### Các lý thuyết có thể hỏi trong dự án

- `JWT`: token dùng xác thực, sign bằng secret, gửi kèm header mỗi request.
- `Refresh Token`: token dài hạn để lấy access token mới khi access token hết hạn.
- `AsyncStorage`: lưu dữ liệu cục bộ trên mobile, dùng lưu token và cài đặt.
- `authHeader.js`: file tạo header Authorization cho mọi request.
- `WebRTC`: kết nối peer-to-peer cho audio/video, cần camera/micro và signal server để trao SDP.
- `Publish/Subscribe`: sender gửi dữ liệu, backend phân phối đến các client đã subscribe.
- `Real-time`: cập nhật ngay mà không cần client request lại.
- `API HTTP` dùng cho thao tác dữ liệu bình thường; `WebSocket` dùng cho tin nhắn và sự kiện nhanh.

## 2. CLO 4 (Cài đặt)

- Mở thư mục `OTT_EducationOTT_01`
- Chạy `npm install`
- Chạy `npx expo start`
- Backend Spring Boot phải chạy trước khi test tính năng mobile
- Mobile test nên dùng thiết bị thật (WebRTC cần hardware thật)

## 3. CLO 3 (Testing)

- Test đăng nhập và quản lý token
- Test refresh token tự động khi token hết hạn
- Test chat real-time giữa mobile và web
- Test reconnect WebSocket sau khi token refresh
- Test cuộc gọi 1-1 audio và video
- Có checklist test trong `TESTING_GUIDE.md`

## 4. Phi chức năng

- Bảo mật: bảo mật token, xác thực an toàn
- Ổn định: kết nối real-time và reconnect tự động
- Hiệu năng: chat và call mượt, tối ưu cho mobile
- Khả năng mở rộng: hỗ trợ nhiều nền tảng (mobile + web)
- Dễ bảo trì: kiến trúc rõ ràng và tách module

## 5. CLO 5 (Báo cáo)

Các báo cáo chính của dự án:

- `BAO_CAO_TIEN_DO_PHASE_5.md`
- `PHASE_5_INTEGRATION_REPORT.md`
- `PHASE_5_FINAL_REPORT.md`
- `BAO_CAO_HOAN_THANH_CUOI_CUNG.md`
- `AUTO_PILOT_COMPLETE_REPORT.md`

## 6. Đóng góp cá nhân

Các nội dung có thể ghi vào phần đóng góp cá nhân:

- Phát triển tính năng chat real-time trên mobile
- Tích hợp WebSocket/STOMP với backend
- Triển khai cơ chế refresh token tự động
- Kiểm thử chức năng WebRTC, chat và authentication
- Viết tài liệu báo cáo và hướng dẫn test

## 7. CLO 1 (Trình bày khái niệm từ dự án)

- Dự án là hệ thống OTT Education đa nền tảng
- Mobile app giao tiếp với backend Spring Boot
- Web app cũng kết nối tới cùng backend và dùng real-time để chat
- WebRTC dùng cho cuộc gọi audio/video giữa người dùng
- Kiến trúc tập trung vào: authentication, messaging, call, đồng bộ dữ liệu
