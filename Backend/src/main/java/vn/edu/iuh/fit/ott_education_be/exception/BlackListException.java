package vn.edu.iuh.fit.ott_education_be.exception;

import org.springframework.http.HttpStatus;

public class BlackListException extends RuntimeException {
    public BlackListException(HttpStatus notFound, String message) {
        super(message);
    }
}
