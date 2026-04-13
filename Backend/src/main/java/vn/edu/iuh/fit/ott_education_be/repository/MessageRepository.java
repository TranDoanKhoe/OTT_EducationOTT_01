
package vn.edu.iuh.fit.ott_education_be.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import vn.edu.iuh.fit.ott_education_be.model.Message;

import java.time.LocalDateTime;
import java.util.List;


@Repository
public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findBySenderIdAndReceiverIdOrReceiverIdAndSenderId(String senderId, String receiverId, String receiverId1, String senderId1);

    List<Message> findBySenderIdAndReceiverId(String senderId, String receiverId);

    List<Message> findByGroupId(String groupId);

    List<Message> findByGroupIdAndIsPinned(String groupId, boolean isPinned);

    List<Message> findBySenderIdAndReceiverIdOrReceiverIdAndSenderIdAndIsPinned(String userId, String otherUserId, String userId1, String otherUserId1, boolean isPinned);

    List<Message> findByGroupIdAndContentContaining(String groupId, String keyword);
    
    // Admin methods
    long countByCreatedAtAfter(LocalDateTime date);
    
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    
    long countBySenderId(String senderId);
    
    long countByGroupId(String groupId);
    
    void deleteByGroupId(String groupId);
}
