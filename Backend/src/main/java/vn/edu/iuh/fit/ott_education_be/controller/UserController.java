

package vn.edu.iuh.fit.ott_education_be.controller;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.edu.iuh.fit.ott_education_be.controller.request.UserPasswordRequest;
import vn.edu.iuh.fit.ott_education_be.controller.request.UserUpdateRequest;
import vn.edu.iuh.fit.ott_education_be.controller.response.*;
import vn.edu.iuh.fit.ott_education_be.service.UserService;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@Slf4j(topic = "USER-CONTROLLER")
@RequiredArgsConstructor
@RequestMapping("/user")
public class UserController {
    private final UserService userService;

    @GetMapping("/get-info-for-user")
    public UserResponse getUserFromUsername() {
        log.info("Yêu cầu lấy thông tin người dùng");

        return userService.getUserCurrent();
    }

    @PutMapping(value = "/update", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserUpdateResponse updateUser(@RequestPart(value = "request") UserUpdateRequest request,
                                         @RequestPart(value = "avatar", required = false) MultipartFile file) {
        log.info("Yêu cầu cập nhật người dùng: {}", request.getEmail());

        return userService.updateUser(request, file);
    }

    @PostMapping("/change-password")
    public UserPasswordResponse changePassword(@RequestBody UserPasswordRequest request) {
        log.info("Yêu cầu đổi mật khẩu: {}", request);

        return userService.updatePassword(request);
    }

    @PostMapping("/logout")
    public LogoutResponse logoutUserCurrent(@RequestHeader("Authorization") String token) {
        log.info("Yêu cầu đăng xuất: {}", token);

        if (token == null || !token.startsWith("Bearer ")) {
            log.error("Định dạng header Authorization không hợp lệ");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Định dạng header Authorization không hợp lệ");
        }

        String accessToken = token.substring(7).trim();
        if (accessToken.isEmpty()) {
            log.error("Access token trống");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Access token trống");
        }

        return userService.logoutUserCurrent(accessToken);
    }

    @GetMapping("/get-user-by-phone/{phone}")
    public UserInfoResponse getUserByPhone(@PathVariable String phone) {
        log.info("Yêu cầu lấy thông tin người dùng theo số điện thoại: {}", phone);
        String normalizedPhone = phone.startsWith("0") ? phone : "0" + phone;

        return userService.getUserByPhone(normalizedPhone);
    }

    @GetMapping("/get-user-by-id/{id}")
    public UserInfoResponse getUserById(@PathVariable String id) {
        log.info("Yêu cầu lấy thông tin người dùng theo ID: {}", id);

        return userService.getUserById(id);
    }
}
