package vn.edu.iuh.fit.ott_education_be.controller.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.iuh.fit.ott_education_be.common.Gender;

import java.util.Date;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRegisterRequest {
    private String username;
    private String password;
    private String email;
    private String phone;
    private String firstName;
    private String lastName;
    private Date birthday;
    private Gender gender;
}
