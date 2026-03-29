package vn.edu.iuh.fit.ott_education_be.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import vn.edu.iuh.fit.ott_education_be.model.Resource;

import java.util.List;

// Mongo repository for resource lookup, folder trees, and sharing queries.

@Repository
public interface ResourceRepository extends MongoRepository<Resource, String> {
    List<Resource> findByUserIdOrderByCreatedAtDesc(String userId);

    List<Resource> findByUserIdAndParentIdOrderByCreatedAtDesc(String userId, String parentId);

    List<Resource> findBySharedWithContainingOrderByCreatedAtDesc(String userId);

    List<Resource> findBySharedGroupsContainingOrderByCreatedAtDesc(String groupId);
}