package vn.edu.iuh.fit.ott_education_be.service;

import vn.edu.iuh.fit.ott_education_be.controller.response.AiChatResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface AiChatService {
    AiChatResponse ask(String message, List<Map<String, String>> history);

    AiChatResponse ask(String message, List<Map<String, String>> history, List<MultipartFile> files);
}
