package com.sliit.tgms.exception;

/**
 * Thrown for business-rule violations that aren't simple field validation, e.g.
 * "cannot remove more stock than is available", "end date before start date".
 * Mapped to HTTP 400.
 */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
