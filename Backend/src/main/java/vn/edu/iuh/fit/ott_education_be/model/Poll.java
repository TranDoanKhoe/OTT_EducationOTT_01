package vn.edu.iuh.fit.ott_education_be.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "polls")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Poll {
    @Id
    private String id;

    private String groupId;
    private String question;
    private List<String> options;
    private List<List<String>> votes; // Array of arrays: [[userId1, userId2], [userId3], ...]
    private Boolean allowMultiple;
    private String createdBy;
    private LocalDateTime createdAt;

    public void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (votes == null) {
            votes = new ArrayList<>();
            // Initialize votes array with empty arrays for each option
            if (options != null) {
                for (int i = 0; i < options.size(); i++) {
                    votes.add(new ArrayList<>());
                }
            }
        }
    }
}
