package vn.edu.iuh.fit.ott_education_be.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import vn.edu.iuh.fit.ott_education_be.common.InviteStatus;
import vn.edu.iuh.fit.ott_education_be.model.GroupInvite;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupInviteRepository extends MongoRepository<GroupInvite, String> {
    
    // Lấy tất cả lời mời đang chờ của một user
    List<GroupInvite> findByInviteeIdAndStatus(String inviteeId, InviteStatus status);
    
    // Kiểm tra xem đã có lời mời chưa
    Optional<GroupInvite> findByGroupIdAndInviteeIdAndStatus(String groupId, String inviteeId, InviteStatus status);
    
    // Lấy tất cả lời mời của một nhóm
    List<GroupInvite> findByGroupIdAndStatus(String groupId, InviteStatus status);
}
