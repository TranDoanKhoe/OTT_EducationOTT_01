package vn.edu.iuh.fit.ott_education_be.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.edu.iuh.fit.ott_education_be.controller.response.AiChatResponse;
import vn.edu.iuh.fit.ott_education_be.service.AiChatService;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@Slf4j(topic = "AI-CHAT-SERVICE")
public class AiChatServiceImpl implements AiChatService {

    private static final int MAX_ATTACHMENTS = 4;
    private static final long MAX_ATTACHMENT_BYTES = 5L * 1024L * 1024L;
    private static final int MAX_ATTACHMENT_TEXT_CHARS = 8000;

    @Value("${app.ai.gemini.api-key:}")
    private String geminiApiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public AiChatResponse ask(String message, List<Map<String, String>> history) {
        return ask(message, history, Collections.emptyList());
    }

    @Override
    public AiChatResponse ask(String message, List<Map<String, String>> history, List<MultipartFile> files) {
        String cleanedMessage = message == null ? "" : message.trim();
        AttachmentContext attachmentContext = buildAttachmentContext(files);

        if (cleanedMessage.isEmpty() && attachmentContext.summaryText.isBlank()) {
            return AiChatResponse.builder()
                    .reply("Bạn hãy nhập câu hỏi hoặc đính kèm file/ảnh để mình hỗ trợ nhé.")
                    .provider("simulation")
                    .diagnostic(null)
                    .build();
        }

        String diagnostic = null;

        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            try {
                String geminiReply = askGemini(cleanedMessage, history, attachmentContext);
                if (geminiReply != null && !geminiReply.isBlank()) {
                    return AiChatResponse.builder()
                            .reply(geminiReply.trim())
                            .provider("gemini")
                            .diagnostic(null)
                            .build();
                }
            } catch (Exception ex) {
                log.warn("Gemini call failed, fallback to simulation: {}", ex.getMessage());
                diagnostic = mapDiagnostic(ex.getMessage());
            }
        } else {
            diagnostic = "Chưa cấu hình GEMINI_API_KEY nên hệ thống chạy ở chế độ mô phỏng.";
        }

        if (!attachmentContext.summaryText.isBlank()) {
            String fileAwareReply = "Mình đã nhận " + attachmentContext.receivedLabel + ". "
                + "Hiện hệ thống đang ở chế độ mô phỏng nên chưa phân tích sâu nội dung tệp như Gemini, "
                + "nhưng bạn có thể hỏi rõ mục tiêu để mình hỗ trợ theo ngữ cảnh này.";
            return AiChatResponse.builder()
                .reply(fileAwareReply)
                .provider("simulation")
                .diagnostic(diagnostic)
                .build();
        }

