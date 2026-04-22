package vn.edu.iuh.fit.ott_education_be.exception;

// Raised when username, email, or phone already exists.

public class DulicatedUserException extends RuntimeException {
    public DulicatedUserException(String message) {
        super(message);
    }
}
