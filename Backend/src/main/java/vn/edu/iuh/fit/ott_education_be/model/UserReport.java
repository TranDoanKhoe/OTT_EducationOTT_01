package vn.edu.iuh.fit.ott_education_be.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "user_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserReport {
    @Id
    private String id;

    private String reportedUserId;
    private String reporterId;
    private String reason;
    private LocalDateTime createdAt;
}
