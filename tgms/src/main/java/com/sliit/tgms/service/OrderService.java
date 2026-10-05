package com.sliit.tgms.service;

import com.sliit.tgms.dto.OrderItemRequest;
import com.sliit.tgms.dto.OrderRequest;
import com.sliit.tgms.dto.StockMovementRequest;
import com.sliit.tgms.exception.BadRequestException;
import com.sliit.tgms.exception.ResourceNotFoundException;
import com.sliit.tgms.model.*;
import com.sliit.tgms.repository.InvoiceRepository;
import com.sliit.tgms.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Order Management module (Ranatunga Y.U.K / Sales Officer persona).
 *
 * This service deliberately does NOT duplicate any Inventory logic - it calls the
 * existing InventoryService (built in Sprint 1) to check stock and record stock-out
 * movements when an order is confirmed. That is the "integrate Orders with Inventory"
 * requirement from the spec, satisfied by reuse rather than by rewriting Inventory code.
 */
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final InvoiceRepository invoiceRepository;
    private final CustomerService customerService;
    private final InventoryService inventoryService;

    public OrderService(OrderRepository orderRepository,
                         InvoiceRepository invoiceRepository,
                         CustomerService customerService,
                         InventoryService inventoryService) {
        this.orderRepository = orderRepository;
        this.invoiceRepository = invoiceRepository;
        this.customerService = customerService;
        this.inventoryService = inventoryService;
    }

    // PBI-11: Create a new customer order (starts life as DRAFT - not yet confirmed)
    @Transactional
    public Order createOrder(OrderRequest request) {
        Customer customer = customerService.getCustomerById(request.getCustomerId());

        Order order = new Order();
        order.setCustomer(customer);
        order.setStatus(OrderStatus.DRAFT);
        order.setOrderDate(LocalDateTime.now());

        BigDecimal total = BigDecimal.ZERO;
        for (OrderItemRequest itemReq : request.getItems()) {
            // Reuses InventoryService - throws 404 automatically if the item doesn't
            // exist or has been soft-deleted (PBI-09), so we don't re-check that here.
            InventoryItem inventoryItem = inventoryService.getItemById(itemReq.getInventoryItemId());

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setInventoryItem(inventoryItem);
            orderItem.setQuantity(itemReq.getQuantity());
            orderItem.setPrice(itemReq.getPrice());
            order.getItems().add(orderItem);

            total = total.add(itemReq.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity())));
        }
        order.setTotalAmount(total);

        return orderRepository.save(order); // cascades and saves the order items too
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    // PBI-13: track orders, optionally filtered by status
    public List<Order> getOrdersByStatus(OrderStatus status) {
        return orderRepository.findByStatus(status);
    }

    public Order getOrderById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
    }

    // PBI-12: confirm a draft order -> deducts stock via InventoryService, generates an Invoice
    @Transactional
    public Order confirmOrder(Long orderId) {
        Order order = getOrderById(orderId);
        if (order.getStatus() != OrderStatus.DRAFT) {
            throw new BadRequestException("Only DRAFT orders can be confirmed (current status: " + order.getStatus() + ")");
        }

        for (OrderItem item : order.getItems()) {
            StockMovementRequest movement = new StockMovementRequest();
            movement.setDirection(StockDirection.OUT);
            movement.setQuantity(item.getQuantity());
            movement.setNote("Order #" + order.getId() + " confirmed");
            // Reuses InventoryService.recordMovement, which already validates there is
            // enough stock and throws BadRequestException if not - no duplicated logic here.
            inventoryService.recordMovement(item.getInventoryItem().getId(), movement);
        }

        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);

        Invoice invoice = new Invoice();
        invoice.setOrder(order);
        invoice.setAmount(order.getTotalAmount());
        invoiceRepository.save(invoice);

        return order;
    }

    // PBI-14: move an order through Confirmed -> Shipped -> Delivered (or Cancelled)
    public Order updateStatus(Long orderId, OrderStatus newStatus) {
        Order order = getOrderById(orderId);
        OrderStatus current = order.getStatus();

        boolean validTransition = switch (current) {
            case CONFIRMED -> newStatus == OrderStatus.SHIPPED || newStatus == OrderStatus.CANCELLED;
            case SHIPPED -> newStatus == OrderStatus.DELIVERED;
            default -> false;
        };

        if (!validTransition) {
            throw new BadRequestException("Cannot change order status from " + current + " to " + newStatus);
        }

        order.setStatus(newStatus);
        return orderRepository.save(order);
    }

    // PBI-15: delete a draft/unconfirmed order (mistakes only - confirmed orders are never hard-deleted)
    public void deleteDraftOrder(Long orderId) {
        Order order = getOrderById(orderId);
        if (order.getStatus() != OrderStatus.DRAFT) {
            throw new BadRequestException("Only DRAFT (unconfirmed) orders can be deleted");
        }
        orderRepository.delete(order);
    }

    // Supports the invoice view for a confirmed order (PBI-12)
    public Invoice getInvoiceForOrder(Long orderId) {
        return invoiceRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("No invoice found for order id: " + orderId
                        + " (order may not be confirmed yet)"));
    }
}
