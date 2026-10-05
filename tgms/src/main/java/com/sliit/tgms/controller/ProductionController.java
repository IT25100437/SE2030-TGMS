package com.sliit.tgms.controller;

import com.sliit.tgms.dto.StageUpdateRequest;
import com.sliit.tgms.dto.WorkOrderRequest;
import com.sliit.tgms.model.ProductionStage;
import com.sliit.tgms.model.WorkOrder;
import com.sliit.tgms.service.ProductionService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Production Management module - owned by Herathnayake H.M.D.L (Production Manager persona).
 * Access restricted to PRODUCTION_MANAGER / ADMIN, see SecurityConfig.
 */
@RestController
@RequestMapping("/api/production")
public class ProductionController {

    private final ProductionService productionService;

    public ProductionController(ProductionService productionService) {
        this.productionService = productionService;
    }

    // PBI-16 (+ PBI-17 embedded): create a work order from a confirmed order
    @PostMapping("/work-orders")
    public ResponseEntity<WorkOrder> createWorkOrder(@Valid @RequestBody WorkOrderRequest request) {
        WorkOrder saved = productionService.createWorkOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/work-orders")
    public ResponseEntity<List<WorkOrder>> listWorkOrders() {
        return ResponseEntity.ok(productionService.getAllWorkOrders());
    }

    @GetMapping("/work-orders/{id}")
    public ResponseEntity<WorkOrder> getWorkOrder(@PathVariable Long id) {
        return ResponseEntity.ok(productionService.getWorkOrderById(id));
    }

    @GetMapping("/work-orders/{id}/stages")
    public ResponseEntity<List<ProductionStage>> getStageHistory(@PathVariable Long id) {
        return ResponseEntity.ok(productionService.getStageHistory(id));
    }

    // PBI-18: move the work order forward to the next stage
    @PatchMapping("/work-orders/{id}/stage")
    public ResponseEntity<WorkOrder> updateStage(@PathVariable Long id, @Valid @RequestBody StageUpdateRequest request) {
        return ResponseEntity.ok(productionService.updateStage(id, request.getStage()));
    }

    // Cancel a work order that hasn't started production yet
    @PatchMapping("/work-orders/{id}/cancel")
    public ResponseEntity<WorkOrder> cancelWorkOrder(@PathVariable Long id) {
        return ResponseEntity.ok(productionService.cancelWorkOrder(id));
    }

    // Permanent delete: removes a CANCELLED work order (and its stage history)
    // from the database. Separate from the cancel action above.
    @DeleteMapping("/work-orders/{id}")
    public ResponseEntity<Void> permanentlyDeleteWorkOrder(@PathVariable Long id) {
        productionService.permanentlyDeleteWorkOrder(id);
        return ResponseEntity.noContent().build();
    }

    // PBI-19: bottleneck / delay alert
    @GetMapping("/bottlenecks")
    public ResponseEntity<List<WorkOrder>> getBottlenecks() {
        return ResponseEntity.ok(productionService.getBottleneckAlerts());
    }

    // PBI-20: daily output summary, grouped by production line. Defaults to today.
    @GetMapping("/output-summary")
    public ResponseEntity<Map<String, Long>> getDailyOutputSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = (date != null) ? date : LocalDate.now();
        return ResponseEntity.ok(productionService.getDailyOutputSummary(target));
    }
}
