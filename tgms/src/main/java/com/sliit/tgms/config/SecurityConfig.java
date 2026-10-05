package com.sliit.tgms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.http.HttpStatus;

/**
 * PBI-26: Secure login with Role-Based Access.
 *
 * Rules cover Sprint 1, 2 and 3 modules:
 *   - /api/suppliers/**  and /api/contracts/**  -> PROCUREMENT_OFFICER or ADMIN
 *   - /api/inventory/**  (writes)                -> INVENTORY_MANAGER or ADMIN
 *   - /api/inventory/**  (GET only)               -> also SALES_OFFICER (to browse stock for orders)
 *   - /api/orders/**     and /api/customers/**  -> SALES_OFFICER or ADMIN
 *   - /api/production/** -> PRODUCTION_MANAGER or ADMIN
 *   - /api/employees/**  -> HR_MANAGER or ADMIN
 *
 * Login is session-based (a cookie is issued after a successful POST /api/auth/login),
 * which is simpler to reason about than JWT for a student project and works fine since
 * the frontend is served by this same Spring Boot app.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CSRF is disabled for simplicity in this teaching project. In a production system
            // you would keep CSRF protection enabled and send the token from the frontend.
            .csrf(csrf -> csrf.disable())

            .sessionManagement(session -> session
                    .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))

            .authorizeHttpRequests(auth -> auth
                    // Static frontend files and the login endpoint are open to everyone
                    .requestMatchers("/", "/index.html", "/login.html", "/dashboard.html",
                            "/suppliers.html", "/inventory.html", "/orders.html",
                            "/production.html", "/employees.html",
                            "/css/**", "/js/**", "/favicon.ico").permitAll()
                    .requestMatchers("/api/auth/login").permitAll()

                    // Supplier Management module (Meewathura) - PBI-01, 02, 03, 04, 05
                    .requestMatchers("/api/suppliers/**", "/api/contracts/**")
                        .hasAnyRole("PROCUREMENT_OFFICER", "ADMIN")

                    // Inventory Management module (Senevirathna) - PBI-06, 07, 08, 09, 10.
                    // Sales Officers get read-only (GET) access so they can browse stock while
                    // building an order (PBI-11) - this rule must come BEFORE the general one
                    // below, since Spring Security uses the first matching rule.
                    .requestMatchers(HttpMethod.GET, "/api/inventory/**")
                        .hasAnyRole("INVENTORY_MANAGER", "SALES_OFFICER", "ADMIN")
                    .requestMatchers("/api/inventory/**")
                        .hasAnyRole("INVENTORY_MANAGER", "ADMIN")

                    // Order Management module (Ranatunga) - PBI-11, 12, 13, 14, 15.
                    // Production Managers get read-only (GET) access so they can pick a
                    // CONFIRMED order to build a work order from (PBI-16) - this rule must
                    // come BEFORE the general one below, since Spring Security uses the
                    // first matching rule (same pattern as the Inventory carve-out above).
                    .requestMatchers(HttpMethod.GET, "/api/orders/**")
                        .hasAnyRole("SALES_OFFICER", "PRODUCTION_MANAGER", "ADMIN")
                    .requestMatchers("/api/orders/**", "/api/customers/**")
                        .hasAnyRole("SALES_OFFICER", "ADMIN")

                    // Production Management module (Herathnayake) - PBI-16, 17, 18, 19, 20
                    .requestMatchers("/api/production/**")
                        .hasAnyRole("PRODUCTION_MANAGER", "ADMIN")

                    // Employee Management module (Bandara) - PBI-21, 22, 23, 24, 25
                    .requestMatchers("/api/employees/**")
                        .hasAnyRole("HR_MANAGER", "ADMIN")

                    // Reports & Analytics module (Dayananda) - PBI-27 to PBI-31
                    .requestMatchers("/api/reports/**")
                        .hasRole("ADMIN")

                    // Everything else (e.g. /api/auth/me, /api/auth/logout) just needs a login
                    .anyRequest().authenticated())

            // Return 401 JSON instead of redirecting to a login page when an API call
            // is unauthenticated - much easier for the frontend JS to handle.
            .exceptionHandling(ex -> ex
                    .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))

            .logout(logout -> logout
                    .logoutUrl("/api/auth/logout")
                    .logoutSuccessHandler((request, response, authentication) ->
                            response.setStatus(HttpStatus.OK.value()))
                    .invalidateHttpSession(true)
                    .deleteCookies("JSESSIONID"));

        return http.build();
    }
}
