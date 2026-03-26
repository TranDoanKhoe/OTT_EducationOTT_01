package vn.edu.iuh.fit.ott_education_be.controller.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ConversationSettingRequest {
    private Boolean isHidden;
    private Boolean isPinned;
    private Boolean isMuted;
    private String muteOption;
    private String autoDeleteOption;
}
