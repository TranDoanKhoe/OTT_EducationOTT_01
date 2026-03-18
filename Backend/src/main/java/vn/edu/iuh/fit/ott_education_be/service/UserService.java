package vn.edu.iuh.fit.ott_education_be.service;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.iuh.fit.ott_education_be.controller.request.UserPasswordRequest;
import vn.edu.iuh.fit.ott_education_be.controller.request.UserRegisterRequest;
import vn.edu.iuh.fit.ott_education_be.controller.request.UserUpdateRequest;
import vn.edu.iuh.fit.ott_education_be.controller.request.VerifyEmailRequest;
import vn.edu.iuh.fit.ott_education_be.controller.response.LogoutResponse;
import vn.edu.iuh.fit.ott_education_be.controller.response.RegisterResponse;
import vn.edu.iuh.fit.ott_education_be.controller.response.UserInfoResponse;
import vn.edu.iuh.fit.ott_education_be.controller.response.UserPasswordResponse;
import vn.edu.iuh.fit.ott_education_be.controller.response.UserResponse;
import vn.edu.iuh.fit.ott_education_be.controller.response.UserUpdateResponse;

import java.util.List;

public interface UserService extends UserDetailsService {
    RegisterResponse register(UserRegisterRequest request);

    UserUpdateResponse updateUser(UserUpdateRequest request, MultipartFile file);

    UserPasswordResponse updatePassword(UserPasswordRequest request);

    UserResponse getUserCurrent();

    LogoutResponse logoutUserCurrent(String token);

    void requestPasswordReset(String email);

    void resetPassword(String code, String newPassword);

    void resetPasswordByFirebasePhone(String phone, String idToken, String newPassword);

    List<UserResponse> findUsersByIds(List<String> ids);

    void sendVerificationEmail(String email);

    RegisterResponse verifyEmail(VerifyEmailRequest request);

    UserInfoResponse getUserByPhone(String phone);

    UserInfoResponse getUserById(String id);
}
