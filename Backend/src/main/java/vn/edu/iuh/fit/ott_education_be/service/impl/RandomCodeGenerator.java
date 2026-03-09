package vn.edu.iuh.fit.ott_education_be.service.impl;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class RandomCodeGenerator {
    private final SecureRandom secureRandom = new SecureRandom();

    public String generateCode() {
        int value = secureRandom.nextInt(900000) + 100000;
        return String.valueOf(value);
    }
}
