package vn.edu.iuh.fit.ott_education_be.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.iuh.fit.ott_education_be.controller.request.AiChatRequest;
import vn.edu.iuh.fit.ott_education_be.controller.response.AiChatResponse;
import vn.edu.iuh.fit.ott_education_be.service.AiChatService;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import vn.edu.iuh.fit.ott_education_be.model.AiConversation;
import vn.edu.iuh.fit.ott_education_be.model.User;
import vn.edu.iuh.fit.ott_education_be.repository.AiConversationRepository;
import vn.edu.iuh.fit.ott_education_be.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequiredArgsConstructor
@Slf4j(topic = "AI-CONTROLLER")
@RequestMapping("/ai")
public class AiController {

    private final AiChatService aiChatService;
    private final ObjectMapper objectMapper;
    private final AiConversationRepository aiConversationRepository;
    private final UserRepository userRepository;

    @PostMapping("/chat")
    public ResponseEntity<AiChatResponse> chat(@RequestBody AiChatRequest request) {
        String message = request != null ? request.getMessage() : "";
        var history = request != null ? request.getHistory() : null;

        log.info("AI chat request received");
        AiChatResponse response = aiChatService.ask(message, history);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/chat-with-files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AiChatResponse> chatWithFiles(
            @RequestPart(value = "message", required = false) String message,
            @RequestPart(value = "history", required = false) String historyJson,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {
        List<Map<String, String>> history = parseHistory(historyJson);
        List<MultipartFile> safeFiles = files == null ? Collections.emptyList() : files;

        log.info("AI chat request with attachments received, files={}", safeFiles.size());
        AiChatResponse response = aiChatService.ask(message, history, safeFiles);
        return ResponseEntity.ok(response);
    }

    private List<Map<String, String>> parseHistory(String historyJson) {
        if (historyJson == null || historyJson.isBlank()) {
            return Collections.emptyList();
        }

        try {
            return objectMapper.readValue(
                    historyJson,
                    new TypeReference<List<Map<String, String>>>() {
                    }
            );
        } catch (Exception ex) {
            log.warn("Failed to parse AI history JSON: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<Map<String, Object>>> getConversations(Authentication authentication) {
        String userId = resolveCurrentUserId(authentication);
        List<AiConversation> conversations = aiConversationRepository.findByUserIdOrderByUpdatedAtDesc(userId);

        List<Map<String, Object>> summaries = conversations.stream().map(conv -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", conv.getId());
            item.put("title", conv.getTitle());
            item.put("updatedAt", conv.getUpdatedAt());
            item.put("createdAt", conv.getCreatedAt());
            item.put("messageCount", conv.getMessages() == null ? 0 : conv.getMessages().size());
            item.put("lastMessage", extractLastMessagePreview(conv.getMessages()));
            return item;
        }).toList();

        return ResponseEntity.ok(summaries);
    }

    @PostMapping("/conversations")
    public ResponseEntity<Map<String, Object>> createConversation(
            Authentication authentication,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        String userId = resolveCurrentUserId(authentication);
        String requestedTitle = payload == null ? null : String.valueOf(payload.getOrDefault("title", "")).trim();
        String title = requestedTitle == null || requestedTitle.isBlank()
                ? "Cuộc trò chuyện mới"
                : requestedTitle;

        LocalDateTime now = LocalDateTime.now();
        AiConversation conversation = AiConversation.builder()
                .userId(userId)
                .title(title)
                .messages(new ArrayList<>())
                .createdAt(now)
                .updatedAt(now)
                .build();

        AiConversation saved = aiConversationRepository.save(conversation);
        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "title", saved.getTitle(),
                "createdAt", saved.getCreatedAt(),
                "updatedAt", saved.getUpdatedAt(),
                "messageCount", 0,
                "lastMessage", ""
        ));
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<Map<String, Object>> getConversationMessages(
            Authentication authentication,
            @PathVariable String conversationId
    ) {
        String userId = resolveCurrentUserId(authentication);
        AiConversation conversation = aiConversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hội thoại AI"));

        return ResponseEntity.ok(Map.of(
                "id", conversation.getId(),
                "title", conversation.getTitle(),
                "messages", conversation.getMessages() == null ? Collections.emptyList() : conversation.getMessages(),
                "createdAt", conversation.getCreatedAt(),
                "updatedAt", conversation.getUpdatedAt()
        ));
    }

    @PutMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<Map<String, Object>> saveConversationMessages(
            Authentication authentication,
            @PathVariable String conversationId,
            @RequestBody Map<String, Object> payload
    ) {
        String userId = resolveCurrentUserId(authentication);
        AiConversation conversation = aiConversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hội thoại AI"));

        Object messagesRaw = payload == null ? null : payload.get("messages");
        List<Map<String, Object>> messages = normalizeMessages(messagesRaw);

        String title = payload == null ? null : String.valueOf(payload.getOrDefault("title", "")).trim();
        if (title != null && !title.isBlank()) {
            conversation.setTitle(title);
        }

        conversation.setMessages(messages);
        conversation.setUpdatedAt(LocalDateTime.now());
        AiConversation saved = aiConversationRepository.save(conversation);

        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "title", saved.getTitle(),
                "updatedAt", saved.getUpdatedAt(),
                "messageCount", saved.getMessages() == null ? 0 : saved.getMessages().size(),
                "lastMessage", extractLastMessagePreview(saved.getMessages())
        ));
    }

    @DeleteMapping("/conversations/{conversationId}")
    public ResponseEntity<Void> deleteConversation(
            Authentication authentication,
            @PathVariable String conversationId
    ) {
        String userId = resolveCurrentUserId(authentication);
        aiConversationRepository.deleteByIdAndUserId(conversationId, userId);
        return ResponseEntity.noContent().build();
    }

    private String resolveCurrentUserId(Authentication authentication) {
        String principal = authentication == null ? null : authentication.getName();
        if (principal == null || principal.isBlank()) {
            throw new IllegalArgumentException("Không xác định người dùng hiện tại");
        }

        User user = Optional.ofNullable(userRepository.findByUsername(principal))
                .orElseGet(() -> userRepository.findByEmail(principal));

        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("Không tìm thấy thông tin người dùng");
        }

        return user.getId();
    }

    private List<Map<String, Object>> normalizeMessages(Object messagesRaw) {
        if (!(messagesRaw instanceof List<?> listRaw)) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> normalized = new ArrayList<>();
        for (Object item : listRaw) {
            if (item instanceof Map<?, ?> mapRaw) {
                Map<String, Object> casted = new LinkedHashMap<>();
                mapRaw.forEach((k, v) -> casted.put(String.valueOf(k), v));
                normalized.add(casted);
            }
        }
        return normalized;
    }

    private String extractLastMessagePreview(List<Map<String, Object>> messages) {
        if (messages == null || messages.isEmpty()) {
            return "";
        }

        Map<String, Object> last = messages.get(messages.size() - 1);
        Object typeObj = last.get("type");
        String type = typeObj == null ? "TEXT" : String.valueOf(typeObj).toUpperCase();
        String content = String.valueOf(last.getOrDefault("content", ""));

        return switch (type) {
            case "IMAGE" -> "[Hình ảnh]";
            case "VIDEO" -> "[Video]";
            case "AUDIO" -> "[Âm thanh]";
            case "FILE" -> "[Tệp đính kèm]";
            default -> content.length() > 120 ? content.substring(0, 120) : content;
        };
    }
}
