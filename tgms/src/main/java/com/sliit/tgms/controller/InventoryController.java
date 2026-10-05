package com.sliit.tgms.controller;

import com.sliit.tgms.dto.InventoryItemRequest;
import com.sliit.tgms.dto.InventoryItemUpdateRequest;
import com.sliit.tgms.dto.StockMovementRequest;
import com.sliit.tgms.model.InventoryItem;
import com.sliit.tgms.model.StockMovement;
import com.sliit.tgms.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Inventory Management module - owned by Senevirathna B.S.M.R.S
 * (Inventory Manager persona).
 * Access restricted to INVENTORY_MANAGER / ADMIN, see SecurityConfig.
 */
@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    // Add a new inventory item
    @PostMapping
    public ResponseEntity<InventoryItem> addItem(
            @Valid @RequestBody InventoryItemRequest request) {

        InventoryItem saved = inventoryService.addItem(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }

    // Extra feature: update inventory item details
    // Quantity is not updated here.
    @PutMapping("/{id}")
    public ResponseEntity<InventoryItem> updateItem(
            @PathVariable Long id,
            @Valid @RequestBody InventoryItemUpdateRequest request) {

        InventoryItem updated =
                inventoryService.updateItem(id, request);

        return ResponseEntity.ok(updated);
    }

    // PBI-08: list / search / filter inventory
    //
    // GET /api/inventory
    // -> all active items
    //
    // GET /api/inventory?keyword=cotton
    // -> search by SKU or item name
    //
    // GET /api/inventory?type=RAW_MATERIAL
    // -> filter by category/type
    @GetMapping
    public ResponseEntity<List<InventoryItem>> listItems(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String type) {

        if (keyword != null || type != null) {
            return ResponseEntity.ok(
                    inventoryService.searchItems(keyword, type)
            );
        }

        return ResponseEntity.ok(
                inventoryService.getAllActiveItems()
        );
    }

    // PBI-07: low-stock alert list
    @GetMapping("/low-stock")
    public ResponseEntity<List<InventoryItem>> lowStockItems() {

        return ResponseEntity.ok(
                inventoryService.getLowStockItems()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventoryItem> getItem(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                inventoryService.getItemById(id)
        );
    }

    // PBI-06: record a stock-in / stock-out movement
    @PostMapping("/{id}/movements")
    public ResponseEntity<StockMovement> recordMovement(
            @PathVariable Long id,
            @Valid @RequestBody StockMovementRequest request) {

        StockMovement movement =
                inventoryService.recordMovement(id, request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(movement);
    }

    @GetMapping("/{id}/movements")
    public ResponseEntity<List<StockMovement>> movementHistory(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                inventoryService.getMovementHistory(id)
        );
    }

    // PBI-09: remove damaged/obsolete stock record
    // Soft delete
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeItem(
            @PathVariable Long id) {

        inventoryService.removeItem(id);

        return ResponseEntity.noContent().build();
    }

    // Permanent delete: physically removes the item (and its own stock movement
    // log) from the database. Refused if the item is used on any customer order.
    // Separate from the soft delete above.
    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentlyDeleteItem(
            @PathVariable Long id) {

        inventoryService.permanentlyDeleteItem(id);

        return ResponseEntity.noContent().build();
    }

    // PBI-10: export stock report to CSV
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportStockReport() {

        byte[] csv =
                inventoryService.exportStockReportToCsv();

        return ResponseEntity.ok()
                .contentType(
                        MediaType.parseMediaType("text/csv")
                )
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"stock-report.csv\""
                )
                .body(csv);
    }
}