package vn.edu.iuh.fit.ott_education_be.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import vn.edu.iuh.fit.ott_education_be.model.GroupNote;

import java.util.List;

@Repository
public interface GroupNoteRepository extends MongoRepository<GroupNote, String> {
    List<GroupNote> findByGroupIdOrderByCreatedAtDesc(String groupId);
    void deleteByGroupId(String groupId);
}
