package vn.edu.iuh.fit.ott_education_be.controller.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.iuh.fit.ott_education_be.common.Gender;
import vn.edu.iuh.fit.ott_education_be.common.UserStatus;

import java.time.LocalDateTime;
import java.util.Date;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateResponse {
    private String firstName;
    private String lastName;
    private String phone;
    private String email;
    private Gender gender;
    private Date birthday;
    private String avatar;
    private UserStatus status;
    private String username;
    private LocalDateTime createdAt;
    private LocalDateTime updateAt;
}
