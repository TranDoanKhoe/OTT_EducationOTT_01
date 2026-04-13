

package vn.edu.iuh.fit.ott_education_be.controller;


import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.edu.iuh.fit.ott_education_be.common.Roles;
import vn.edu.iuh.fit.ott_education_be.controller.request.GroupRequest;
import vn.edu.iuh.fit.ott_education_be.controller.response.GroupInviteResponse;
import vn.edu.iuh.fit.ott_education_be.controller.response.GroupResponse;
import vn.edu.iuh.fit.ott_education_be.controller.response.UserResponse;
import vn.edu.iuh.fit.ott_education_be.model.User;
import vn.edu.iuh.fit.ott_education_be.service.GroupService;
import vn.edu.iuh.fit.ott_education_be.service.UserService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/group")
@Slf4j(topic = "GROUP-CONTROLLER")
public class GroupController {
    private final GroupService groupService;
    private final UserService userService;

    @PostMapping
    @Operation(summary = "Tạo nhóm mới", description = "Tạo một nhóm mới với tên và danh sách thành viên được chỉ định.")
    public ResponseEntity<GroupResponse> createGroup(@RequestBody GroupRequest groupRequest) {
        log.info("Creating group with name: {}", groupRequest.getName());
        return new ResponseEntity<>(groupService.createGroup(groupRequest), HttpStatus.CREATED);
    }

