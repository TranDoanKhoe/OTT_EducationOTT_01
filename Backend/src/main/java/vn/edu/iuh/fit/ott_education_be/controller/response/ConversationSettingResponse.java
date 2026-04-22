package vn.edu.iuh.fit.ott_education_be.controller.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ConversationSettingResponse {
    private String conversationId;
    private Boolean isHidden;
    private Boolean isPinned;
    private Boolean isMuted;
    private String muteOption;
    private String autoDeleteOption;
}
