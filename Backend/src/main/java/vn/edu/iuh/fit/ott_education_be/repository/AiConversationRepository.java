package vn.edu.iuh.fit.ott_education_be.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import vn.edu.iuh.fit.ott_education_be.model.AiConversation;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiConversationRepository extends MongoRepository<AiConversation, String> {
    List<AiConversation> findByUserIdOrderByUpdatedAtDesc(String userId);

    Optional<AiConversation> findByIdAndUserId(String id, String userId);

    void deleteByIdAndUserId(String id, String userId);
}
