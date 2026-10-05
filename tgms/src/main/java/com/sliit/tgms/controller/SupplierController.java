package com.sliit.tgms.controller;

import com.sliit.tgms.dto.SupplierRequest;
import com.sliit.tgms.model.Supplier;
import com.sliit.tgms.service.SupplierService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Supplier Management module - owned by Meewathura I.N.
 * Procurement Officer persona.
 */
@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierService supplierService;

    public SupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    // PBI-01: Register a new supplier
    @PostMapping
    public ResponseEntity<Supplier> registerSupplier(
            @Valid @RequestBody SupplierRequest request) {

        Supplier saved = supplierService.registerSupplier(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }

    // NEW: Edit / update supplier details
    @PutMapping("/{id}")
    public ResponseEntity<Supplier> updateSupplier(
            @PathVariable Long id,
            @Valid @RequestBody SupplierRequest request) {

        Supplier updated = supplierService.updateSupplier(id, request);

        return ResponseEntity.ok(updated);
    }

    // PBI-03: List / search / filter suppliers
    @GetMapping
    public ResponseEntity<List<Supplier>> listSuppliers(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String name) {

        if (category != null || name != null) {
            return ResponseEntity.ok(
                    supplierService.searchSuppliers(category, name)
            );
        }

        return ResponseEntity.ok(
                supplierService.getAllSuppliers()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Supplier> getSupplier(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                supplierService.getSupplierById(id)
        );
    }

    // PBI-04: Deactivate supplier
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<Supplier> deactivateSupplier(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                supplierService.deactivateSupplier(id)
        );
    }

    // Permanent delete: removes the supplier (and its contracts) from the database.
    // Separate from PBI-04 deactivate above.
    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentlyDeleteSupplier(
            @PathVariable Long id) {

        supplierService.permanentlyDeleteSupplier(id);

        return ResponseEntity.noContent().build();
    }

    // PBI-05: Export supplier list to CSV
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportSuppliers() {

        byte[] csv = supplierService.exportSuppliersToCsv();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"suppliers.csv\""
                )
                .body(csv);
    }
}