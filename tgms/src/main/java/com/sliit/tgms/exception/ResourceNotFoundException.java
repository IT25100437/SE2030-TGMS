package com.sliit.tgms.exception;

/** Thrown when a supplier, contract, or inventory item id doesn't exist. Mapped to HTTP 404. */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
