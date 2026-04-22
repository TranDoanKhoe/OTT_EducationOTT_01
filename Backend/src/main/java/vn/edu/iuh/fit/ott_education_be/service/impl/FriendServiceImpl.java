

package vn.edu.iuh.fit.ott_education_be.service.impl;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.edu.iuh.fit.ott_education_be.common.FriendStatus;
import vn.edu.iuh.fit.ott_education_be.controller.response.FriendRequestResponse;
import vn.edu.iuh.fit.ott_education_be.controller.response.FriendResponse;
import vn.edu.iuh.fit.ott_education_be.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.ott_education_be.model.Friend;
import vn.edu.iuh.fit.ott_education_be.model.User;
import vn.edu.iuh.fit.ott_education_be.repository.FriendRepository;
import vn.edu.iuh.fit.ott_education_be.repository.UserRepository;
import vn.edu.iuh.fit.ott_education_be.service.FriendService;
import vn.edu.iuh.fit.ott_education_be.service.WebSocketService;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "FRIEND-SERVICE")
public class FriendServiceImpl implements FriendService {
    private final UserRepository userRepository;
    private final FriendRepository friendRepository;
    private final WebSocketService webSocketService;

    @Override
    public List<FriendRequestResponse> getPendingFriendRequests() {
        String userId = getCurrentUserId();
        log.info("Getting pending friend requests for user: {}", userId);

        List<Friend> pendingRequests = friendRepository.findByReceiverIdAndStatus(userId, FriendStatus.PENDING);
        log.info("Found {} pending friend requests", pendingRequests.size());

        List<FriendRequestResponse> responses = new ArrayList<>();
        for (Friend request : pendingRequests) {
            Optional<User> senderOptional = userRepository.findById(request.getSenderId());
            if (senderOptional.isPresent()) {
                User sender = senderOptional.get();
                FriendRequestResponse response = FriendRequestResponse.builder()
                        .requestId(request.getId())
                        .id(sender.getId())
                        .senderId(sender.getId())
                        .name(sender.getFirstName() + " " + sender.getLastName())
                        .lastName(sender.getLastName())
                        .avatar(sender.getAvatar())
                        .phone(sender.getPhone())
                        .activeStatus(sender.getActiveStatus())
                        .build();
                responses.add(response);
                log.info("Added friend request from: {} ({})", sender.getFirstName() + " " + sender.getLastName(), sender.getPhone());
            } else {
                log.warn("Sender not found for request: {}", request.getId());
            }
        }

        return responses;
    }

    @Override
    public List<FriendResponse> getAllFriends() {
        String userId = getCurrentUserId();

        Optional<User> userOptional = userRepository.findById(userId);

        // Check if the user is not found
        throwIf(userOptional.isEmpty(), "User not found with id: {}", "Không tìm thấy người dùng với id: " + userId, HttpStatus.NOT_FOUND);

        List<String> friendIds = userOptional.get().getFriends();

        // Check if the user has no friends
        throwIf(friendIds == null && friendIds.isEmpty(), "User has no friends", "Người dùng không có bạn bè", HttpStatus.NOT_FOUND);

        List<User> friends = userRepository.getAllByFriends(friendIds);
        log.info("Found {} friends for user {}", friends.size(), userId);

        // Map the friends to FriendResponse
        List<FriendResponse> friendResponses = friends.stream()
                .map(friend -> FriendResponse.builder()
                        .id(friend.getId())
                        .name(friend.getFirstName() + " " + friend.getLastName())
                        .avatar(friend.getAvatar())
                        .phone(friend.getPhone())
                        .activeStatus(friend.getActiveStatus())
                        .build())
                .toList();
        log.info("Returning {} friends for user {}", friendResponses.size(), userId);
        return friendResponses;
    }

    @Override
    public FriendResponse getFriendById(String friendId) {
        Optional<User> user = userRepository.findById(friendId);
        // Check if the friend is not found
        if (user.isEmpty()) {
            log.error("Friend not found with id: {}", friendId);
            throw new ResourceNotFoundException("Không tìm thấy bạn bè với id: " + friendId);
        }

        return FriendResponse.builder()
                .id(user.get().getId())
                .name(user.get().getFirstName() + " " + user.get().getLastName())
                .avatar(user.get().getAvatar())
                .phone(user.get().getPhone())
                .birthday(user.get().getBirthday())
                .gender(user.get().getGender())
                .activeStatus(user.get().getActiveStatus())
                .build();
    }

