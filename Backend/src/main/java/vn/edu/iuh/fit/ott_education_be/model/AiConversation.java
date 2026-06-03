package vn.edu.iuh.fit.ott_education_be.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "ai_conversations")
public class AiConversation {
    @Id
    private String id;

    private String userId;

    private String title;

    @Builder.Default
    private List<Map<String, Object>> messages = new ArrayList<>();

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
