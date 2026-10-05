package com.sliit.tgms.controller;

import com.sliit.tgms.dto.ContractRequest;
import com.sliit.tgms.model.Contract;
import com.sliit.tgms.service.ContractService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contract terms are always attached to a supplier (PBI-02).
 * Nested under /api/suppliers/{supplierId}/contracts for creation + listing,
 * and a flat /api/contracts/{id} for updates, which is the natural REST shape here.
 */
@RestController
public class ContractController {

    private final ContractService contractService;

    public ContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    // PBI-02: Add contract terms for a supplier
    @PostMapping("/api/suppliers/{supplierId}/contracts")
    public ResponseEntity<Contract> addContract(
            @PathVariable Long supplierId, @Valid @RequestBody ContractRequest request) {
        Contract saved = contractService.addContract(supplierId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // View all contracts for one supplier
    @GetMapping("/api/suppliers/{supplierId}/contracts")
    public ResponseEntity<List<Contract>> getContractsForSupplier(@PathVariable Long supplierId) {
        return ResponseEntity.ok(contractService.getContractsForSupplier(supplierId));
    }

    // PBI-02: Update existing contract terms
    @PutMapping("/api/contracts/{contractId}")
    public ResponseEntity<Contract> updateContract(
            @PathVariable Long contractId, @Valid @RequestBody ContractRequest request) {
        return ResponseEntity.ok(contractService.updateContract(contractId, request));
    }
}
