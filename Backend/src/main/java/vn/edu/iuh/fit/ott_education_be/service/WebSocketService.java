

package vn.edu.iuh.fit.ott_education_be.service;

import java.util.List;
import java.util.Map;

import vn.edu.iuh.fit.ott_education_be.controller.request.MessageRequest;
import vn.edu.iuh.fit.ott_education_be.model.Group;

public interface WebSocketService {
    void sendMessage(MessageRequest request);

    void sendGroupMessage(MessageRequest request);

    void notifyFriendRequest(String receiverId, String senderId);

    void notifyFriendRequestAccepted(String sender, String receiverUsername);

    void notifyFriendRequestRejected(String userId, String receiverId);

    void notifyFriendDeleted(String userId, String friendId);

    void notifyUserBlocked(String userId, String blockedUserId);

    void notifyUserUnblocked(String userId, String unblockedUserId);

    void notifyRecall(String messageId, String userId);

    void notifyGroupRecall(String messageId, String userId, String groupId);

    void notifyDelete(String messageId, String userId);

    void notifyGroupDelete(String messageId, String userId, String groupId);

    void notifyRead(String messageId, String userId);

    void notifyEdit(String messageId, String userId, String content);

    void notifyGroupEdit(String messageId, String userId, String groupId);

    void notifyPin(String messageId, String userId);

    void notifyUnpin(String messageId, String userId);

    void notifyGroupCreate(Group group);

    void notifyGroupUpdate(Group group, String actorId, List<String> affectedMemberIds, String action);

    void notifyGroupDelete(Group group);

    void notifyGroupInvite(String receiverId, Map<String, Object> payload);

    void sendMessageToUser(String receiverId, Object message);

    void sendMessageToGroup(String groupId, Object message);
}