    @Override
    public void sendFriendRequest(String phone) {
        String senderId = getCurrentUserId();

        User receiverUser = userRepository.findByPhone(phone);

        String receiverId = receiverUser.getId();

        // Check if the sender and receiver are the same
        throwIf(senderId.equals(receiverId), "You cannot send a friend request to yourself", "Bạn không thể gửi yêu cầu kết bạn cho chính mình", HttpStatus.BAD_REQUEST);

        if (receiverId == null || receiverId.isEmpty()) {
            log.error("Receiver ID is null or empty");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID người nhận rỗng hoặc null");
        }
        // Check if the receiver exists
        Optional<User> receiver = userRepository.findById(receiverId);
        throwIf(receiver.isEmpty(), "Receiver not found with id: {}", "Không tìm thấy người nhận với id: " + phone, HttpStatus.NOT_FOUND);

        // Check if the receiver is sending request to sender
        Optional<Friend> existingFriendRequest = friendRepository.findBySenderIdAndReceiverIdAndStatus(senderId, phone, FriendStatus.PENDING);
        if (existingFriendRequest.isPresent()) {
            log.error("Friend request already sent from {} to {}", senderId, phone);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu kết bạn đã được gửi");
        }

        // Check if the sender and receiver are already friends
        Optional<User> sender = userRepository.findById(senderId);
        throwIf(sender.get().getFriends().contains(receiverId), "You are already friends with this user", "Bạn đã là bạn bè với người dùng này", HttpStatus.BAD_REQUEST);

        //Check if the sender is blocked by the receiver
        throwIf(receiver.get().getBlocks().contains(senderId), "You are blocked by this user", "Bạn đã bị người dùng này chặn", HttpStatus.FORBIDDEN);

        // Create a new friend request
        Friend friendRequest = new Friend();
        friendRequest.setSenderId(senderId);
        friendRequest.setReceiverId(receiverId);
        friendRequest.setStatus(FriendStatus.PENDING);
        friendRequest.setCreatedAt(LocalDateTime.now());
        friendRequest.setUpdatedAt(LocalDateTime.now());

        friendRepository.save(friendRequest);

        log.info("Friend request sent to {} to {}", senderId, receiverId);

        webSocketService.notifyFriendRequest(senderId, receiverId);
    }

    @Override
    public void acceptFriendRequest(String requestId) {
        String userId = getCurrentUserId();
        Optional<Friend> friendRequest = friendRepository.findById(requestId);

        // Check if request is not found
        throwIf(friendRequest.isEmpty(), "Friend request not found with id: {}", "Không tìm thấy yêu cầu kết bạn với id: " + requestId, HttpStatus.NOT_FOUND);

        // Check if the friend request is not pending
        throwIf(friendRequest.get().getStatus() != FriendStatus.PENDING, "Friend request is not pending", "Yêu cầu kết bạn không ở trạng thái chờ xử lý", HttpStatus.BAD_REQUEST);

        // Update the friend request status to ACCEPTED
        friendRequest.get().setStatus(FriendStatus.ACCEPTED);
        friendRepository.save(friendRequest.get());

        // Add the sender and receiver to each other's friends list
        String senderId = friendRequest.get().getSenderId();
        String receiverId = friendRequest.get().getReceiverId();

        Optional<User> user = findUserById(senderId, "Không tìm thấy người dùng với id: " + userId);
        Optional<User> friend = findUserById(receiverId, "Không tìm thấy bạn bè với id: " + receiverId);

        user.get().getFriends().add(receiverId);
        friend.get().getFriends().add(senderId);
        userRepository.save(user.get());
        userRepository.save(friend.get());

        webSocketService.notifyFriendRequestAccepted(user.get().getId(), friend.get().getId());

        log.info("Friend request accepted from {} to {}", userId, receiverId);
    }

    @Override
    public void cancelFriendRequest(String requestId) {
        Optional<Friend> friendRequest = friendRepository.findById(requestId);

        // Check if the friend request is not found
        throwIf(friendRequest.isEmpty(), "Friend request not found with id: {}", "Không tìm thấy yêu cầu kết bạn với id: " + requestId, HttpStatus.NOT_FOUND);
        // Check if the friend request is not pending
        throwIf(friendRequest.get().getStatus() != FriendStatus.PENDING, "Friend request is not pending", "Yêu cầu kết bạn không ở trạng thái chờ xử lý", HttpStatus.BAD_REQUEST);

        // Delete the friend request
        friendRepository.delete(friendRequest.get());
        webSocketService.notifyFriendRequestRejected(friendRequest.get().getSenderId(), friendRequest.get().getReceiverId());
        log.info("Friend request cancelled from {} to {}", friendRequest.get().getSenderId(), friendRequest.get().getReceiverId());
    }

