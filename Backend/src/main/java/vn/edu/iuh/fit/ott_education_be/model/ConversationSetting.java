package vn.edu.iuh.fit.ott_education_be.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "conversation_settings")
@CompoundIndexes({
        @CompoundIndex(name = "user_conversation_unique_idx", def = "{'userId': 1, 'conversationId': 1}", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationSetting {
    @Id
    private String id;

    private String userId;
    private String conversationId;
    private Boolean isHidden;
    private Boolean isPinned;
    private Boolean isMuted;
    private String muteOption;
    private String autoDeleteOption;
    private LocalDateTime updatedAt;
}
