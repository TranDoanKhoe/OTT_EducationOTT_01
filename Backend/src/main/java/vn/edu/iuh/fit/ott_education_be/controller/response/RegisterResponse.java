package vn.edu.iuh.fit.ott_education_be.controller.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.iuh.fit.ott_education_be.common.Gender;
import vn.edu.iuh.fit.ott_education_be.common.UserActiveStatus;
import vn.edu.iuh.fit.ott_education_be.common.UserStatus;

import java.util.Date;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterResponse {
    private String userId;
    private String username;
    private String email;
    private String phone;
    private String avatar;
    private UserStatus status;
    private String firstName;
    private String lastName;
    private Date birthday;
    private Gender gender;
    private UserActiveStatus activeStatus;
    private String accessToken;
    private String refreshToken;
}