    @Override
    public void deleteFriend(String friendId) {
        String userId = getCurrentUserId();
        Optional<User> user = findUserById(userId, "Không tìm thấy người dùng với id: " + userId);
        Optional<User> friend = findUserById(friendId, "Không tìm thấy bạn bè với id: " + friendId);

        // Tìm tất cả friend requests đã ACCEPTED giữa 2 user (query cả 2 chiều)
        List<Friend> friendRequests = new java.util.ArrayList<>();
        friendRequests.addAll(friendRepository.findAllBySenderIdAndReceiverIdAndStatus(userId, friendId, FriendStatus.ACCEPTED));
        friendRequests.addAll(friendRepository.findAllBySenderIdAndReceiverIdAndStatus(friendId, userId, FriendStatus.ACCEPTED));
        
        // Check if no friend relationship found
        throwIf(friendRequests.isEmpty(), "Friend relationship not found", "Không tìm thấy mối quan hệ bạn bè giữa các người dùng", HttpStatus.NOT_FOUND);
        
        log.info("Found {} friend request(s) to delete between {} and {}", friendRequests.size(), userId, friendId);
        
        // Xóa friend khỏi danh sách của cả 2 user (nếu có)
        if (user.get().getFriends() != null && user.get().getFriends().contains(friendId)) {
            user.get().getFriends().remove(friendId);
        }
        if (friend.get().getFriends() != null && friend.get().getFriends().contains(userId)) {
            friend.get().getFriends().remove(userId);
        }

        // Xóa tất cả friend request records (cleanup duplicates)
        friendRepository.deleteAll(friendRequests);

        userRepository.save(user.get());
        userRepository.save(friend.get());

        webSocketService.notifyFriendDeleted(user.get().getId(), friend.get().getId());
        log.info("Friend deleted successfully from {} to {}, removed {} duplicate record(s)", userId, friendId, friendRequests.size());
    }


    @Override
    public void blockUser(String blockedUserId) {
        String userId = getCurrentUserId();

        Optional<User> user = findUserById(userId, "Không tìm thấy người dùng với id: " + userId);
        Optional<User> blockedUser = findUserById(blockedUserId, "Không tìm thấy người dùng bị chặn với id: " + blockedUserId);

        // Check if the user is already blocked
        throwIf(user.get().getBlocks().contains(blockedUserId), "User is already blocked", "Người dùng đã bị chặn", HttpStatus.BAD_REQUEST);

        if (user.get().getFriends().contains(blockedUserId)) {
            user.get().getFriends().remove(userId);
            blockedUser.get().getFriends().remove(blockedUserId);
            userRepository.save(blockedUser.get());
        }

        // Add the blocked user to the user's blocks list
        user.get().getBlocks().add(blockedUserId);

        userRepository.save(user.get());

        webSocketService.notifyUserBlocked(user.get().getId(), blockedUserId);
        log.info("User {} blocked user {}", userId, blockedUserId);
    }

    @Override
    public void unblockUser(String blockedUserId) {
        String userId = getCurrentUserId();
        Optional<User> user = findUserById(userId, "Không tìm thấy người dùng với id: " + userId);
        Optional<User> blockedUser = findUserById(blockedUserId, "Không tìm thấy người dùng bị chặn với id: " + blockedUserId);

        // Check if the user is not blocked
        throwIf(!user.get().getBlocks().contains(blockedUserId), "User is not blocked", "Người dùng không bị chặn", HttpStatus.BAD_REQUEST);

        // Remove the blocked user from the user's blocks list
        user.get().getBlocks().remove(blockedUserId);
        userRepository.save(user.get());

        webSocketService.notifyUserUnblocked(user.get().getId(), blockedUserId);
        log.info("User {} unblocked user {}", userId, blockedUserId);
    }

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            log.error("User is not authenticated");
            throw new ResourceNotFoundException("Người dùng chưa xác thực");
        }
        return ((User) authentication.getPrincipal()).getId();
    }

    private Optional<User> findUserById(String userId, String errorMessage) {
        Optional<User> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            log.error(errorMessage);
            throw new ResourceNotFoundException(errorMessage);
        }
        return userOptional;
    }

    private void throwIf(boolean condition, String logMessage, String errorMessage, HttpStatus status) {
        if (condition) {
            log.error(logMessage);
            throw new ResponseStatusException(status, errorMessage);
        }
    }
}
