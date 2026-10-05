package com.sliit.tgms.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;

import java.math.BigDecimal;

/**
 * One line item on an Order, linking it to an existing InventoryItem.
 *
 * OrderItem is part of Order Management and integrates with Inventory Management.
 * The Sales Officer selects an existing inventory item when creating an order.
 */
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Many OrderItems belong to one Order.
     *
     * LAZY is kept here because Order already controls the relationship and
     * @JsonBackReference prevents the Order -> OrderItem -> Order loop.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonBackReference
    private Order order;

    /**
     * Each OrderItem refers to an InventoryItem.
     *
     * EAGER is important here because the Order Management frontend needs
     * the inventory item details when an Order is returned as JSON.
     *
     * This also prevents:
     * "Could not initialize proxy [InventoryItem#...] - no Session"
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "item_id", nullable = false)
    private InventoryItem inventoryItem;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    public OrderItem() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Order getOrder() {
        return order;
    }

    public void setOrder(Order order) {
        this.order = order;
    }

    public InventoryItem getInventoryItem() {
        return inventoryItem;
    }

    public void setInventoryItem(InventoryItem inventoryItem) {
        this.inventoryItem = inventoryItem;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }
}