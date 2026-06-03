package vn.edu.iuh.fit.ott_education_be.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import vn.edu.iuh.fit.ott_education_be.model.Poll;

import java.util.List;

@Repository
public interface PollRepository extends MongoRepository<Poll, String> {
    List<Poll> findByGroupIdOrderByCreatedAtDesc(String groupId);
    void deleteByGroupId(String groupId);
}
