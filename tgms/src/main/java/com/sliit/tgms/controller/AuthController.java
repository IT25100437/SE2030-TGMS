package com.sliit.tgms.controller;

import com.sliit.tgms.dto.LoginRequest;
import com.sliit.tgms.model.User;
import com.sliit.tgms.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * PBI-26: Secure login with role-based access.
 * Session-based: a successful login stores the Authentication in the HTTP session
 * (via the JSESSIONID cookie), which SecurityConfig then uses to authorize later requests.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;

    public AuthController(AuthenticationManager authenticationManager, UserRepository userRepository) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);

            // Persist the security context into the HTTP session so it survives across requests
            httpRequest.getSession(true)
                    .setAttribute("SPRING_SECURITY_CONTEXT", context);

            User user = userRepository.findByUsername(request.getUsername()).orElseThrow();
            return ResponseEntity.ok(toUserInfo(user));

        } catch (BadCredentialsException ex) {
            Map<String, Object> body = new HashMap<>();
            body.put("message", "Invalid username or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        return ResponseEntity.ok(toUserInfo(user));
    }

    // Logout itself is handled declaratively by SecurityConfig (/api/auth/logout),
    // so no explicit @PostMapping("/logout") method is needed here.

    private Map<String, Object> toUserInfo(User user) {
        Map<String, Object> info = new HashMap<>();
        info.put("username", user.getUsername());
        info.put("fullName", user.getFullName());
        info.put("role", user.getRole().name());
        return info;
    }
}
