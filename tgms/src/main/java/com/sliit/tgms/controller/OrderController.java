package com.sliit.tgms.controller;

import com.sliit.tgms.dto.OrderRequest;
import com.sliit.tgms.dto.OrderStatusUpdateRequest;
import com.sliit.tgms.model.Invoice;
import com.sliit.tgms.model.Order;
import com.sliit.tgms.model.OrderStatus;
import com.sliit.tgms.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Order Management module - owned by Ranatunga Y.U.K (Sales Officer persona).
 * Access restricted to SALES_OFFICER / ADMIN, see SecurityConfig.
 */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // PBI-11: create a new draft order
    @PostMapping
    public ResponseEntity<Order> createOrder(@Valid @RequestBody OrderRequest request) {
        Order saved = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // PBI-13: list all orders, or filter by status, e.g. GET /api/orders?status=CONFIRMED
    @GetMapping
    public ResponseEntity<List<Order>> listOrders(@RequestParam(required = false) OrderStatus status) {
        if (status != null) {
            return ResponseEntity.ok(orderService.getOrdersByStatus(status));
        }
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    // PBI-12: confirm a draft order (deducts stock, generates an invoice)
    @PatchMapping("/{id}/confirm")
    public ResponseEntity<Order> confirmOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.confirmOrder(id));
    }

    // PBI-14: move the order through Confirmed -> Shipped -> Delivered / Cancelled
    @PatchMapping("/{id}/status")
    public ResponseEntity<Order> updateStatus(@PathVariable Long id, @Valid @RequestBody OrderStatusUpdateRequest request) {
        return ResponseEntity.ok(orderService.updateStatus(id, request.getStatus()));
    }

    // PBI-15: delete a draft/unconfirmed order
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        orderService.deleteDraftOrder(id);
        return ResponseEntity.noContent().build();
    }

    // PBI-12: view the invoice generated for a confirmed order
    @GetMapping("/{id}/invoice")
    public ResponseEntity<Invoice> getInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getInvoiceForOrder(id));
    }
}
