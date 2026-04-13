
package vn.edu.iuh.fit.ott_education_be.controller;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.edu.iuh.fit.ott_education_be.common.MessageType;
import vn.edu.iuh.fit.ott_education_be.controller.request.MessageRequest;
import vn.edu.iuh.fit.ott_education_be.controller.response.MessageResponse;
import vn.edu.iuh.fit.ott_education_be.service.MessageService;
import vn.edu.iuh.fit.ott_education_be.service.WebSocketService;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
@Slf4j(topic = "CHAT-CONTROLLER")
public class ChatController {
    private final WebSocketService webSocketService;
    private final MessageService messageService;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload MessageRequest request) {
        log.debug("Đang xử lý yêu cầu chat: sender={}, receiver={}",
                request.getSenderId(), request.getReceiverId());
        try {
            if (request.getSenderId() == null) {
                throw new RuntimeException("Yêu cầu tin nhắn không hợp lệ: thiếu senderId");
            }

            if (request.getReceiverId() == null && request.getGroupId() == null) {
                throw new RuntimeException("Invalid message request: missing receiverId or groupId");
            }

            MessageResponse response = messageService.saveMessage(request);

            request.setId(response.getId());
            request.setRecalled(response.isRecalled());
            request.setDeletedByUsers(response.getDeletedByUsers());
            request.setSenderId(request.getSenderId());
            request.setReceiverId(request.getReceiverId());
            request.setGroupId(request.getGroupId());
            request.setContent(request.getContent());
            request.setType(request.getType() != null ? request.getType() : MessageType.TEXT);

            if (request.getGroupId() != null) {
                webSocketService.sendGroupMessage(request);
                log.info("Đã gửi tin nhắn nhóm từ {} đến nhóm {}: {}",
                        request.getSenderId(), request.getGroupId(), request.getContent());
            } else {
                webSocketService.sendMessage(request);
                log.info("Đã gửi tin nhắn từ {} đến {}: {}",
                        request.getSenderId(), request.getReceiverId(), request.getContent());
            }

        } catch (Exception e) {
            log.error("Lỗi khi xử lý tin nhắn: sender={}, receiver={}, error={}",
                    request.getSenderId(), request.getReceiverId(), e.getMessage());
            throw e;
        }

    }

    @MessageMapping("/chat.recall")
    public void recallMessage(@Payload MessageRequest request) {
        String messageId = request.getId();
        String userId = request.getSenderId();

        log.debug("Đang xử lý yêu cầu thu hồi tin nhắn: messageId={}, userId={}",
                messageId, userId);
        try {
            if (messageId == null || userId == null) {
                throw new RuntimeException("Yêu cầu thu hồi tin nhắn không hợp lệ: thiếu messageId hoặc userId");
            }

            messageService.recallMessage(messageId, userId);
            if (request.getGroupId() != null) {
                webSocketService.notifyGroupRecall(messageId, userId, request.getGroupId());
            } else {
                webSocketService.notifyRecall(messageId, userId);
            }
            log.info("Đã thu hồi tin nhắn: messageId={}, userId={}",
                    messageId, userId);
        } catch (Exception e) {
            log.error("Lỗi khi xử lý thu hồi tin nhắn: messageId={}, userId={}, error={}",
                    messageId, userId, e.getMessage());
            throw e;
        }
    }

    @MessageMapping("/chat.delete")
    public void deleteMessage(@Payload MessageRequest request) {
        String messageId = request.getId();
        String userId = request.getSenderId();

        log.debug("Đang xử lý yêu cầu xóa tin nhắn: messageId={}, userId={}",
                messageId, userId);
        try {
            if (messageId == null || userId == null) {
                throw new RuntimeException("Yêu cầu xóa tin nhắn không hợp lệ: thiếu messageId hoặc userId");
            }

            messageService.deleteMessage(messageId, userId);
            if (request.getGroupId() != null) {
                webSocketService.notifyGroupDelete(messageId, userId, request.getGroupId());
            } else {
                webSocketService.notifyDelete(messageId, userId);
            }
            log.info("Đã xóa tin nhắn: messageId={}, userId={}",
                    messageId, userId);
        } catch (Exception e) {
            log.error("Lỗi khi xử lý xóa tin nhắn: messageId={}, userId={}, error={}",
                    messageId, userId, e.getMessage());
            throw e;
        }
    }

    @MessageMapping("/chat.forward")
    public void forwardMessage(@Payload MessageRequest request) {
        String messageId = request.getId();
        String userId = request.getSenderId();
        String receiverId = request.getReceiverId();
        String groupId = request.getGroupId();

        log.debug("Đang xử lý yêu cầu chuyển tiếp tin nhắn: messageId={}, userId={}, receiverId={}, groupId={}",
                messageId, userId, receiverId, groupId);
        try {
            if (messageId == null || userId == null || (receiverId == null && groupId == null)) {
                throw new RuntimeException("Yêu cầu chuyển tiếp tin nhắn không hợp lệ: thiếu messageId, userId hoặc receiverId");
            }

            MessageResponse response = messageService.forwardMessage(messageId, userId, receiverId, groupId);
            if (groupId != null) {
                webSocketService.sendGroupMessage(new MessageRequest(userId, null, groupId, MessageType.FORWARD, response));
            } else {
                webSocketService.sendMessage(new MessageRequest(userId, receiverId, null, MessageType.FORWARD, response));
            }
            log.info("Đã chuyển tiếp tin nhắn: messageId={}, userId={}, receiverId={}, groupId={}",
                    messageId, userId, receiverId, groupId);
        } catch (Exception e) {
            log.error("Lỗi khi xử lý chuyển tiếp tin nhắn: messageId={}, userId={}, receiverId={}, error={}",
                    messageId, userId, receiverId, e.getMessage());
            throw e;
        }
    }

    @MessageMapping("/chat.read")
    public void readMessage(@Payload MessageRequest request) {
        String messageId = request.getId();
        String senderId = request.getSenderId();
        String receiverId = request.getReceiverId();

        log.debug("Đang xử lý yêu cầu đọc tin nhắn: messageId={}, userId={}",
                messageId, receiverId);
        try {
            if (messageId == null || receiverId == null) {
                throw new RuntimeException("Yêu cầu đọc tin nhắn không hợp lệ: thiếu messageId hoặc userId");
            }

            messageService.readMessage(messageId, receiverId);
            webSocketService.notifyRead(messageId, senderId);
            log.info("Đã đọc tin nhắn: messageId={}, userId={}",
                    messageId, receiverId);
        } catch (Exception e) {
            log.error("Lỗi khi xử lý đọc tin nhắn: messageId={}, userId={}, error={}",
                    messageId, receiverId, e.getMessage());
            throw e;
        }
    }

    @MessageMapping("/chat.edit")
    public void editMessage(@Payload MessageRequest request) {
        String messageId = request.getId();
        String userId = request.getSenderId();
        String content = request.getContent();
        String groupId = request.getGroupId();

        log.debug("Đang xử lý yêu cầu chỉnh sửa tin nhắn: messageId={}, userId={}, content={}, groupId={}",
                messageId, userId, content, groupId);
        try {
            if (messageId == null || userId == null || content == null) {
                throw new RuntimeException("Yêu cầu chỉnh sửa tin nhắn không hợp lệ: thiếu messageId, userId hoặc content");
            }

            messageService.editMessage(messageId, userId, content);
            if (request.getGroupId() != null) {
                webSocketService.notifyGroupEdit(messageId, userId, request.getGroupId());
            } else {
                webSocketService.notifyEdit(messageId, userId, content);
            }
            log.info("Đã chỉnh sửa tin nhắn: messageId={}, userId={}, content={}",
                    messageId, userId, content);
        } catch (Exception e) {
            log.error("Lỗi khi xử lý chỉnh sửa tin nhắn: messageId={}, userId={}, error={}",
                    messageId, userId, e.getMessage());
            throw e;
        }
    }
    @MessageMapping("/chat.pin")
    public void pinMessage(@Payload MessageRequest request) {
        String messageId = request.getId();
        String userId = request.getSenderId();

        log.debug("Đang xử lý yêu cầu ghim tin nhắn: messageId={}, userId={}",
                messageId, userId);

        try {
            if (messageId == null || userId == null) {
                throw new IllegalArgumentException("Yêu cầu ghim tin nhắn không hợp lệ: thiếu messageId hoặc userId");
            }

            messageService.pinMessage(messageId, userId);
            webSocketService.notifyPin(messageId, userId);
            log.info("Đã ghim tin nhắn: messageId={}, userId={}",
                    messageId, userId);
        } catch (Exception e) {
            log.error("Lỗi khi xử lý ghim tin nhắn: messageId={}, userId={}, error={}",
                    messageId, userId, e.getMessage());
            throw e;
        }
    }

    @MessageMapping("/chat.unpin")
    public void unpinMessage(@Payload MessageRequest request) {
        String messageId = request.getId();
        String userId = request.getSenderId();

        log.debug("Đang xử lý yêu cầu bỏ ghim tin nhắn: messageId={}, userId={}",
                messageId, userId);

        try {
            if (messageId == null || userId == null) {
                throw new IllegalArgumentException("Yêu cầu bỏ ghim tin nhắn không hợp lệ: thiếu messageId hoặc userId");
            }

            messageService.unpinMessage(messageId, userId);
            webSocketService.notifyUnpin(messageId, userId);
            log.info("Đã bỏ ghim tin nhắn: messageId={}, userId={}",
                    messageId, userId);
        } catch (Exception e) {
            log.error("Lỗi khi xử lý bỏ ghim tin nhắn: messageId={}, userId={}, error={}",
                    messageId, userId, e.getMessage());
            throw e;
        }
    }
}
