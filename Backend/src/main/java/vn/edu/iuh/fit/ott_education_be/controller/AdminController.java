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

    /**
     * Export thống kê ra CSV
     */
    @GetMapping("/statistics/export")
    public ResponseEntity<byte[]> exportStatistics(
            @RequestParam(defaultValue = "users") String type) {
        try {
            StringBuilder csv = new StringBuilder();

            if ("users".equals(type)) {
                csv.append("ID,Email,Username,Phone,Role,Status,Created At\n");
                List<User> users = userRepository.findAll();
                for (User user : users) {
                    csv.append(String.format("%s,%s,%s,%s,%s,%s,%s\n",
                            user.getId(),
                            user.getEmail() != null ? user.getEmail() : "",
                            user.getUsername() != null ? user.getUsername() : "",
                            user.getPhone() != null ? user.getPhone() : "",
                            user.getRole() != null ? user.getRole().name() : "STUDENT",
                            user.getStatus() != null ? user.getStatus().name() : "ACTIVE",
                            user.getCreatedAt() != null ? user.getCreatedAt().toString() : ""
                    ));
                }
            } else if ("groups".equals(type)) {
                csv.append("ID,Group Name,Members Count,Created At\n");
                List<Group> groups = groupRepository.findAll();
                for (Group group : groups) {
                    csv.append(String.format("%s,%s,%d,%s\n",
                            group.getId(),
                            group.getName() != null ? group.getName().replace(",", ";") : "",
                            group.getMemberIds() != null ? group.getMemberIds().size() : 0,
                            group.getCreateAt() != null ? group.getCreateAt().toString() : ""
                    ));
                }
            } else if ("messages".equals(type)) {
                csv.append("Total Messages,Messages Today,Messages This Week,Messages This Month\n");
                long total = messageRepository.count();
                LocalDateTime today = LocalDate.now().atStartOfDay();
                LocalDateTime weekAgo = LocalDateTime.now().minusWeeks(1);
                LocalDateTime monthAgo = LocalDateTime.now().minusMonths(1);
                csv.append(String.format("%d,%d,%d,%d\n",
                        total,
                        messageRepository.countByCreatedAtAfter(today),
                        messageRepository.countByCreatedAtAfter(weekAgo),
                        messageRepository.countByCreatedAtAfter(monthAgo)
                ));
            }

            byte[] csvBytes = csv.toString().getBytes("UTF-8");
            String filename = String.format("export_%s_%s.csv", type,
                    LocalDate.now().format(DateTimeFormatter.ISO_DATE));

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .body(csvBytes);
        } catch (Exception e) {
            log.error("Error exporting statistics: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    // ==================== USER MANAGEMENT ====================

    /**
     * Lấy danh sách users với phân trang và filter
     */
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

            Page<User> usersPage;
            
            if (search != null && !search.isEmpty()) {
                usersPage = userRepository.findByEmailContainingIgnoreCaseOrUsernameContainingIgnoreCase(
                        search, search, pageable);
            } else if (role != null && !role.isEmpty()) {
                UserRole userRole = UserRole.valueOf(role.toUpperCase());
                usersPage = userRepository.findByRole(userRole, pageable);
            } else if (status != null && !status.isEmpty()) {
                UserStatus userStatus = UserStatus.valueOf(status.toUpperCase());
                usersPage = userRepository.findByStatus(userStatus, pageable);
            } else {
                usersPage = userRepository.findAll(pageable);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("users", usersPage.getContent().stream()
                    .map(this::mapUserToResponse)
                    .collect(Collectors.toList()));
            response.put("currentPage", usersPage.getNumber());
            response.put("totalItems", usersPage.getTotalElements());
            response.put("totalPages", usersPage.getTotalPages());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting users: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Lấy thông tin chi tiết một user
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUserById(@PathVariable String userId) {
        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.notFound().build();
            }

            Map<String, Object> userInfo = mapUserToResponse(user);

            // Thêm thống kê của user
            long messageCount = messageRepository.countBySenderId(userId);
            userInfo.put("messageCount", messageCount);

            // Đếm số groups user tham gia
            long groupCount = groupRepository.countByMemberIdsContaining(userId);
            userInfo.put("groupCount", groupCount);

            return ResponseEntity.ok(userInfo);
        } catch (Exception e) {
            log.error("Error getting user: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Cập nhật role của user
     */
    @PutMapping("/users/{userId}/role")
    public ResponseEntity<?> updateUserRole(
            @PathVariable String userId,
            @RequestBody Map<String, String> request) {
        try {
            String newRole = request.get("role");
            if (newRole == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Role is required"));
            }

            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.notFound().build();
            }

            UserRole role = UserRole.valueOf(newRole.toUpperCase());
            user.setRole(role);
            userRepository.save(user);

            log.info("Updated role for user {} to {}", userId, role);
            return ResponseEntity.ok(Map.of(
                    "message", "Role updated successfully",
                    "user", mapUserToResponse(user)
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role. Must be ADMIN, TEACHER, or STUDENT"));
        } catch (Exception e) {
            log.error("Error updating user role: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Cập nhật status (khóa/mở khóa) user
     */
    @PutMapping("/users/{userId}/status")
    public ResponseEntity<?> updateUserStatus(
            @PathVariable String userId,
            @RequestBody Map<String, String> request) {
        try {
            String newStatus = request.get("status");
            if (newStatus == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Status is required"));
            }

            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Không cho phép block admin
            if (user.getRole() == UserRole.ADMIN && "BLOCKED".equalsIgnoreCase(newStatus)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot block admin user"));
            }

            UserStatus status = UserStatus.valueOf(newStatus.toUpperCase());
            user.setStatus(status);
            userRepository.save(user);

            log.info("Updated status for user {} to {}", userId, status);
            return ResponseEntity.ok(Map.of(
                    "message", status == UserStatus.ACTIVE ? "User unblocked successfully" : "User blocked successfully",
                    "user", mapUserToResponse(user)
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status. Must be ACTIVE or BLOCKED"));
        } catch (Exception e) {
            log.error("Error updating user status: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Reset password cho user
     */
    @PutMapping("/users/{userId}/reset-password")
    public ResponseEntity<?> resetUserPassword(
            @PathVariable String userId,
            @RequestBody Map<String, String> request) {
        try {
            String newPassword = request.get("newPassword");
            if (newPassword == null || newPassword.length() < 8) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Password must be at least 8 characters"
                ));
            }

            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.notFound().build();
            }

            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);

            log.info("Password reset for user {}", userId);
            return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
        } catch (Exception e) {
            log.error("Error resetting password: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Xóa user
     */
    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable String userId) {
        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Không cho phép xóa admin
            if (user.getRole() == UserRole.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot delete admin user"));
            }

            userRepository.deleteById(userId);
            log.info("Deleted user {}", userId);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        } catch (Exception e) {
            log.error("Error deleting user: {}", e.getMessage());
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
