
package vn.edu.iuh.fit.ott_education_be.repository;


import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import vn.edu.iuh.fit.ott_education_be.common.UserRole;
import vn.edu.iuh.fit.ott_education_be.common.UserStatus;
import vn.edu.iuh.fit.ott_education_be.controller.response.UserResponse;
import vn.edu.iuh.fit.ott_education_be.model.Friend;
import vn.edu.iuh.fit.ott_education_be.model.User;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    User findByUsername(String username);

    User findByEmail(String email);

    @Query("{ '_id': { $in: ?0 } }")
    List<User> getAllByFriends(List<String> friendIds);

    User findByPhone(String phone);

    // Admin methods
    long countByRole(UserRole role);
    
    long countByStatus(UserStatus status);
    
    long countByCreatedAtAfter(LocalDateTime date);
    
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    
    Page<User> findByEmailContainingIgnoreCaseOrUsernameContainingIgnoreCase(String email, String username, Pageable pageable);
    
    Page<User> findByRole(UserRole role, Pageable pageable);
    
    Page<User> findByStatus(UserStatus status, Pageable pageable);
    
    List<User> findByRoleIsNull();
}
