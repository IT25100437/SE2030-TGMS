package com.sliit.tgms.controller;

import com.sliit.tgms.dto.CustomerRequest;
import com.sliit.tgms.model.Customer;
import com.sliit.tgms.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Customer records used by the Order Management module.
 *
 * Customers are external stakeholders and do not have system logins.
 * The Sales Officer can register, view and update customer details.
 */
@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    // Register a new customer
    @PostMapping
    public ResponseEntity<Customer> registerCustomer(
            @Valid @RequestBody CustomerRequest request) {

        Customer saved =
                customerService.registerCustomer(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }

    // Get all registered customers
    @GetMapping
    public ResponseEntity<List<Customer>> listCustomers() {

        return ResponseEntity.ok(
                customerService.getAllCustomers()
        );
    }

    // Get one customer
    @GetMapping("/{id}")
    public ResponseEntity<Customer> getCustomer(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                customerService.getCustomerById(id)
        );
    }

    // Extra feature: update customer details
    @PutMapping("/{id}")
    public ResponseEntity<Customer> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest request) {

        Customer updated =
                customerService.updateCustomer(id, request);

        return ResponseEntity.ok(updated);
    }

    // Permanent delete: removes a customer that has no orders from the database.
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> permanentlyDeleteCustomer(
            @PathVariable Long id) {

        customerService.permanentlyDeleteCustomer(id);

        return ResponseEntity.noContent().build();
    }
}