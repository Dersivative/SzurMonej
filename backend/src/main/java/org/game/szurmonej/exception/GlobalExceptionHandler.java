package org.game.szurmonej.exception;

import org.game.szurmonej.dto.ErrorResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(value = { EmailAlreadyExistsException.class })
    protected ResponseEntity<Object> handleEmailConflict(EmailAlreadyExistsException ex, WebRequest request) {
        ErrorResponse bodyOfResponse = new ErrorResponse(ex.getMessage());
        return handleExceptionInternal(ex, bodyOfResponse, new HttpHeaders(), HttpStatus.BAD_REQUEST, request);
    }

    @ExceptionHandler(value = { DataIntegrityViolationException.class })
    public ResponseEntity<Object> handleDataIntegrityViolation(DataIntegrityViolationException ex, WebRequest request) {
        String message = "Naruszenie integralności danych. Prawdopodobnie próbujesz użyć wartości, która już istnieje (np. email).";
        // Check for more specific constraint violation if possible
        if (ex.getMostSpecificCause().getMessage().contains("ConstraintViolationException")) {
             message = "Użytkownik o podanym adresie email już istnieje.";
        }
        ErrorResponse bodyOfResponse = new ErrorResponse(message);
        return new ResponseEntity<>(bodyOfResponse, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(value = { ForbiddenOperationException.class })
    protected ResponseEntity<Object> handleForbidden(ForbiddenOperationException ex, WebRequest request) {
        ErrorResponse bodyOfResponse = new ErrorResponse(ex.getMessage());
        return handleExceptionInternal(ex, bodyOfResponse, new HttpHeaders(), HttpStatus.FORBIDDEN, request);
    }

    @ExceptionHandler(value = { ResponseStatusException.class })
    protected ResponseEntity<Object> handleResponseStatus(ResponseStatusException ex, WebRequest request) {
        ErrorResponse bodyOfResponse = new ErrorResponse(ex.getReason());
        return handleExceptionInternal(ex, bodyOfResponse, new HttpHeaders(), ex.getStatusCode(), request);
    }

    @ExceptionHandler(value = { ResourceNotFoundException.class })
    protected ResponseEntity<Object> handleNotFound(ResourceNotFoundException ex, WebRequest request) {
        ErrorResponse bodyOfResponse = new ErrorResponse(ex.getMessage());
        return handleExceptionInternal(ex, bodyOfResponse, new HttpHeaders(), HttpStatus.NOT_FOUND, request);
    }

    @ExceptionHandler(value = { IllegalArgumentException.class })
    protected ResponseEntity<Object> handleIllegalArgument(IllegalArgumentException ex, WebRequest request) {
        ErrorResponse bodyOfResponse = new ErrorResponse(ex.getMessage());
        return handleExceptionInternal(ex, bodyOfResponse, new HttpHeaders(), HttpStatus.BAD_REQUEST, request);
    }

    @ExceptionHandler(value = { InsufficientFundsException.class })
    protected ResponseEntity<Object> handleInsufficientFunds(InsufficientFundsException ex, WebRequest request) {
        ErrorResponse bodyOfResponse = new ErrorResponse(ex.getMessage());
        return handleExceptionInternal(ex, bodyOfResponse, new HttpHeaders(), HttpStatus.BAD_REQUEST, request);
    }

    // A final catch-all for any other unexpected exceptions
    @ExceptionHandler(value = { Exception.class })
    public ResponseEntity<Object> handleAllExceptions(Exception ex, WebRequest request) {
        // Pass the actual, specific exception message to the frontend.
        String errorMessage = ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred without a specific message.";
        ErrorResponse bodyOfResponse = new ErrorResponse(errorMessage);
        // Log the full error for debugging on the server
        ex.printStackTrace();
        return new ResponseEntity<>(bodyOfResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}