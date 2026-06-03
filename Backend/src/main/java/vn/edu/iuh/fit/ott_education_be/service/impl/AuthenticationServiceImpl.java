

package vn.edu.iuh.fit.ott_education_be.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.edu.iuh.fit.ott_education_be.common.UserActiveStatus;
import vn.edu.iuh.fit.ott_education_be.controller.request.SignInRequest;
import vn.edu.iuh.fit.ott_education_be.controller.response.SignInResponse;
import vn.edu.iuh.fit.ott_education_be.exception.InvalidDataException;
import vn.edu.iuh.fit.ott_education_be.model.User;
import vn.edu.iuh.fit.ott_education_be.repository.UserRepository;
import vn.edu.iuh.fit.ott_education_be.service.AuthenticationService;
import vn.edu.iuh.fit.ott_education_be.service.JwtService;

import static vn.edu.iuh.fit.ott_education_be.common.TokenType.REFRESH_TOKEN;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "AUTHENTICATION-SERVICE")
public class AuthenticationServiceImpl implements AuthenticationService {
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Override
    public SignInResponse getAccessToken(SignInRequest request) {
        log.info("Get Access Token");

        User user;
        try {
            log.info("Username: {}, Password: {}", request.getUsername(), request.getPassword());
            Authentication authenticate = authenticationManager
                    .authenticate(new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

            log.info("isAuthenticated: {}", authenticate.isAuthenticated());

            SecurityContextHolder.getContext().setAuthentication(authenticate);

            user = (User) authenticate.getPrincipal();
            String accessToken = jwtService.generateAccessToken(user.getId(), request.getUsername());
            String refreshToken = jwtService.generateRefreshToken(user.getId(), request.getUsername());

            log.info("accessToken: {}", accessToken);
            log.info("refreshToken: {}", refreshToken);

            return SignInResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .userId(user.getId())
                    .username(user.getUsername())
                    .activeStatus(UserActiveStatus.ONLINE)
                    .role(user.getRole())
                    .build();

        } catch (BadCredentialsException e) {
            log.error("Invalid credentials: {}", e.getMessage());
            throw new AccessDeniedException("Tên đăng nhập hoặc mật khẩu không đúng");
        } catch (DisabledException e) {
            log.error("Account disabled: {}", e.getMessage());
            throw new AccessDeniedException("Tài khoản đã bị vô hiệu hóa");
        } catch (Exception e) {
            log.error("Unexpected error during login: {}", e.getMessage());
            throw new AccessDeniedException("Đăng nhập thất bại");
        }
    }

    @Override
    public SignInResponse getRefreshToken(String refreshToken) {
        log.info("Get Refresh Token");

        if (!StringUtils.hasLength(refreshToken)) {
            throw new InvalidDataException("Token không được để trống");
        }

        try {
            String username = jwtService.extractUsername(refreshToken, REFRESH_TOKEN);

            User user = userRepository.findByUsername(username);

            String accessToken = jwtService.generateAccessToken(user.getId(), user.getUsername());

            return SignInResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .userId(user.getId())
                    .username(user.getUsername())
                    .activeStatus(UserActiveStatus.ONLINE)
                    .role(user.getRole())
                    .build();
        } catch (Exception e) {
            log.error("Refresh token failed, message: {} ", e.getMessage());
            throw new AccessDeniedException(e.getMessage());
        }

    }
}
