

package vn.edu.iuh.fit.ott_education_be.service.impl;


import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.edu.iuh.fit.ott_education_be.common.TokenType;
import vn.edu.iuh.fit.ott_education_be.common.UserActiveStatus;
import vn.edu.iuh.fit.ott_education_be.common.UserStatus;
import vn.edu.iuh.fit.ott_education_be.controller.request.UserPasswordRequest;
import vn.edu.iuh.fit.ott_education_be.controller.request.UserRegisterRequest;
import vn.edu.iuh.fit.ott_education_be.controller.request.UserUpdateRequest;
import vn.edu.iuh.fit.ott_education_be.controller.request.VerifyEmailRequest;
import vn.edu.iuh.fit.ott_education_be.controller.response.*;
import vn.edu.iuh.fit.ott_education_be.exception.DulicatedUserException;
import vn.edu.iuh.fit.ott_education_be.exception.InvalidDataException;
import vn.edu.iuh.fit.ott_education_be.exception.UnauthorizedException;
import vn.edu.iuh.fit.ott_education_be.model.User;
import vn.edu.iuh.fit.ott_education_be.model.VerificationCode;
import vn.edu.iuh.fit.ott_education_be.repository.UserRepository;
import vn.edu.iuh.fit.ott_education_be.repository.VerificationCodeRepository;
import vn.edu.iuh.fit.ott_education_be.service.EmailService;
import vn.edu.iuh.fit.ott_education_be.service.JwtService;
import vn.edu.iuh.fit.ott_education_be.service.UserService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Slf4j(topic = "USER-SERVICE")
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final VerificationCodeRepository passwordResetTokenRepository;
    private final Cloudinary cloudinary;
    private final RandomCodeGenerator randomCodeGenerator;
    private final ObjectMapper objectMapper;

    @Value("${avatar.default}")
    private String avatarDefault;

    @Value("${spring.mail.reset-code-expiry-minutes}")
    private int resetCodeExpiryMinutes;

    @Value("${app.firebase.web-api-key:}")
    private String firebaseWebApiKey;

    @Override
    public RegisterResponse register(UserRegisterRequest request) {
        User user = userRepository.findByUsername(request.getUsername());
        if (user != null) {
            log.error("Username already exists");
            throw new DulicatedUserException("Tên đăng nhập đã tồn tại");
        }

        String rawPhone = request.getPhone();
        String normalizedPhone = (rawPhone != null && !rawPhone.startsWith("0")) ? "0" + rawPhone : rawPhone;

        User userByPhone = userRepository.findByPhone(normalizedPhone);
        if (userByPhone != null) {
            log.error("Phone number already exists");
            throw new DulicatedUserException("Số điện thoại đã tồn tại");
        }


        user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .phone(normalizedPhone)
                .avatar(avatarDefault)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .birthday(request.getBirthday())
                .gender(request.getGender())
                .status(UserStatus.ACTIVE)
                .build();

        user = userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getUsername());
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getUsername());

        return RegisterResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatar(user.getAvatar())
                .status(UserStatus.ACTIVE)
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .birthday(user.getBirthday())
                .gender(user.getGender())
                .accessToken(accessToken)
                .refreshToken(refreshToken).build();
    }

    @Override
    public UserUpdateResponse updateUser(UserUpdateRequest request, MultipartFile file) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal() instanceof String) {
            log.error("No authenticated user found");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        String username = authentication.getName();

        User user = userRepository.findByUsername(username);
        if (user == null) {
            log.error("User not found with username: {}", username);
            throw new UsernameNotFoundException("Không tìm thấy người dùng");
        }

        log.info("User loaded from DB with username: {} - id: {} ", user.getUsername(), user.getId());

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());
        user.setGender(request.getGender());
        user.setBirthday(request.getBirthday());

        if (file != null && !file.isEmpty()) {
            if (file.getSize() > 10 * 1024 * 1024) {
                log.error("File size exceeds limit");
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kích thước file vượt quá giới hạn");
            }

            String contentType = file.getContentType();
            if (contentType == null || (!contentType.startsWith("image/"))) {
                log.error("Invalid file type");
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loại file không hợp lệ");
            }

            try {
                Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap("resource_type", "image", "folder", "user_avatars"));
                String avatarUrl = (String) uploadResult.get("secure_url");
                user.setAvatar(avatarUrl);
                log.info("Avatar uploaded to Cloudinary: {} for user: {}", avatarUrl, user.getId());
            } catch (Exception e) {
                log.error("Error uploading avatar to Cloudinary: {}", e.getMessage());
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Tải avatar lên thất bại");
            }
        }

        log.info("User {} updated", user.getId());
        user = userRepository.save(user);

        return UserUpdateResponse.builder().firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .email(user.getEmail())
                .gender(user.getGender())
                .birthday(user.getBirthday())
                .avatar(user.getAvatar())
                .status(user.getStatus())
                .username(user.getUsername())
                .createdAt(user.getCreatedAt())
                .updateAt(user.getUpdateAt())
                .build();
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        User user = userRepository.findByUsername(username);
        if (user == null) {
            throw new UsernameNotFoundException("Không tìm thấy người dùng với tên đăng nhập: " + username);
        }
        return user;
    }

    @Override
    public UserPasswordResponse updatePassword(UserPasswordRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username);
        if (user == null) {
            throw new UsernameNotFoundException("Không tìm thấy người dùng");
        }

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu cũ không đúng");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        log.info("Password changed successfully for user: {}", username);

        return UserPasswordResponse.builder().message("Password changed successfully").build();
    }

    @Override
    public UserResponse getUserCurrent() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal() instanceof String) {
            log.error("No authenticated user found");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng chưa xác thực");
        }

        User user = (User) authentication.getPrincipal();

        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .birthday(user.getBirthday())
                .email(user.getEmail())
                .phone(user.getPhone())
                .gender(user.getGender())
                .status(user.getStatus())
                .avatar(user.getAvatar())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .updateAt(user.getUpdateAt())
                .build();
    }

    @Override
    public LogoutResponse logoutUserCurrent(String token) {
        log.info("Logging out user with token: {}", token);
        String username;
        try {
            username = jwtService.extractUsername(token, TokenType.ACCESS_TOKEN);
        } catch (IllegalArgumentException e) {
            log.error("Invalid access token format: {}", e.getMessage());
            throw new UnauthorizedException(HttpStatus.UNAUTHORIZED, "Định dạng access token không hợp lệ: " + e.getMessage());
        } catch (RuntimeException e) {
            log.error("Error extracting username from token: {}", e.getMessage());
            throw new UnauthorizedException(HttpStatus.UNAUTHORIZED, e.getMessage());
        }

        User user = userRepository.findByUsername(username);
        if (user == null) {
            log.error("Token is invalid or expired");
            throw new UnauthorizedException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ hoặc đã hết hạn");
        }

        jwtService.blackListToken(token, TokenType.ACCESS_TOKEN);
        user.setActiveStatus(UserActiveStatus.OFFLINE);
        userRepository.save(user);
        log.info("User {} logged out successfully", user.getUsername());

        log.info("Token blacklisted successfully for user: {}", username);
        return LogoutResponse.builder().message("Logout successfully").build();
    }

    @Override
    public void requestPasswordReset(String email) {
        log.info("Requesting password reset for email: {}", email);

        User user = userRepository.findByEmail(email);
        if (user == null) {
            log.error("User not found with email: {}", email);
            throw new InvalidDataException("Không tìm thấy người dùng");
        }
        passwordResetTokenRepository.deleteByEmail(user.getEmail());

        String code = randomCodeGenerator.generateCode();
        LocalDateTime expiryDate = LocalDateTime.now().plusMinutes(10);
        VerificationCode resetToken = new VerificationCode(code, email, expiryDate);
        passwordResetTokenRepository.save(resetToken);

        emailService.sendPasswordResetEmail(email, code);
        log.info("Đã tiếp nhận yêu cầu gửi mail đặt lại mật khẩu cho: {}", email);
    }

    @Override
    public void resetPassword(String code, String newPassword) {
        log.info("Resetting password with code: {}", code);

        if (code == null || code.trim().isEmpty()) {
            log.error("Code is null");
            throw new UnauthorizedException(HttpStatus.UNAUTHORIZED, "Token đặt lại không hợp lệ");
        }

        VerificationCode resetToken = passwordResetTokenRepository.findByCode(code);

        if (resetToken == null) {
            log.error("Reset token is null or empty");
            throw new UnauthorizedException(HttpStatus.UNAUTHORIZED, "Token đặt lại không hợp lệ");
        }

        User user = null;
        if (resetToken.getEmail() != null && !resetToken.getEmail().isBlank()) {
            user = userRepository.findByEmail(resetToken.getEmail());
        } else if (resetToken.getPhone() != null && !resetToken.getPhone().isBlank()) {
            user = userRepository.findByPhone(resetToken.getPhone());
        }

        if (user == null) {
            log.error("User not found with token target: email={}, phone={}", resetToken.getEmail(), resetToken.getPhone());
            throw new InvalidDataException("Không tìm thấy người dùng");
        }

        if (resetToken.isUsed()) {
            log.error("Reset token already used: {}", code);
            throw new UnauthorizedException(HttpStatus.UNAUTHORIZED, "Token đặt lại đã được sử dụng");
        }

        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            log.error("Reset token expired: {}", code);
            throw new UnauthorizedException(HttpStatus.UNAUTHORIZED, "Token đặt lại đã hết hạn");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        log.info("Password reset successfully for user: {}", user.getUsername());
    }

    @Override
    public void resetPasswordByFirebasePhone(String phone, String idToken, String newPassword) {
        log.info("Resetting password with Firebase OTP for phone: {}", phone);

        if (newPassword == null || newPassword.isBlank()) {
            throw new InvalidDataException("Mật khẩu mới không hợp lệ");
        }

        String normalizedPhone = normalizePhone(phone);
        String expectedE164 = toE164(normalizedPhone);

        verifyFirebaseTokenPhone(idToken, expectedE164);

        User user = userRepository.findByPhone(normalizedPhone);
        if (user == null) {
            log.error("User not found with phone: {}", normalizedPhone);
            throw new InvalidDataException("Không tìm thấy người dùng");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password reset by Firebase OTP successfully for user: {}", user.getUsername());
    }

    @Override
    public List<UserResponse> findUsersByIds(List<String> ids) {
        List<User> users = userRepository.findAllById(ids);
        return users.stream()
                .map(user -> new UserResponse(
                        user.getId(),
                        user.getUsername(),
                        user.getFirstName(),
                        user.getLastName(),
                        user.getBirthday(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getGender(),
                        user.getStatus(),
                        user.getAvatar(),
                        user.getRole(),
                        user.getCreatedAt(),
                        user.getUpdateAt()
                ))
                .collect(Collectors.toList());
    }

    @Override
    public void sendVerificationEmail(String email) {
        passwordResetTokenRepository.deleteByEmail(email);

        String code = randomCodeGenerator.generateCode();
        LocalDateTime expiryDate = LocalDateTime.now().plusMinutes(10);
        VerificationCode resetToken = new VerificationCode(code, email, expiryDate);
        passwordResetTokenRepository.save(resetToken);

        emailService.sendVerificationEmail(email, code);
        log.info("Đã tiếp nhận yêu cầu gửi mail xác thực cho: {}", email);

    }

    @Override
    public RegisterResponse verifyEmail(VerifyEmailRequest request) {
        log.info("Verification Email with code: {}", request.getCode());

        if (request.getCode() == null || request.getCode().trim().isEmpty()) {
            log.error("Code is null");
            throw new UnauthorizedException(HttpStatus.UNAUTHORIZED, "Mã không hợp lệ");
        }

        VerificationCode codeVerification = passwordResetTokenRepository.findByCode(request.getCode());

        validateCode(codeVerification);

        User user = userRepository.findByUsername(request.getUserRegisterRequest().getUsername());
        if (user != null) {
            throw new DulicatedUserException("Người dùng đã tồn tại");
        }

        String rawPhone = request.getUserRegisterRequest().getPhone();
        String normalizedPhone = (rawPhone != null && !rawPhone.startsWith("0")) ? "0" + rawPhone : rawPhone;

        User userByPhone = userRepository.findByPhone(normalizedPhone);
        if (userByPhone != null) {
            log.error("Phone number already exists");
            throw new DulicatedUserException("Số điện thoại đã tồn tại");
        }

        user = User.builder()
                .username(request.getUserRegisterRequest().getUsername())
                .password(passwordEncoder.encode(request.getUserRegisterRequest().getPassword()))
                .email(request.getUserRegisterRequest().getEmail())
                .phone(normalizedPhone)
                .avatar(avatarDefault)
                .firstName(request.getUserRegisterRequest().getFirstName())
                .lastName(request.getUserRegisterRequest().getLastName())
                .birthday(request.getUserRegisterRequest().getBirthday())
                .gender(request.getUserRegisterRequest().getGender())
                .status(UserStatus.ACTIVE)
                .build();

        user = userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getUsername());
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getUsername());

        return RegisterResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatar(user.getAvatar())
                .status(UserStatus.ACTIVE)
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .birthday(user.getBirthday())
                .gender(user.getGender())
                .activeStatus(UserActiveStatus.OFFLINE)
                .accessToken(accessToken)
                .refreshToken(refreshToken).build();
    }

    @Override
    public UserInfoResponse getUserByPhone(String phone) {
        User user = userRepository.findByPhone(phone);
        if(user == null){
            log.error("User not found with phone: {}", phone);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng");
        }

        return UserInfoResponse.builder()
                .id(user.getId())
                .name(user.getFirstName() + " " + user.getLastName())
                .phone(user.getPhone())
                .avatar(user.getAvatar())
                .build();
    }

    @Override
    public UserInfoResponse getUserById(String id) {
        User user = userRepository.findById(id).orElse(null);
        if(user == null){
            log.error("User not found with id: {}", id);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng");
        }

        return UserInfoResponse.builder()
                .id(user.getId())
                .name(user.getFirstName() + " " + user.getLastName())
                .phone(user.getPhone())
                .avatar(user.getAvatar())
                .build();
    }

    private void validateCode(VerificationCode code) {
        if (code.isUsed()) {
            log.error("Code already used: {}", code);
            throw new UnauthorizedException(HttpStatus.UNAUTHORIZED, "Mã đã được sử dụng");
        }

        if (code.getExpiryDate().isBefore(LocalDateTime.now())) {
            log.error("Code expired: {}", code);
            throw new UnauthorizedException(HttpStatus.UNAUTHORIZED, "Mã đã hết hạn");
        }
    }

    private String normalizePhone(String phone) {
        String cleaned = phone == null ? "" : phone.replaceAll("\\s+", "").trim();
        if (cleaned.startsWith("+840")) {
            return "0" + cleaned.substring(4);
        }
        if (cleaned.startsWith("+84")) {
            return "0" + cleaned.substring(3);
        }
        if (cleaned.startsWith("84")) {
            return "0" + cleaned.substring(2);
        }
        return cleaned;
    }

    private String toE164(String normalizedPhone) {
        if (normalizedPhone == null || normalizedPhone.isBlank()) {
            return "";
        }
        String cleaned = normalizedPhone.replaceAll("\\s+", "").trim();
        if (cleaned.startsWith("+84")) {
            return cleaned;
        }
        if (cleaned.startsWith("0")) {
            return "+84" + cleaned.substring(1);
        }
        if (cleaned.startsWith("84")) {
            return "+" + cleaned;
        }
        return "+84" + cleaned;
    }

    private void verifyFirebaseTokenPhone(String idToken, String expectedPhoneE164) {
        if (idToken == null || idToken.isBlank()) {
            throw new UnauthorizedException(HttpStatus.UNAUTHORIZED, "Firebase token không hợp lệ");
        }

        if (firebaseWebApiKey == null || firebaseWebApiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Thiếu cấu hình app.firebase.web-api-key");
        }

        try {
            String url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + firebaseWebApiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(
                    objectMapper.writeValueAsString(Map.of("idToken", idToken)),
                    headers);

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.POST, entity, JsonNode.class);

            JsonNode body = response.getBody();
            JsonNode users = body == null ? null : body.get("users");

            if (users == null || !users.isArray() || users.isEmpty()) {
                throw new UnauthorizedException(HttpStatus.UNAUTHORIZED, "Firebase OTP không hợp lệ hoặc đã hết hạn");
            }

            JsonNode userNode = users.get(0);
            String tokenPhone = userNode.hasNonNull("phoneNumber") ? userNode.get("phoneNumber").asText() : "";

            if (!expectedPhoneE164.equals(tokenPhone)) {
                throw new UnauthorizedException(HttpStatus.UNAUTHORIZED, "Số điện thoại OTP không khớp");
            }
        } catch (UnauthorizedException e) {
            throw e;
        } catch (Exception e) {
            log.error("Firebase token verification failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Xác thực OTP Firebase thất bại");
        }
    }
}