    @PostMapping("/{groupId}/members")
    @Operation(summary = "Thêm thành viên vào nhóm", description = "Thêm các thành viên vào nhóm với ID được chỉ định.")
    public ResponseEntity<GroupResponse> addMember(@PathVariable String groupId, @RequestBody List<String> userIds) {
        log.info("Adding user {} to group: {}", userIds, groupId);
        return new ResponseEntity<>(groupService.addMember(groupId, userIds), HttpStatus.OK);
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    @Operation(summary = "Xóa thành viên khỏi nhóm", description = "Xóa một thành viên ra khỏi nhóm với ID được chỉ định.")
    public ResponseEntity<GroupResponse> removeMember(@PathVariable String groupId, @PathVariable String userId) {
        log.info("Removing user {} from group: {}", userId, groupId);
        return new ResponseEntity<>(groupService.removeMember(groupId, userId), HttpStatus.OK);
    }

    @DeleteMapping("/{groupId}")
    @Operation(summary = "Giải tán nhóm", description = "Giải tán nhóm với ID được chỉ định.")
    public ResponseEntity<Void> dissolveGroup(@PathVariable String groupId) {
        log.info("Dissolving group: {}", groupId);
        groupService.dissolveGroup(groupId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PutMapping("/{groupId}/roles/{userId}")
    @Operation(summary = "Phân quyền cho thành viên trong nhóm", description = "Phân quyền cho một thành viên trong nhóm với ID được chỉ định.")
    public ResponseEntity<GroupResponse> assignRole(@PathVariable String groupId, @PathVariable String userId, @RequestParam Roles role) {
        log.info("Assigning role {} to user {} in group: {}", role, userId, groupId);
        return new ResponseEntity<>(groupService.assignRole(groupId, userId, role), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Lấy danh sách nhóm theo ID người dùng", description = "Lấy tất cả các nhóm mà người dùng với ID được chỉ định là thành viên.")
    public ResponseEntity<List<GroupResponse>> getUserGroups(@PathVariable String userId) {
        log.info("Fetching groups for user: {}", userId);
        return new ResponseEntity<>(groupService.getGroupByUser(userId), HttpStatus.OK);
    }

    @GetMapping("/{groupId}")
    @Operation(summary = "Lấy chi tiết nhóm/lớp", description = "Lấy thông tin chi tiết nhóm/lớp theo ID.")
    public ResponseEntity<GroupResponse> getGroupById(@PathVariable String groupId) {
        log.info("Fetching group detail: {}", groupId);
        return new ResponseEntity<>(groupService.getGroupById(groupId), HttpStatus.OK);
    }

    @GetMapping("/classes")
    @Operation(summary = "Lấy danh sách lớp", description = "Lấy danh sách lớp đang hoạt động, hỗ trợ tìm kiếm theo tên.")
    public ResponseEntity<List<GroupResponse>> getAllClasses(@RequestParam(required = false) String keyword) {
        log.info("Fetching classes with keyword: {}", keyword);
        return new ResponseEntity<>(groupService.getAllClasses(keyword), HttpStatus.OK);
    }

    @PostMapping("/{groupId}/join")
    @Operation(summary = "Tham gia lớp", description = "Người dùng hiện tại tham gia lớp theo ID lớp.")
    public ResponseEntity<GroupResponse> joinGroup(@PathVariable String groupId) {
        log.info("Joining group/class: {}", groupId);
        return new ResponseEntity<>(groupService.joinGroup(groupId), HttpStatus.OK);
    }

    @PostMapping("/join-by-code/{classCode}")
    @Operation(summary = "Tham gia lớp bằng mã lớp", description = "Người dùng hiện tại tham gia lớp bằng mã lớp dạng CLS-XXXXXX.")
    public ResponseEntity<GroupResponse> joinGroupByCode(@PathVariable String classCode) {
        log.info("Joining class by code: {}", classCode);
        return new ResponseEntity<>(groupService.joinGroupByCode(classCode), HttpStatus.OK);
    }

    @GetMapping("/{groupId}/members")
    @Operation(summary = "Lấy danh sách thành viên trong nhóm", description = "Lấy tất cả thành viên của nhóm với ID được chỉ định.")
    public ResponseEntity<List<UserResponse>> getUserInGroup(@PathVariable String groupId) {
        log.info("Fetching members of group: {}", groupId);
        GroupResponse groupResponse = groupService.getUserInGroup(groupId);
        List<UserResponse> user = userService.findUsersByIds(groupResponse.getMemberIds());
        return new ResponseEntity<>(user, HttpStatus.OK);
    }

    @PutMapping("/{groupId}")
    @Operation(summary = "Cập nhật thông tin nhóm", description = "Cập nhật tên nhóm và/hoặc ảnh đại diện.")
    public ResponseEntity<GroupResponse> updateGroup(
            @PathVariable String groupId,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) MultipartFile avatarGroup) {
        log.info("Updating group: {} with name: {}", groupId, name);
        GroupRequest request = new GroupRequest();
        request.setName(name);
        return new ResponseEntity<>(groupService.updateGroup(groupId, request, avatarGroup), HttpStatus.OK);
    }

    // ==================== GROUP INVITE ENDPOINTS ====================
    
    @PostMapping("/{groupId}/invite")
    @Operation(summary = "Gửi lời mời tham gia nhóm", description = "Gửi lời mời cho người dùng để tham gia nhóm.")
    public ResponseEntity<List<GroupInviteResponse>> sendGroupInvites(
            @PathVariable String groupId,
            @RequestBody List<String> inviteeIds) {
        log.info("Sending group invites for group: {} to users: {}", groupId, inviteeIds);
        return new ResponseEntity<>(groupService.sendGroupInvites(groupId, inviteeIds), HttpStatus.OK);
    }
    
    @PostMapping("/invites/{inviteId}/accept")
    @Operation(summary = "Chấp nhận lời mời tham gia nhóm", description = "Chấp nhận lời mời để tham gia nhóm.")
    public ResponseEntity<GroupInviteResponse> acceptGroupInvite(@PathVariable String inviteId) {
        log.info("Accepting group invite: {}", inviteId);
        return new ResponseEntity<>(groupService.acceptGroupInvite(inviteId), HttpStatus.OK);
    }
    
    @PostMapping("/invites/{inviteId}/reject")
    @Operation(summary = "Từ chối lời mời tham gia nhóm", description = "Từ chối lời mời để tham gia nhóm.")
    public ResponseEntity<GroupInviteResponse> rejectGroupInvite(@PathVariable String inviteId) {
        log.info("Rejecting group invite: {}", inviteId);
        return new ResponseEntity<>(groupService.rejectGroupInvite(inviteId), HttpStatus.OK);
    }
    
    @GetMapping("/invites/pending")
    @Operation(summary = "Lấy danh sách lời mời nhóm đang chờ", description = "Lấy tất cả lời mời tham gia nhóm đang chờ xử lý của người dùng hiện tại.")
    public ResponseEntity<List<GroupInviteResponse>> getPendingGroupInvites() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();
        log.info("Fetching pending group invites for user: {}", user.getId());
        return new ResponseEntity<>(groupService.getPendingGroupInvites(user.getId()), HttpStatus.OK);
    }
}

