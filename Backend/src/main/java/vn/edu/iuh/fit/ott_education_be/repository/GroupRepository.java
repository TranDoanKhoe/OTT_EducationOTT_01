
package vn.edu.iuh.fit.ott_education_be.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import vn.edu.iuh.fit.ott_education_be.common.GroupType;
import vn.edu.iuh.fit.ott_education_be.model.Group;

import java.time.LocalDateTime;
import java.util.List;



@Repository
public interface GroupRepository extends MongoRepository<Group, String> {
    List<Group> findByMemberIdsContaining(String userId);
    List<Group> findByIsActiveTrueAndGroupType(GroupType groupType);
    java.util.Optional<Group> findByClassCodeIgnoreCaseAndIsActiveTrue(String classCode);
    boolean existsByClassCodeIgnoreCase(String classCode);
    
    // Admin methods
    long countByCreateAtAfter(LocalDateTime date);
    
    long countByCreateAtBetween(LocalDateTime start, LocalDateTime end);
    
    long countByMemberIdsContaining(String userId);
    
    Page<Group> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
