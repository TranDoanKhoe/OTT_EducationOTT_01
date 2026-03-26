
package vn.edu.iuh.fit.ott_education_be.service;



import java.util.List;

import vn.edu.iuh.fit.ott_education_be.controller.response.FriendRequestResponse;
import vn.edu.iuh.fit.ott_education_be.controller.response.FriendResponse;
import vn.edu.iuh.fit.ott_education_be.model.Friend;

public interface FriendService {
    List<FriendRequestResponse> getPendingFriendRequests();

    List<FriendResponse> getAllFriends();

    FriendResponse getFriendById(String friendId);

    void sendFriendRequest(String phone);

    void acceptFriendRequest(String requestId);

    void cancelFriendRequest(String receiverId);

    void deleteFriend(String friendId);

    void blockUser(String blockedUserId);

    void unblockUser(String blockedUserId);
}
