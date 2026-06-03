package vn.edu.iuh.fit.ott_education_be.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import vn.edu.iuh.fit.ott_education_be.model.ConversationSetting;

import java.util.List;
import java.util.Optional;

public interface ConversationSettingRepository extends MongoRepository<ConversationSetting, String> {
    Optional<ConversationSetting> findByUserIdAndConversationId(String userId, String conversationId);

    List<ConversationSetting> findByUserId(String userId);
}
