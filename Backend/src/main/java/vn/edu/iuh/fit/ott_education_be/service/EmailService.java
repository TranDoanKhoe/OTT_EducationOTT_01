package vn.edu.iuh.fit.ott_education_be.service;

public interface EmailService {
    void sendPasswordResetEmail(String email, String code);

    void sendVerificationEmail(String email, String code);
}
