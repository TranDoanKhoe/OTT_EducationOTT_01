package vn.edu.iuh.fit.ott_education_be.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.iuh.fit.ott_education_be.common.InviteStatus;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Document("group_invites")
public class GroupInvite {
    @Id
    private String id;

    private String groupId;

    private String inviterId; // Người gửi lời mời

    private String inviteeId; // Người nhận lời mời

    private InviteStatus status; // PENDING, ACCEPTED, REJECTED

    @CreatedDate
    private LocalDateTime createdAt;

    public GroupInvite(String groupId, String inviterId, String inviteeId, InviteStatus status) {
        this.groupId = groupId;
        this.inviterId = inviterId;
        this.inviteeId = inviteeId;
        this.status = status;
    }
}
