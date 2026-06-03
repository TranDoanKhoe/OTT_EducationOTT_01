package vn.edu.iuh.fit.ott_education_be.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "group_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupReport {
    @Id
    private String id;

    private String groupId;
    private String reporterId;
    private String reason;
    private LocalDateTime createdAt;
}
