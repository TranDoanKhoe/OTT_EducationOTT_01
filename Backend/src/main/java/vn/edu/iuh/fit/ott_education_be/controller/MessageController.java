

package vn.edu.iuh.fit.ott_education_be.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.edu.iuh.fit.ott_education_be.controller.request.MessageRequest;
import vn.edu.iuh.fit.ott_education_be.controller.response.MessageResponse;
import vn.edu.iuh.fit.ott_education_be.repository.UserRepository;
import vn.edu.iuh.fit.ott_education_be.service.MessageService;
import vn.edu.iuh.fit.ott_education_be.service.WebSocketService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j(topic = "MESSAGE-CONTROLLER")
@RequestMapping("/message")
public class MessageController {
    private final MessageService messageService;
    private final UserRepository userRepository;
    private final WebSocketService webSocketService;

    @GetMapping("/chat-history/{userId}")
    public ResponseEntity<List<MessageResponse>> getChatHistory(@PathVariable String userId) {
        return ResponseEntity.ok(messageService.getChatHistory(userId));
    }

    @GetMapping("/chat-history/group/{groupId}")
    public ResponseEntity<List<MessageResponse>> getGroupChatHistory(@PathVariable String groupId) {
        return ResponseEntity.ok(messageService.getGroupChatHistory(groupId));
    }

    @PostMapping("/upload-file")
    public ResponseEntity<List<Map<String, String>>> uploadFile(
            @RequestParam("file") List<MultipartFile> files,
            @RequestParam(value = "receiverId", required = false) String receiverId,
            @RequestParam(value = "groupId", required = false) String groupId,
            @RequestParam(value = "replyToMessageId", required = false) String replyToMessageId
    ) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getName() == null) {
                log.error("Không tìm thấy thông tin xác thực");
                return ResponseEntity.status(401).body(List.of(Map.of("message", "Không có quyền truy cập")));
            }

            String senderId = userRepository.findByUsername(authentication.getName()).getId();

            if (senderId == null) {
                log.error("Không tìm thấy người dùng với username: {}", authentication.getName());
                return ResponseEntity.status(401).body(List.of(Map.of("message", "Không tìm thấy người dùng")));
            }

            log.info("Đang tải file lên: senderId={}, groupId={}, receiverId={}, filesCount={}", 
                senderId, groupId, receiverId, files != null ? files.size() : 0);

            if (files == null || files.isEmpty()) {
                log.warn("Không có file để tải lên");
                return ResponseEntity.badRequest().body(List.of(Map.of("message", "Không có file để tải lên")));
            }

            List<Map<String, String>> fileResults = new ArrayList<>();
            for (MultipartFile file : files) {
                try {
                    log.info("Đang xử lý file: name={}, size={}, type={}", 
                        file.getOriginalFilename(), file.getSize(), file.getContentType());
                    
                    MessageRequest request = new MessageRequest();
                    request.setSenderId(senderId);
                    request.setReceiverId(receiverId);
                    request.setGroupId(groupId);
                    request.setReplyToMessageId(replyToMessageId);
                    
                    Map<String, String> result = messageService.uploadFile(file, request);
                    fileResults.add(result);
                    log.info("Tải file lên thành công: {}", result);
                } catch (Exception e) {
                    log.error("Lỗi khi tải file {}: {}", file.getOriginalFilename(), e.getMessage(), e);
                    fileResults.add(Map.of(
                        "error", "Tải lên thất bại " + file.getOriginalFilename(),
                        "message", e.getMessage()
                    ));
                }
            }

            log.info("Đã xử lý tất cả file. Số file thành công: {}", fileResults.size());

            // Send via WebSocket (send each message payload separately)
            try {
                for (Map<String, String> payload : fileResults) {
                    if (payload.containsKey("error")) {
                        continue;
                    }

                    if (groupId != null) {
                        webSocketService.sendMessageToGroup(groupId, payload);
                    } else {
                        // Send to both sender and receiver
                        if (receiverId != null && !receiverId.isBlank()) {
                            webSocketService.sendMessageToUser(receiverId, payload);
                        }
                        webSocketService.sendMessageToUser(senderId, payload);
                    }
                }
            } catch (Exception e) {
                log.error("Lỗi khi gửi qua WebSocket: {}", e.getMessage());
                // Continue anyway as files are uploaded
            }

            return ResponseEntity.ok(fileResults);
        } catch (Exception e) {
            log.error("Lỗi không mong muốn trong uploadFile: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(
                List.of(Map.of("message", "Lỗi máy chủ: " + e.getMessage()))
            );
        }
    }

    @GetMapping("/all-pinned-messages")
    public List<MessageResponse> getPinnedMessages(
            @RequestParam String otherUserId,
            @RequestParam(required = false) String groupId
    ) {
        log.debug("Đang lấy các tin nhắn đã ghim: otherUserId={}, groupId={}", otherUserId, groupId);

        try {
            return messageService.getPinnedMessages(otherUserId, groupId);
        } catch (Exception e) {
            log.error("Lỗi khi lấy các tin nhắn đã ghim: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi lấy các tin nhắn đã ghim");
        }
    }

    @GetMapping("/search")
    public List<MessageResponse> searchMessages(
            @RequestParam String otherUserId,
            @RequestParam(required = false) String groupId,
            @RequestParam String keyword
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = userRepository.findByUsername(authentication.getName()).getId();
        log.debug("Đang tìm kiếm tin nhắn: userId={}, otherUserId={}, groupId={}, keyword={}", userId, otherUserId, groupId, keyword);

        try {
            return messageService.searchMessages(userId, otherUserId, groupId, keyword);
        } catch (Exception e) {
            log.error("Lỗi khi tìm kiếm tin nhắn: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi tìm kiếm tin nhắn");
        }
    }

    @DeleteMapping("/clear-history")
    public ResponseEntity<Map<String, String>> clearChatHistory(
            @RequestParam(required = false) String otherUserId,
            @RequestParam(required = false) String groupId
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = userRepository.findByUsername(authentication.getName()).getId();
        log.debug("Đang xóa lịch sử chat: userId={}, otherUserId={}, groupId={}", userId, otherUserId, groupId);

        try {
            messageService.clearChatHistory(userId, otherUserId, groupId);
            return ResponseEntity.ok(Map.of("message", "Đã xóa lịch sử trò chuyện thành công"));
        } catch (Exception e) {
            log.error("Lỗi khi xóa lịch sử chat: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi xóa lịch sử trò chuyện");
        }
    }
}
