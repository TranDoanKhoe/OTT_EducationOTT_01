package vn.edu.iuh.fit.ott_education_be.controller.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import vn.edu.iuh.fit.ott_education_be.common.InviteStatus;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
public class GroupInviteResponse {
    private String id;
    private String inviteId; // Alias cho frontend
    private String groupId;
    private String groupName;
    private String groupAvatar;
    private String inviterId;
    private String inviterName;
    private String inviterAvatar;
    private String inviteeId;
    private InviteStatus status;
    private LocalDateTime createdAt;
}