        return AiChatResponse.builder()
                .reply(simulateReply(cleanedMessage))
                .provider("simulation")
                .diagnostic(diagnostic)
                .build();
    }

    private String mapDiagnostic(String rawError) {
        String msg = rawError == null ? "" : rawError;
        String upper = msg.toUpperCase();

        if (upper.contains("CONSUMER_SUSPENDED")) {
            return "Gemini API key đang bị Google tạm khóa (CONSUMER_SUSPENDED).";
        }
        if (upper.contains("PERMISSION_DENIED")) {
            return "Gemini API bị từ chối quyền truy cập (PERMISSION_DENIED).";
        }
        if (upper.contains("API_KEY_INVALID") || upper.contains("API KEY NOT VALID")) {
            return "Gemini API key không hợp lệ.";
        }
        if (upper.contains("QUOTA") || upper.contains("RESOURCE_EXHAUSTED")) {
            return "Gemini API đã hết quota hoặc vượt giới hạn tần suất.";
        }

        return "Không gọi được Gemini API, hệ thống chuyển sang chế độ mô phỏng.";
    }

    private String askGemini(String message, List<Map<String, String>> history, AttachmentContext attachmentContext) throws Exception {
        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("Bạn là trợ lý học tập trong OTT Education. Trả lời ngắn gọn, thân thiện, bằng tiếng Việt.\n");

        if (history != null && !history.isEmpty()) {
            promptBuilder.append("Ngữ cảnh hội thoại gần đây:\n");
            for (Map<String, String> turn : history) {
                String role = turn.getOrDefault("role", "user");
                String content = turn.getOrDefault("content", "");
                if (!content.isBlank()) {
                    promptBuilder.append(role).append(": ").append(content).append("\n");
                }
            }
        }

            if (!attachmentContext.summaryText.isBlank()) {
                promptBuilder.append("\nNgữ cảnh từ tệp đính kèm:\n")
                    .append(attachmentContext.summaryText)
                    .append("\n");
            }

        promptBuilder.append("Người dùng: ").append(message).append("\nTrợ lý:");

            List<Map<String, Object>> parts = new ArrayList<>();
            parts.add(Map.of("text", promptBuilder.toString()));
            parts.addAll(attachmentContext.inlineImageParts);

        Map<String, Object> payload = Map.of(
                "contents", List.of(
                        Map.of(
                                "role", "user",
                        "parts", parts
                        )
                ),
                "generationConfig", Map.of(
                        "temperature", 0.7,
                        "maxOutputTokens", 512
                )
        );

        String requestBody = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=" + geminiApiKey))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 300) {
            throw new RuntimeException("Gemini status " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        return textNode.isMissingNode() ? null : textNode.asText();
    }

    private String simulateReply(String message) {
        String lower = message.toLowerCase();

        if (containsAny(lower, "xin chào", "hello", "hi")) {
            return "Chào bạn. Mình là AI Assistant của OTT, mình có thể hỗ trợ học tập, gợi ý nội dung và trả lời nhanh các câu hỏi cơ bản.";
        }
        if (containsAny(lower, "toán", "dai so", "đại số", "hình học", "mất gốc")
                && containsAny(lower, "lớp", "khoa hoc", "khóa", "giảng viên", "thầy", "cô", "gợi ý")) {
            return "Mình gợi ý theo chế độ mô phỏng:\n"
                    + "- Toán cơ bản 1 (GV: Nguyễn Văn A) - dành cho người mất gốc\n"
                    + "- Ôn nền tảng Đại số (GV: Trần Thị B) - luyện từ cơ bản đến trung bình\n"
                    + "- Kỹ năng giải bài tập theo dạng (GV: Lê Minh C) - phù hợp ôn thi\n"
                    + "Nếu bạn cho mình mục tiêu điểm số và lịch rảnh, mình sẽ gợi ý lộ trình chi tiết hơn.";
        }
        if (containsAny(lower, "lịch", "rảnh", "t2", "t3", "t4", "t5", "t6", "t7", "chủ nhật")) {
            return "Mình có thể lọc lớp theo lịch rảnh của bạn. Ví dụ bạn rảnh tối T2-T4-T6 thì nên ưu tiên lớp nền tảng + 1 buổi luyện đề cuối tuần. Bạn gửi thêm khung giờ cụ thể để mình đề xuất sát hơn nhé.";
        }
        if (containsAny(lower, "so sánh", "giảng viên", "thầy", "cô")) {
            return "So sánh nhanh theo chế độ mô phỏng:\n"
                    + "- GV Nguyễn Văn A: dạy chậm, chắc nền tảng\n"
                    + "- GV Trần Thị B: kỹ, nhiều bài tập tự luyện\n"
                    + "- GV Lê Minh C: tốc độ nhanh, hợp ôn thi tăng điểm\n"
                    + "Bạn muốn mình gợi ý theo kiểu học chắc nền hay tăng điểm nhanh?";
        }
        if (containsAny(lower, "cuối kỳ", "thi", "8+", "điểm")) {
            return "Lộ trình mô phỏng 8 tuần để thi cuối kỳ:\n"
                    + "- Tuần 1-3: Ôn nền tảng\n"
                    + "- Tuần 4-6: Chuyên đề trọng tâm\n"
                    + "- Tuần 7-8: Luyện đề + chữa đề\n"
                    + "Bạn cần mình chia thành checklist theo từng ngày không?";
        }
        if (containsAny(lower, "deadline", "hạn", "nộp")) {
            return "Bạn nên ghi rõ: môn học, đầu việc, và hạn nộp. Mình có thể giúp bạn tách thành checklist theo mức ưu tiên.";
        }
        if (containsAny(lower, "tài liệu", "file", "pdf")) {
            return "Bạn có thể chia sẻ tài liệu trực tiếp trong OTT. Nếu muốn, mình có thể gợi ý cách đặt tên file để dễ tìm và quản lý hơn.";
        }
        if (containsAny(lower, "nhóm", "thảo luận")) {
            return "Để thảo luận nhóm hiệu quả: chốt mục tiêu buổi họp, phân công rõ người phụ trách, và tổng kết action items cuối buổi.";
        }

        return "Mình đã nhận câu hỏi của bạn. Hiện hệ thống đang ở chế độ AI mô phỏng nên phản hồi mang tính gợi ý. Bạn có thể hỏi cụ thể hơn để mình hỗ trợ chính xác hơn nhé.";
    }

    private boolean containsAny(String source, String... keywords) {
        if (source == null || source.isBlank() || keywords == null) {
            return false;
        }
        for (String keyword : keywords) {
            if (keyword != null && !keyword.isBlank() && source.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private AttachmentContext buildAttachmentContext(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return AttachmentContext.empty();
        }

        StringBuilder summary = new StringBuilder();
        List<Map<String, Object>> imageParts = new ArrayList<>();
        int acceptedCount = 0;

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            if (acceptedCount >= MAX_ATTACHMENTS) {
                break;
            }

            String fileName = file.getOriginalFilename() == null ? "unknown" : file.getOriginalFilename();
            String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();

            if (file.getSize() > MAX_ATTACHMENT_BYTES) {
                summary.append("- ").append(fileName).append(": quá lớn (>")
                        .append(MAX_ATTACHMENT_BYTES / (1024 * 1024)).append("MB), bỏ qua.\n");
                continue;
            }

            try {
                if (contentType.startsWith("image/")) {
                    String base64 = Base64.getEncoder().encodeToString(file.getBytes());
                    imageParts.add(Map.of(
                            "inlineData", Map.of(
                                    "mimeType", contentType,
                                    "data", base64
                            )
                    ));
                    summary.append("- Ảnh: ").append(fileName).append("\n");
                } else {
                    String extracted = extractText(file, contentType);
                    if (!extracted.isBlank()) {
                        summary.append("- File ").append(fileName).append(":\n")
                                .append(truncate(extracted, MAX_ATTACHMENT_TEXT_CHARS))
                                .append("\n");
                    } else {
                        summary.append("- File ").append(fileName)
                                .append(": chưa trích được nội dung văn bản, chỉ dùng metadata.\n");
                    }
                }
                acceptedCount++;
            } catch (Exception ex) {
                log.warn("Cannot process attachment {}: {}", fileName, ex.getMessage());
                summary.append("- File ").append(fileName)
                        .append(": lỗi đọc tệp, bỏ qua.\n");
            }
        }

        if (acceptedCount == 0) {
            return AttachmentContext.empty();
        }

        return new AttachmentContext(
                summary.toString().trim(),
                imageParts,
                acceptedCount + " tệp/ảnh"
        );
    }

    private String extractText(MultipartFile file, String contentType) throws Exception {
        String lowerName = file.getOriginalFilename() == null
                ? ""
                : file.getOriginalFilename().toLowerCase();
        byte[] bytes = file.getBytes();

        if (contentType.startsWith("text/")
                || lowerName.endsWith(".txt")
                || lowerName.endsWith(".md")
                || lowerName.endsWith(".csv")
                || lowerName.endsWith(".json")
                || lowerName.endsWith(".xml")) {
            return new String(bytes, StandardCharsets.UTF_8);
        }

        if ("application/pdf".equals(contentType) || lowerName.endsWith(".pdf")) {
            try (PDDocument document = PDDocument.load(bytes)) {
                return new PDFTextStripper().getText(document);
            }
        }

        if ("application/vnd.openxmlformats-officedocument.wordprocessingml.document".equals(contentType)
                || lowerName.endsWith(".docx")) {
            try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(bytes))) {
                StringBuilder builder = new StringBuilder();
                document.getParagraphs().forEach(p -> builder.append(p.getText()).append("\n"));
                return builder.toString();
            }
        }

        return "";
    }

    private String truncate(String text, int maxChars) {
        if (text == null || text.length() <= maxChars) {
            return text == null ? "" : text;
        }
        return text.substring(0, maxChars) + "\n...[đã rút gọn]";
    }

    private record AttachmentContext(String summaryText, List<Map<String, Object>> inlineImageParts, String receivedLabel) {
        private static AttachmentContext empty() {
            return new AttachmentContext("", Collections.emptyList(), "0 tệp/ảnh");
        }
    }
}
