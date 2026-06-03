

package vn.edu.iuh.fit.ott_education_be.service.impl;


import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.edu.iuh.fit.ott_education_be.common.GroupType;
import vn.edu.iuh.fit.ott_education_be.common.InviteStatus;
import vn.edu.iuh.fit.ott_education_be.common.Roles;
import vn.edu.iuh.fit.ott_education_be.common.UserRole;
import vn.edu.iuh.fit.ott_education_be.controller.request.GroupRequest;
import vn.edu.iuh.fit.ott_education_be.controller.response.GroupInviteResponse;
import vn.edu.iuh.fit.ott_education_be.controller.response.GroupResponse;
import vn.edu.iuh.fit.ott_education_be.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.ott_education_be.model.Group;
import vn.edu.iuh.fit.ott_education_be.model.GroupInvite;
import vn.edu.iuh.fit.ott_education_be.model.User;
import vn.edu.iuh.fit.ott_education_be.repository.GroupInviteRepository;
import vn.edu.iuh.fit.ott_education_be.repository.GroupRepository;
import vn.edu.iuh.fit.ott_education_be.repository.UserRepository;
import vn.edu.iuh.fit.ott_education_be.service.GroupService;
import vn.edu.iuh.fit.ott_education_be.service.WebSocketService;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "GROUP-SERVICE")
public class GroupServiceImpl implements GroupService {
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final GroupInviteRepository groupInviteRepository;
    private final WebSocketService webSocketService;
    private final Cloudinary cloudinary;

    @Override
    public GroupResponse createGroup(GroupRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = (User) authentication.getPrincipal();
        GroupType targetGroupType = request.getGroupType() == null ? GroupType.GROUP : request.getGroupType();
        if (targetGroupType == GroupType.CLASS) {
            validateTeacherRole(currentUser);
        }

        validateGroup(request.getName(), request.getMemberIds(), request.getCreateId());
        Group group = new Group();
        group.setName(request.getName());
        group.setCreateId(request.getCreateId());
        if (targetGroupType == GroupType.CLASS) {
            group.setClassCode(generateUniqueClassCode());
        }
        group.setMemberIds(new ArrayList<>(request.getMemberIds()));
        group.setGroupType(targetGroupType);
        group.setAvatarGroup(request.getAvatarGroup());
        Map<String, Roles> roles = new HashMap<>();
        roles.put(request.getCreateId(), Roles.ADMIN);
        for (String memberId : request.getMemberIds()) {
            if (!memberId.equals(request.getCreateId())) {
                roles.put(memberId, Roles.MEMBER);
            }
        }
        group.setRoles(roles);
        group.setCreateAt(LocalDateTime.now());
        group.setUpdateAt(LocalDateTime.now());
        group.setActive(true);
        groupRepository.save(group);

        log.info("Group created: {}", group);

        webSocketService.notifyGroupCreate(group);

        return convertToGroupResponse(group);
    }

    @Override
    public GroupResponse addMember(String groupId, List<String> memberIds) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        User user = (User) authentication.getPrincipal();

        Optional<Group> group = groupRepository.findById(groupId);
        if (group.isEmpty()) {
            throw new ResourceNotFoundException("Group not found");
        }

        if (!group.get().isActive()) {
            throw new ResourceNotFoundException("Nhóm không hoạt động");
        }

        for (String memberId : memberIds) {
            if (userRepository.findById(memberId).isEmpty()) {
                throw new ResourceNotFoundException("Thành viên không tồn tại: " + memberId);
            }
            if (group.get().getMemberIds().contains(memberId)) {
                throw new IllegalArgumentException("Thành viên đã có trong nhóm: " + memberId);
            }
        }

        group.get().getMemberIds().addAll(memberIds);

        for (String memberId : memberIds) {
            group.get().getRoles().put(memberId, Roles.MEMBER);
        }

        groupRepository.save(group.get());

        webSocketService.notifyGroupUpdate(group.get(), user.getId(), memberIds, "ADD_MEMBER");

