

package vn.edu.iuh.fit.ott_education_be.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import vn.edu.iuh.fit.ott_education_be.model.VerificationCode;



@Repository
public interface VerificationCodeRepository extends MongoRepository<VerificationCode, String> {
    long deleteByEmail(String email);
    long deleteByPhone(String phone);

    VerificationCode findByCode(String code);
}
