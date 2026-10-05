package com.sliit.tgms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Textile & Garment Management System (TGMS).
 *
 * Sprint 1 scope only:
 *  - Secure login with role-based access (PBI-26)
 *  - Supplier registration, contract terms, search/filter (PBI-01, PBI-02, PBI-03)
 *  - Inventory stock in/out, low-stock alerts, search/filter, soft-delete (PBI-06, 07, 08, 09)
 */
@SpringBootApplication
public class TgmsApplication {

    public static void main(String[] args) {
        SpringApplication.run(TgmsApplication.class, args);
    }
}
