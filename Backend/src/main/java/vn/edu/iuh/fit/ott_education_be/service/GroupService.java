

package vn.edu.iuh.fit.ott_education_be.service;



import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import vn.edu.iuh.fit.ott_education_be.common.Roles;
import vn.edu.iuh.fit.ott_education_be.controller.request.GroupRequest;
import vn.edu.iuh.fit.ott_education_be.controller.response.GroupInviteResponse;
import vn.edu.iuh.fit.ott_education_be.controller.response.GroupResponse;

import java.util.List;

@Service
public interface GroupService {
    GroupResponse createGroup(GroupRequest request);

    GroupResponse addMember(String groupId, List<String> memberIds);

    GroupResponse removeMember(String groupId, String memberId);

    void dissolveGroup(String groupId);

    GroupResponse assignRole(String groupId, String userId, Roles role);

    List<GroupResponse> getGroupByUser(String userId);

   GroupResponse getUserInGroup(String groupId);

   GroupResponse updateGroup(String groupId, GroupRequest request, MultipartFile file);

   GroupResponse setAdmin(String groupId, String memberIds, boolean isAdmin, String userId);
   
   // Group invite methods
   List<GroupInviteResponse> sendGroupInvites(String groupId, List<String> inviteeIds);
   
   GroupInviteResponse acceptGroupInvite(String inviteId);
   
   GroupInviteResponse rejectGroupInvite(String inviteId);
   
   List<GroupInviteResponse> getPendingGroupInvites(String userId);

    List<GroupResponse> getAllClasses(String keyword);

    GroupResponse getGroupById(String groupId);

    GroupResponse joinGroup(String groupId);

    GroupResponse joinGroupByCode(String classCode);
}
