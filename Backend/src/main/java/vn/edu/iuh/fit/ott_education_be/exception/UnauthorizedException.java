package vn.edu.iuh.fit.ott_education_be.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

// Raised when authentication or token validation fails.

@Getter
public class UnauthorizedException extends RuntimeException {
    private final HttpStatus status;

    public UnauthorizedException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}
