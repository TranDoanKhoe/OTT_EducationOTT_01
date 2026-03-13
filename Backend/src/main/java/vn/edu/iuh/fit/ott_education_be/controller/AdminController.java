package vn.edu.iuh.fit.ott_education_be.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import vn.edu.iuh.fit.ott_education_be.common.Roles;
import vn.edu.iuh.fit.ott_education_be.common.UserRole;
import vn.edu.iuh.fit.ott_education_be.common.UserStatus;
import vn.edu.iuh.fit.ott_education_be.model.Group;
import vn.edu.iuh.fit.ott_education_be.model.User;
import vn.edu.iuh.fit.ott_education_be.repository.GroupRepository;
import vn.edu.iuh.fit.ott_education_be.repository.MessageRepository;
import vn.edu.iuh.fit.ott_education_be.repository.UserRepository;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final MessageRepository messageRepository;
    private final PasswordEncoder passwordEncoder;

    // ==================== DASHBOARD STATISTICS ====================

    /**
     * Lấy thống kê tổng quan cho dashboard
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats() {
        try {
            Map<String, Object> stats = new HashMap<>();

            // Đếm tổng số users
            long totalUsers = userRepository.count();
            stats.put("totalUsers", totalUsers);

            // Đếm theo role
            long adminCount = userRepository.countByRole(UserRole.ADMIN);
            long teacherCount = userRepository.countByRole(UserRole.TEACHER);
            long studentCount = userRepository.countByRole(UserRole.STUDENT);
            stats.put("adminCount", adminCount);
            stats.put("teacherCount", teacherCount);
            stats.put("studentCount", studentCount);

            // Đếm users theo status
            long activeUsers = userRepository.countByStatus(UserStatus.ACTIVE);
            long blockedUsers = userRepository.countByStatus(UserStatus.BLOCKED);
            stats.put("activeUsers", activeUsers);
            stats.put("blockedUsers", blockedUsers);

            // Đếm tổng số groups
            long totalGroups = groupRepository.count();
            stats.put("totalGroups", totalGroups);

            // Đếm tổng số messages
            long totalMessages = messageRepository.count();
            stats.put("totalMessages", totalMessages);

            // Users mới trong 7 ngày qua
            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
            long newUsersThisWeek = userRepository.countByCreatedAtAfter(sevenDaysAgo);
            stats.put("newUsersThisWeek", newUsersThisWeek);

            // Messages trong 24h qua
            LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);
            long messagesLast24h = messageRepository.countByCreatedAtAfter(oneDayAgo);
            stats.put("messagesLast24h", messagesLast24h);

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error getting dashboard stats: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Lấy thống kê chi tiết với biểu đồ theo thời gian
     */
    @GetMapping("/statistics")
    public ResponseEntity<?> getDetailedStatistics(
            @RequestParam(defaultValue = "week") String period) {
        try {
            Map<String, Object> statistics = new HashMap<>();

            int days;
            switch (period) {
                case "month":
                    days = 30;
                    break;
                case "year":
                    days = 365;
                    break;
                default:
                    days = 7;
            }

            // Thống kê user mới theo ngày (giới hạn 30 ngày)
            List<Map<String, Object>> usersByDay = new ArrayList<>();
            for (int i = Math.min(days, 30) - 1; i >= 0; i--) {
                LocalDateTime dayStart = LocalDate.now().minusDays(i).atStartOfDay();
                LocalDateTime dayEnd = dayStart.plusDays(1);
                long count = userRepository.countByCreatedAtBetween(dayStart, dayEnd);
                usersByDay.add(Map.of(
                        "date", dayStart.toLocalDate().toString(),
                        "count", count
                ));
            }
            statistics.put("newUsersByDay", usersByDay);

            // Thống kê messages theo ngày
            List<Map<String, Object>> messagesByDay = new ArrayList<>();
            for (int i = Math.min(days, 30) - 1; i >= 0; i--) {
                LocalDateTime dayStart = LocalDate.now().minusDays(i).atStartOfDay();
                LocalDateTime dayEnd = dayStart.plusDays(1);
                long count = messageRepository.countByCreatedAtBetween(dayStart, dayEnd);
                messagesByDay.add(Map.of(
                        "date", dayStart.toLocalDate().toString(),
                        "count", count
                ));
            }
            statistics.put("messagesByDay", messagesByDay);

            // Thống kê groups theo ngày
            List<Map<String, Object>> groupsByDay = new ArrayList<>();
            for (int i = Math.min(days, 30) - 1; i >= 0; i--) {
                LocalDateTime dayStart = LocalDate.now().minusDays(i).atStartOfDay();
                LocalDateTime dayEnd = dayStart.plusDays(1);
                long count = groupRepository.countByCreateAtBetween(dayStart, dayEnd);
                groupsByDay.add(Map.of(
                        "date", dayStart.toLocalDate().toString(),
                        "count", count
                ));
            }
            statistics.put("groupsByDay", groupsByDay);

            // Phân bố users theo role
            Map<String, Long> roleDistribution = new HashMap<>();
            roleDistribution.put("ADMIN", userRepository.countByRole(UserRole.ADMIN));
            roleDistribution.put("TEACHER", userRepository.countByRole(UserRole.TEACHER));
            roleDistribution.put("STUDENT", userRepository.countByRole(UserRole.STUDENT));
            statistics.put("roleDistribution", roleDistribution);

            // Top 10 users hoạt động nhiều nhất (gửi nhiều messages nhất)
            List<Map<String, Object>> topActiveUsers = getTopActiveUsers(10);
            statistics.put("topActiveUsers", topActiveUsers);

            // Top 10 groups sôi động nhất
            List<Map<String, Object>> topActiveGroups = getTopActiveGroups(10);
            statistics.put("topActiveGroups", topActiveGroups);

            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("Error getting detailed statistics: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }











    private Map<String, Object> mapGroupToResponse(Group group) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", group.getId());
        map.put("name", group.getName());
        map.put("avatar", group.getAvatarGroup());
        map.put("memberCount", group.getMemberIds() != null ? group.getMemberIds().size() : 0);
        map.put("createdAt", group.getCreateAt());
        map.put("memberIds", group.getMemberIds());
        map.put("createId", group.getCreateId());
        map.put("isActive", group.isActive());
        return map;
    }

    private List<Map<String, Object>> getTopActiveUsers(int limit) {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (User user : users) {
            long count = messageRepository.countBySenderId(user.getId());
            if (count > 0) {
                Map<String, Object> userStats = new HashMap<>();
                userStats.put("id", user.getId());
                userStats.put("email", user.getEmail());
                userStats.put("username", user.getUsername());
                userStats.put("firstName", user.getFirstName());
                userStats.put("lastName", user.getLastName());
                userStats.put("avatar", user.getAvatar());
                userStats.put("messageCount", count);
                result.add(userStats);
            }
        }

        result.sort((a, b) -> Long.compare(
                (Long) b.get("messageCount"),
                (Long) a.get("messageCount")
        ));

        return result.stream().limit(limit).collect(Collectors.toList());
    }

    private List<Map<String, Object>> getTopActiveGroups(int limit) {
        List<Group> groups = groupRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Group group : groups) {
            long count = messageRepository.countByGroupId(group.getId());
            Map<String, Object> groupStats = new HashMap<>();
            groupStats.put("id", group.getId());
            groupStats.put("name", group.getName());
            groupStats.put("avatar", group.getAvatarGroup());
            groupStats.put("memberCount", group.getMemberIds() != null ? group.getMemberIds().size() : 0);
            groupStats.put("messageCount", count);
            result.add(groupStats);
        }

        result.sort((a, b) -> Long.compare(
                (Long) b.get("messageCount"),
                (Long) a.get("messageCount")
        ));

        return result.stream().limit(limit).collect(Collectors.toList());
    }
}
