package vn.edu.iuh.fit.ott_education_be.controller.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
public class AiChatResponse {
    private String reply;
    private String provider;
    private String diagnostic;
}
