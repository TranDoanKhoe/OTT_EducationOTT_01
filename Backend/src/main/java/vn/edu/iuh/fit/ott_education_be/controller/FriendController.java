
package vn.edu.iuh.fit.ott_education_be.controller;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.edu.iuh.fit.ott_education_be.controller.response.FriendResponse;
import vn.edu.iuh.fit.ott_education_be.model.Friend;
import vn.edu.iuh.fit.ott_education_be.service.FriendService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/friend")
@Slf4j(topic = "FRIEND-CONTROLLER")
public class FriendController {
    private final FriendService friendService;

    @PostMapping("/send-request/{phone}")
    @Operation(summary = "Gửi lời mời kết bạn", description = "Gửi lời mời kết bạn đến người dùng khác")
    public ResponseEntity<Map<String, String>> sendFriendRequest(@PathVariable String phone) {
        log.info("Sending friend request to {}", phone);
        if (phone == null || phone.isEmpty()) {
            log.info("phone is null or empty");
            return ResponseEntity.badRequest().body(Map.of("message", "Số điện thoại không được để trống"));
        }
        friendService.sendFriendRequest(phone);
        return ResponseEntity.ok(Map.of("message", "Đã gửi lời mời kết bạn"));
    }

    @GetMapping("/requests/pending")
    @Operation(summary = "Lấy danh sách lời mời kết bạn đang chờ", description = "Lấy tất cả lời mời kết bạn đang chờ xử lý của người dùng hiện tại")
    public ResponseEntity<List<vn.edu.iuh.fit.ott_education_be.controller.response.FriendRequestResponse>> getPendingFriendRequests() {
        log.info("Fetching pending friend requests");
        return ResponseEntity.status(HttpStatus.OK).body(friendService.getPendingFriendRequests());
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách bạn bè", description = "Lấy danh sách tất cả bạn bè của người dùng hiện tại")
    public ResponseEntity<List<FriendResponse>> getFriends() {
        log.info("Fetching friends list");
        return ResponseEntity.status(HttpStatus.OK).body(friendService.getAllFriends());
    }

    @PostMapping("/request/{requestId}/accept")
    @Operation(summary = "Chấp nhận lời mời kết bạn", description = "Chấp nhận một lời mời kết bạn")
    public ResponseEntity<Map<String, String>> acceptFriendRequest(@PathVariable String requestId) {
        log.info("Accepting friend request with ID {}", requestId);
        friendService.acceptFriendRequest(requestId);
        return ResponseEntity.ok(Map.of("message", "Đã chấp nhận lời mời kết bạn"));
    }

    @PostMapping("/request/{requestId}/cancel")
    @Operation(summary = "Hủy lời mời kết bạn", description = "Hủy một lời mời kết bạn đã gửi")
    public ResponseEntity<Map<String, String>> cancelFriendRequest(@PathVariable String requestId) {
        log.info("Canceling friend request with ID {}", requestId);
        friendService.cancelFriendRequest(requestId);
        return ResponseEntity.ok(Map.of("message", "Đã hủy lời mời kết bạn"));
    }

    @DeleteMapping("/{friendId}")
    @Operation(summary = "Xóa bạn bè", description = "Xóa một người bạn khỏi danh sách bạn bè")
    public ResponseEntity<Map<String, String>> deleteFriend(@PathVariable String friendId) {
        log.info("Deleting friend with ID {}", friendId);
        friendService.deleteFriend(friendId);
        return ResponseEntity.ok(Map.of("message", "Đã xóa bạn bè"));
    }

    @PostMapping("/block/{blockedUserId}")
    @Operation(summary = "Chặn người dùng", description = "Chặn một người dùng")
    public ResponseEntity<Map<String, String>> blockUser(@PathVariable String blockedUserId) {
        log.info("Blocking user with ID {}", blockedUserId);
        friendService.blockUser(blockedUserId);
        return ResponseEntity.ok(Map.of("message", "Đã chặn người dùng"));
    }

    @PostMapping("/unblock/{blockedUserId}")
    @Operation(summary = "Bỏ chặn người dùng", description = "Bỏ chặn một người dùng")
    public ResponseEntity<Map<String, String>> unblockUser(@PathVariable String blockedUserId) {
        log.info("Unblocking user with ID {}", blockedUserId);
        friendService.unblockUser(blockedUserId);
        return ResponseEntity.ok(Map.of("message", "Đã bỏ chặn người dùng"));
    }

    @GetMapping("/{friendId}")
    @Operation(summary = "Lấy thông tin bạn bè theo ID", description = "Lấy thông tin chi tiết của một người bạn theo ID của họ")
    public ResponseEntity<FriendResponse> getFriendById(@PathVariable String friendId) {
        log.info("Fetching friend with ID {}", friendId);
        FriendResponse friend = friendService.getFriendById(friendId);
        return ResponseEntity.ok(friend);
    }
}
