
package vn.edu.iuh.fit.ott_education_be.controller;


import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.edu.iuh.fit.ott_education_be.common.UserRole;
import vn.edu.iuh.fit.ott_education_be.controller.request.SignInRequest;
import vn.edu.iuh.fit.ott_education_be.controller.request.UserRegisterRequest;
import vn.edu.iuh.fit.ott_education_be.controller.request.VerifyEmailRequest;
import vn.edu.iuh.fit.ott_education_be.controller.response.RegisterResponse;
import vn.edu.iuh.fit.ott_education_be.controller.response.SignInResponse;
import vn.edu.iuh.fit.ott_education_be.exception.UnauthorizedException;
import vn.edu.iuh.fit.ott_education_be.model.User;
import vn.edu.iuh.fit.ott_education_be.repository.UserRepository;
import vn.edu.iuh.fit.ott_education_be.service.AuthenticationService;
import vn.edu.iuh.fit.ott_education_be.service.UserService;

import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@Slf4j(topic = "AUTHENTICATION-CONTROLLER")
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthenticationController {
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private final AuthenticationService authenticationService;
    private final UserService userService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập vào ứng dụng", description = "Endpoint này cho phép người dùng đăng nhập vào ứng dụng.")
    public SignInResponse login(@RequestBody SignInRequest request) {
        log.info("Login request: {}", request);

        return authenticationService.getAccessToken(request);
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản mới", description = "Endpoint này cho phép người dùng đăng ký một tài khoản mới.")
    public RegisterResponse register(@RequestBody UserRegisterRequest request) {
        log.info("Register request: {}", request);

        return userService.register(request);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> requestResetPassword(@RequestBody Map<String, String> request){
        String email = normalizeEmail(request.get("email"));
        if (!isValidEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email không hợp lệ"));
        }

        log.info("Request reset password for email: {}", email);

        try{
            userService.requestPasswordReset(email);
            return ResponseEntity.ok(Map.of("message", "Đã gửi link đặt lại mật khẩu đến email của bạn"));
        }catch (ResponseStatusException e) {
            log.error("Lỗi khi xử lý yêu cầu đặt lại mật khẩu cho email {}: {}", email, e.getMessage());
            return ResponseEntity.status(e.getStatusCode())
                    .body(Map.of("error", e.getReason()));
        } catch (Exception e) {
            log.error("Lỗi không mong đợi khi xử lý yêu cầu đặt lại mật khẩu: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Gửi link đặt lại thất bại"));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> request) {
        String code = request.get("code");
        String password = request.get("password");
        try {
            userService.resetPassword(code, password);
            return ResponseEntity.ok(Map.of("message", "Đặt lại mật khẩu thành công"));
        } catch (UnauthorizedException | ResponseStatusException e) {
            log.error("Lỗi khi đặt lại mật khẩu: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Lỗi không mong đợi khi đặt lại mật khẩu: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Đặt lại mật khẩu thất bại"));
        }
    }

    @PostMapping("/reset-password-firebase-phone")
    public ResponseEntity<Map<String, String>> resetPasswordByFirebasePhone(@RequestBody Map<String, String> request) {
        String phone = normalizePhone(request.get("phone"));
        String idToken = request.get("idToken");
        String password = request.get("password");

        if (!isValidPhone(phone)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Số điện thoại không hợp lệ"));
        }

        if (idToken == null || idToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Thiếu Firebase ID token"));
        }

        if (password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mật khẩu mới không hợp lệ"));
        }

        try {
            userService.resetPasswordByFirebasePhone(phone, idToken, password);
            return ResponseEntity.ok(Map.of("message", "Đặt lại mật khẩu thành công"));
        } catch (UnauthorizedException | ResponseStatusException e) {
            log.error("Lỗi xác thực Firebase OTP cho {}: {}", phone, e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Lỗi không mong đợi khi đặt lại mật khẩu bằng Firebase OTP: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Đặt lại mật khẩu thất bại"));
        }
    }

    @PostMapping(value = "/verify-email", consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_PLAIN_VALUE})
    public ResponseEntity<Map<String, String>> sendVerificationEmail(@RequestBody String payload) {
        String email = payload;

        if (payload != null && payload.trim().startsWith("{")) {
            try {
                JsonNode root = objectMapper.readTree(payload);
                JsonNode emailNode = root.get("email");
                email = emailNode == null ? null : emailNode.asText();
            } catch (Exception ignored) {
            }
        }

        if (email != null) {
            email = email.replace("\"", "").trim();
        }

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email không hợp lệ"));
        }

        email = normalizeEmail(email);
        if (!isValidEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email không hợp lệ"));
        }

        log.info("Đang gửi email xác thực đến: {}", email);
        userService.sendVerificationEmail(email);
        return ResponseEntity.ok(Map.of("message", "Đã tiếp nhận yêu cầu gửi mã xác thực"));
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        return email.trim().toLowerCase();
    }

    private boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }

    private String normalizePhone(String phone) {
        if (phone == null) return null;

        String cleaned = phone.replaceAll("\\s+", "").trim();
        if (cleaned.startsWith("+840")) {
            return "+84" + cleaned.substring(4);
        }
        if (cleaned.startsWith("84") && !cleaned.startsWith("+84")) {
            return "+" + cleaned;
        }
        return cleaned;
    }

    private boolean isValidPhone(String phone) {
        if (phone == null || phone.isBlank()) return false;
        return phone.matches("^0\\d{9}$") || phone.matches("^\\+84\\d{9}$");
    }

    @PostMapping("/verify-email-code")
    public ResponseEntity<RegisterResponse> verifyEmail(@RequestBody VerifyEmailRequest request) {
        log.info("Đang xác thực email với mã: {}", request.getCode());
        RegisterResponse response = userService.verifyEmail(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/check-role")
    @Operation(summary = "Kiểm tra quyền của user hiện tại", description = "Endpoint này cho phép kiểm tra user có phải là admin hay không")
    public ResponseEntity<Map<String, Object>> checkUserRole(Principal principal) {
        try {
            if (principal == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "isAdmin", false));
            }
            
            User currentUser = userRepository.findByUsername(principal.getName());
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found", "isAdmin", false));
            }
            
            boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;
            String role = currentUser.getRole() != null ? currentUser.getRole().name() : "STUDENT";
            
            return ResponseEntity.ok(Map.of(
                    "isAdmin", isAdmin,
                    "role", role,
                    "userId", currentUser.getId(),
                    "username", currentUser.getUsername()
            ));
        } catch (Exception e) {
            log.error("Error checking user role: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage(), "isAdmin", false));
        }
    }

    
}