        return convertToGroupResponse(group.get());
    }

    @Override
    public GroupResponse removeMember(String groupId, String memberId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        User user = (User) authentication.getPrincipal();
        Optional<Group> group = groupRepository.findById(groupId);
        if (group.isEmpty()) {
            throw new ResourceNotFoundException("Không tìm thấy nhóm");
        }

        if (!group.get().isActive()) {
            throw new IllegalStateException("Nhóm đã bị giải tán");
        }
        if (!group.get().getMemberIds().contains(memberId)) {
            throw new ResourceNotFoundException("Thành viên không có trong nhóm: " + memberId);
        }
        validateAdmin(group.get(), user.getId());

        group.get().getMemberIds().remove(memberId);
        group.get().getRoles().remove(memberId);

        groupRepository.save(group.get());

        log.info("Member {} removed from group {}", memberId, groupId);

        webSocketService.notifyGroupUpdate(group.get(), user.getId(), List.of(memberId), "REMOVE_MEMBER");

        return convertToGroupResponse(group.get());

    }

    @Override
    public void dissolveGroup(String groupId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        User user = (User) authentication.getPrincipal();
        Optional<Group> group = groupRepository.findById(groupId);
        if (group.isEmpty()) {
            throw new ResourceNotFoundException("Group not found");
        }

        validateAdmin(group.get(), user.getId());

        group.get().setActive(false);
        groupRepository.save(group.get());
        log.info("Group {} dissolved by {}", groupId, user.getId());

        webSocketService.notifyGroupDelete(group.get());
    }

    @Override
    public GroupResponse assignRole(String groupId, String userId, Roles role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        User user = (User) authentication.getPrincipal();
        Optional<Group> group = groupRepository.findById(groupId);
        if (group.isEmpty()) {
            throw new ResourceNotFoundException("Không tìm thấy nhóm");
        }

        validateAdmin(group.get(), user.getId());

        if (!group.get().getMemberIds().contains(userId)) {
            throw new ResourceNotFoundException("Người dùng không ở trong nhóm");
        }

        group.get().getRoles().put(userId, role);

        groupRepository.save(group.get());

        log.info("User {} assigned role {} in group {}", userId, role, groupId);
        return convertToGroupResponse(group.get());
    }

    @Override
    public List<GroupResponse> getGroupByUser(String userId) {
        return groupRepository.findByMemberIdsContaining(userId)
                .stream()
                .filter(Group::isActive)
                .map(this::convertToGroupResponse)
                .collect(Collectors.toList());
    }

    @Override
    public GroupResponse getUserInGroup(String groupId) {
        Optional<Group> group = groupRepository.findById(groupId);
        if (group.isEmpty()) {
            throw new ResourceNotFoundException("Không tìm thấy nhóm");
        }

        if (group.get().getGroupType() == GroupType.CLASS) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            User user = (User) authentication.getPrincipal();
            validateTeacherRole(user);
        }

        return convertToGroupResponse(group.get());
    }

    @Override
    public List<GroupResponse> getAllClasses(String keyword) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();
        validateTeacherRole(user);

        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase();
        return groupRepository.findByIsActiveTrueAndGroupType(GroupType.CLASS)
                .stream()
                .filter(group -> normalizedKeyword.isEmpty() || (group.getName() != null
                        && group.getName().toLowerCase().contains(normalizedKeyword)))
            .map(this::ensureClassCodeForClass)
                .map(this::convertToGroupResponse)
                .collect(Collectors.toList());
    }

    @Override
    public GroupResponse getGroupById(String groupId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhóm/lớp"));

        if (group.getGroupType() == GroupType.CLASS) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            User user = (User) authentication.getPrincipal();
            validateTeacherRole(user);
        }

        return convertToGroupResponse(group);
    }

    @Override
    public GroupResponse joinGroup(String groupId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();
        validateTeacherRole(user);

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp"));

        if (!group.isActive()) {
            throw new IllegalStateException("Lớp đã ngừng hoạt động");
        }

        if (group.getGroupType() != GroupType.CLASS) {
            throw new ResourceNotFoundException("Đây không phải lớp học");
        }

        if (group.getMemberIds().contains(user.getId())) {
            return convertToGroupResponse(group);
        }

        group.getMemberIds().add(user.getId());
        group.getRoles().put(user.getId(), Roles.MEMBER);
        group.setUpdateAt(LocalDateTime.now());
        groupRepository.save(group);

        webSocketService.notifyGroupUpdate(group, user.getId(), List.of(user.getId()), "ADD_MEMBER");
        return convertToGroupResponse(group);
    }

    @Override
    public GroupResponse joinGroupByCode(String classCode) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();
        validateTeacherRole(user);

        String normalizedCode = classCode == null ? "" : classCode.trim().toUpperCase();
        if (normalizedCode.isEmpty()) {
            throw new ResourceNotFoundException("Mã lớp không được để trống");
        }

        Group group = groupRepository.findByClassCodeIgnoreCaseAndIsActiveTrue(normalizedCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp với mã: " + normalizedCode));

        if (group.getMemberIds().contains(user.getId())) {
            return convertToGroupResponse(group);
        }

        group.getMemberIds().add(user.getId());
        group.getRoles().put(user.getId(), Roles.MEMBER);
        group.setUpdateAt(LocalDateTime.now());
        groupRepository.save(group);

        webSocketService.notifyGroupUpdate(group, user.getId(), List.of(user.getId()), "ADD_MEMBER");
        return convertToGroupResponse(group);
    }

    @Override
    public GroupResponse updateGroup(String groupId, GroupRequest request, MultipartFile file) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();
        if (user == null) {
            throw new ResourceNotFoundException("User not found");
        }

        Optional<Group> group = groupRepository.findById(groupId);
        if (group.isEmpty()) {
            throw new ResourceNotFoundException("Không tìm thấy nhóm");
        }

        // Chỉ update name nếu có giá trị
        if (request.getName() != null && !request.getName().isEmpty()) {
            group.get().setName(request.getName());
        }

        if (file != null && !file.isEmpty()) {
            if (file.getSize() > 10 * 1024 * 1024) {
                throw new ResourceNotFoundException("Kích thước file vượt quá giới hạn");
            }

            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                log.error("Invalid file type: {}", contentType);
                throw new ResourceNotFoundException("Loại file không hợp lệ");
            }

            try {
                Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap("resource_type", "image", "folder", "user_avatars"));
                String avatarUrl = (String) uploadResult.get("secure_url");
                group.get().setAvatarGroup(avatarUrl);
                log.info("Avatar uploaded to Cloudinary: {} for group: {}", avatarUrl, group.get().getId());
            } catch (Exception e) {
                log.error("Error uploading avatar to Cloudinary: {}", e.getMessage());
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Tải avatar lên thất bại");
            }
        }

        log.info("Group updated: {}", group.get());

        groupRepository.save(group.get());

        webSocketService.notifyGroupUpdate(group.get(), user.getId(), List.of(user.getId()), "UPDATE_GROUP");

        return convertToGroupResponse(group.get());
    }

    @Override
    public GroupResponse setAdmin(String groupId, String memberId, boolean isAdmin, String userId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();
        if (user == null) {
            throw new ResourceNotFoundException("User not found");
        }

        Optional<Group> group = groupRepository.findById(groupId);
        if (group.isEmpty()) {
            throw new ResourceNotFoundException("Group not found");
        }

        validateAdmin(group.get(), userId);

        if (isAdmin) {
            group.get().getRoles().put(memberId, Roles.ADMIN);
        } else {
            if (group.get().getRoles().get(memberId).equals(Roles.ADMIN)) {
                if (group.get().getRoles().values().stream().filter(r -> r.equals(Roles.ADMIN)).count() == 1) {
                    throw new IllegalStateException("Dont remove the last admin");
                }
                group.get().getRoles().put(memberId, Roles.MEMBER);
            }
        }
        groupRepository.save(group.get());
        log.info("User {} set as admin in group {}", memberId, groupId);

        webSocketService.notifyGroupUpdate(group.get(), user.getId(), List.of(memberId), "SET_ADMIN");

        return convertToGroupResponse(group.get());
    }

    private void validateGroup(String name, List<String> memberIds, String createId) {
        if (name == null || name.isEmpty()) {
            throw new ResourceNotFoundException("Tên nhóm không được để trống");
        }
        if (memberIds == null || memberIds.isEmpty()) {
            throw new ResourceNotFoundException("Danh sách thành viên không được để trống");
        }
        if (userRepository.findById(createId).isEmpty()) {
            throw new ResourceNotFoundException("ID người tạo không được để trống");
        }
        for (String memberId : memberIds) {
            if (userRepository.findById(memberId).isEmpty()) {
                throw new ResourceNotFoundException("ID thành viên không được để trống");
            }
        }
    }

    private void validateAdmin(Group group, String userId) {
        Roles role = group.getRoles().get(userId);
        if (!role.equals(Roles.ADMIN)) {
            throw new ResourceNotFoundException("Chỉ quản trị viên mới có thể thực hiện hành động này");
        }
    }

    private void validateTeacherRole(User user) {
        if (user == null || user.getRole() != UserRole.TEACHER) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ tài khoản Teacher mới có quyền dùng chức năng lớp học");
        }
    }

    private String generateUniqueClassCode() {
        for (int i = 0; i < 20; i++) {
            String candidate = "CLS-" + UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
            if (!groupRepository.existsByClassCodeIgnoreCase(candidate)) {
                return candidate;
            }
        }
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tạo mã lớp duy nhất");
    }

    private Group ensureClassCodeForClass(Group group) {
        if (group.getGroupType() != GroupType.CLASS) {
            return group;
        }
        if (group.getClassCode() != null && !group.getClassCode().isBlank()) {
            return group;
        }
        group.setClassCode(generateUniqueClassCode());
        group.setUpdateAt(LocalDateTime.now());
        return groupRepository.save(group);
    }

    private GroupResponse convertToGroupResponse(Group group) {
        return GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .createId(group.getCreateId())
                .classCode(group.getClassCode())
                .memberIds(group.getMemberIds())
                .roles(group.getRoles())
                .groupType(group.getGroupType() == null ? GroupType.GROUP : group.getGroupType())
                .avatarGroup(group.getAvatarGroup())
                .createAt(group.getCreateAt())
                .updateAt(group.getUpdateAt())
                .isActive(group.isActive())
                .build();
    }

    // ==================== GROUP INVITE METHODS ====================
    
    @Override
    public List<GroupInviteResponse> sendGroupInvites(String groupId, List<String> inviteeIds) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User inviter = (User) authentication.getPrincipal();
        
        // Kiểm tra nhóm tồn tại
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Nhóm không tồn tại"));
        
        if (!group.isActive()) {
            throw new IllegalStateException("Nhóm đã bị giải tán");
        }
        
        // Kiểm tra quyền gửi lời mời (phải là thành viên của nhóm)
        if (!group.getMemberIds().contains(inviter.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền mời người vào nhóm này");
        }
        
        List<GroupInviteResponse> responses = new ArrayList<>();
        
        for (String inviteeId : inviteeIds) {
            // Kiểm tra user tồn tại
            User invitee = userRepository.findById(inviteeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại: " + inviteeId));
            
            // Kiểm tra đã là thành viên chưa
            if (group.getMemberIds().contains(inviteeId)) {
                log.warn("User {} đã là thành viên của nhóm {}", inviteeId, groupId);
                continue;
            }
            
            // Kiểm tra đã có lời mời pending chưa
            Optional<GroupInvite> existingInvite = groupInviteRepository
                    .findByGroupIdAndInviteeIdAndStatus(groupId, inviteeId, InviteStatus.PENDING);
            
            if (existingInvite.isPresent()) {
                log.warn("Đã có lời mời pending cho user {} vào nhóm {}", inviteeId, groupId);
                responses.add(convertToGroupInviteResponse(existingInvite.get(), group, inviter, invitee));
                continue;
            }
            
            // Tạo lời mời mới
            GroupInvite invite = new GroupInvite(groupId, inviter.getId(), inviteeId, InviteStatus.PENDING);
            GroupInvite savedInvite = groupInviteRepository.save(invite);

            Map<String, Object> inviteNotification = new HashMap<>();
            inviteNotification.put("type", "GROUP_INVITE");
            inviteNotification.put("inviteId", savedInvite.getId());
            inviteNotification.put("groupId", groupId);
            inviteNotification.put("groupName", group.getName());
            inviteNotification.put("groupAvatar", group.getAvatarGroup());
            inviteNotification.put("inviterId", inviter.getId());
            inviteNotification.put("inviterName", buildUserDisplayName(inviter));
            inviteNotification.put("inviteeId", inviteeId);
            inviteNotification.put("status", InviteStatus.PENDING.name());
            webSocketService.notifyGroupInvite(inviteeId, inviteNotification);
            
            log.info("Đã gửi lời mời vào nhóm {} cho user {}", groupId, inviteeId);
            
            responses.add(convertToGroupInviteResponse(savedInvite, group, inviter, invitee));
        }
        
        return responses;
    }
    
    @Override
    public GroupInviteResponse acceptGroupInvite(String inviteId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();
        
        GroupInvite invite = groupInviteRepository.findById(inviteId)
                .orElseThrow(() -> new ResourceNotFoundException("Lời mời không tồn tại"));
        
        // Kiểm tra quyền chấp nhận
        if (!invite.getInviteeId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chấp nhận lời mời này");
        }
        
        if (invite.getStatus() != InviteStatus.PENDING) {
            throw new IllegalStateException("Lời mời đã được xử lý");
        }
        
        // Lấy thông tin nhóm
        Group group = groupRepository.findById(invite.getGroupId())
                .orElseThrow(() -> new ResourceNotFoundException("Nhóm không tồn tại"));
        
        if (!group.isActive()) {
            throw new IllegalStateException("Nhóm đã bị giải tán");
        }
        
        // Kiểm tra đã là thành viên chưa
        if (group.getMemberIds().contains(user.getId())) {
            throw new IllegalStateException("Bạn đã là thành viên của nhóm này");
        }
        
        // Thêm user vào nhóm
        group.getMemberIds().add(user.getId());
        group.getRoles().put(user.getId(), Roles.MEMBER);
        groupRepository.save(group);
        
        // Cập nhật trạng thái invite
        invite.setStatus(InviteStatus.ACCEPTED);
        groupInviteRepository.save(invite);
        
        log.info("User {} đã chấp nhận lời mời vào nhóm {}", user.getId(), group.getId());
        
        // Notify via WebSocket
        webSocketService.notifyGroupUpdate(group, invite.getInviterId(), List.of(user.getId()), "ADD_MEMBER");
        
        User inviter = userRepository.findById(invite.getInviterId()).orElse(null);
        return convertToGroupInviteResponse(invite, group, inviter, user);
    }
    
    @Override
    public GroupInviteResponse rejectGroupInvite(String inviteId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();
        
        GroupInvite invite = groupInviteRepository.findById(inviteId)
                .orElseThrow(() -> new ResourceNotFoundException("Lời mời không tồn tại"));
        
        // Kiểm tra quyền từ chối
        if (!invite.getInviteeId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền từ chối lời mời này");
        }
        
        if (invite.getStatus() != InviteStatus.PENDING) {
            throw new IllegalStateException("Lời mời đã được xử lý");
        }
        
        // Cập nhật trạng thái
        invite.setStatus(InviteStatus.REJECTED);
        groupInviteRepository.save(invite);
        
        log.info("User {} đã từ chối lời mời vào nhóm {}", user.getId(), invite.getGroupId());
        
        Group group = groupRepository.findById(invite.getGroupId()).orElse(null);
        User inviter = userRepository.findById(invite.getInviterId()).orElse(null);
        
        return convertToGroupInviteResponse(invite, group, inviter, user);
    }
    
    @Override
    public List<GroupInviteResponse> getPendingGroupInvites(String userId) {
        List<GroupInvite> invites = groupInviteRepository.findByInviteeIdAndStatus(userId, InviteStatus.PENDING);
        
        return invites.stream()
                .map(invite -> {
                    Group group = groupRepository.findById(invite.getGroupId()).orElse(null);
                    User inviter = userRepository.findById(invite.getInviterId()).orElse(null);
                    User invitee = userRepository.findById(invite.getInviteeId()).orElse(null);
                    return convertToGroupInviteResponse(invite, group, inviter, invitee);
                })
                .collect(Collectors.toList());
    }
    
    private GroupInviteResponse convertToGroupInviteResponse(GroupInvite invite, Group group, User inviter, User invitee) {
        return GroupInviteResponse.builder()
                .id(invite.getId())
                .inviteId(invite.getId()) // Alias cho frontend
                .groupId(invite.getGroupId())
                .groupName(group != null ? group.getName() : "Unknown Group")
                .groupAvatar(group != null ? group.getAvatarGroup() : null)
                .inviterId(invite.getInviterId())
                .inviterName(buildUserDisplayName(inviter))
                .inviterAvatar(inviter != null ? inviter.getAvatar() : null)
                .inviteeId(invite.getInviteeId())
                .status(invite.getStatus())
                .createdAt(invite.getCreatedAt())
                .build();
    }

    private String buildUserDisplayName(User user) {
        if (user == null) {
            return "Unknown";
        }

        String fullName = ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                + (user.getLastName() == null ? "" : user.getLastName())).trim();
        if (!fullName.isEmpty()) {
            return fullName;
        }

        if (user.getUsername() != null && !user.getUsername().trim().isEmpty()) {
            return user.getUsername().trim();
        }

        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
            return user.getEmail().trim();
        }

        return "Unknown";
    }
}

