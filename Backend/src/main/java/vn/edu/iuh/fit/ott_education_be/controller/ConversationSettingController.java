package vn.edu.iuh.fit.ott_education_be.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.iuh.fit.ott_education_be.controller.request.ConversationSettingRequest;
import vn.edu.iuh.fit.ott_education_be.controller.request.GroupReportRequest;
import vn.edu.iuh.fit.ott_education_be.controller.response.ConversationSettingResponse;
import vn.edu.iuh.fit.ott_education_be.model.ConversationSetting;
import vn.edu.iuh.fit.ott_education_be.model.GroupReport;
import vn.edu.iuh.fit.ott_education_be.model.UserReport;
import vn.edu.iuh.fit.ott_education_be.model.User;
import vn.edu.iuh.fit.ott_education_be.repository.ConversationSettingRepository;
import vn.edu.iuh.fit.ott_education_be.repository.GroupReportRepository;
import vn.edu.iuh.fit.ott_education_be.repository.UserReportRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/conversation-settings")
@RequiredArgsConstructor
@Slf4j(topic = "CONVERSATION-SETTING-CONTROLLER")
public class ConversationSettingController {
    private final ConversationSettingRepository conversationSettingRepository;
    private final GroupReportRepository groupReportRepository;
    private final UserReportRepository userReportRepository;

    @GetMapping
    public ResponseEntity<List<ConversationSettingResponse>> getAll(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        List<ConversationSettingResponse> responses = conversationSettingRepository
                .findByUserId(user.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{conversationId}")
    public ResponseEntity<ConversationSettingResponse> getOne(
            @PathVariable String conversationId,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        ConversationSetting setting = conversationSettingRepository
                .findByUserIdAndConversationId(user.getId(), conversationId)
                .orElseGet(() -> ConversationSetting.builder()
                        .userId(user.getId())
                        .conversationId(conversationId)
                        .isHidden(false)
                        .isPinned(false)
                        .isMuted(false)
                        .muteOption(null)
                        .autoDeleteOption("off")
                        .updatedAt(LocalDateTime.now())
                        .build());

        return ResponseEntity.ok(toResponse(setting));
    }

    @PutMapping("/{conversationId}")
    public ResponseEntity<ConversationSettingResponse> upsert(
            @PathVariable String conversationId,
            @RequestBody ConversationSettingRequest request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        ConversationSetting setting = conversationSettingRepository
                .findByUserIdAndConversationId(user.getId(), conversationId)
                .orElseGet(() -> ConversationSetting.builder()
                        .userId(user.getId())
                        .conversationId(conversationId)
                        .build());

        if (request.getIsHidden() != null) {
            setting.setIsHidden(request.getIsHidden());
        }
        if (request.getIsPinned() != null) {
            setting.setIsPinned(request.getIsPinned());
        }
        if (request.getIsMuted() != null) {
            setting.setIsMuted(request.getIsMuted());
        }
        if (request.getMuteOption() != null) {
            setting.setMuteOption(request.getMuteOption());
        }
        if (request.getAutoDeleteOption() != null) {
            setting.setAutoDeleteOption(request.getAutoDeleteOption());
        }

        if (setting.getIsHidden() == null) {
            setting.setIsHidden(false);
        }
        if (setting.getIsPinned() == null) {
            setting.setIsPinned(false);
        }
        if (setting.getIsMuted() == null) {
            setting.setIsMuted(false);
        }
        if (setting.getAutoDeleteOption() == null) {
            setting.setAutoDeleteOption("off");
        }

        setting.setUpdatedAt(LocalDateTime.now());
        ConversationSetting saved = conversationSettingRepository.save(setting);
        return ResponseEntity.ok(toResponse(saved));
    }

    @PostMapping("/group/{groupId}/report")
    public ResponseEntity<Map<String, String>> reportGroup(
            @PathVariable String groupId,
            @RequestBody GroupReportRequest request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();

        GroupReport report = GroupReport.builder()
                .groupId(groupId)
                .reporterId(user.getId())
                .reason(request.getReason())
                .createdAt(LocalDateTime.now())
                .build();

        groupReportRepository.save(report);
        log.info("Group {} reported by {}", groupId, user.getId());

        return ResponseEntity.ok(Map.of("message", "Đã ghi nhận báo cáo"));
    }

    @PostMapping("/user/{reportedUserId}/report")
    public ResponseEntity<Map<String, String>> reportUser(
            @PathVariable String reportedUserId,
            @RequestBody GroupReportRequest request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();

        UserReport report = UserReport.builder()
                .reportedUserId(reportedUserId)
                .reporterId(user.getId())
                .reason(request.getReason())
                .createdAt(LocalDateTime.now())
                .build();

        userReportRepository.save(report);
        log.info("User {} reported by {}", reportedUserId, user.getId());

        return ResponseEntity.ok(Map.of("message", "Đã ghi nhận báo cáo"));
    }

    private ConversationSettingResponse toResponse(ConversationSetting setting) {
        return ConversationSettingResponse.builder()
                .conversationId(setting.getConversationId())
                .isHidden(Boolean.TRUE.equals(setting.getIsHidden()))
                .isPinned(Boolean.TRUE.equals(setting.getIsPinned()))
                .isMuted(Boolean.TRUE.equals(setting.getIsMuted()))
                .muteOption(setting.getMuteOption())
                .autoDeleteOption(setting.getAutoDeleteOption() == null ? "off" : setting.getAutoDeleteOption())
                .build();
    }
}
