package com.sliit.tgms.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * A single stock-in or stock-out event against an InventoryItem (PBI-06).
 * Every movement is kept permanently (never deleted/edited) so that the quantity on
 * InventoryItem can always be explained by its movement history - this is
 * the audit trail referenced in FR-08 of the spec.
 */
@Entity
@Table(name = "stock_movements")
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "item_id", nullable = false)
    private InventoryItem item;

    @Column(nullable = false)
    private int quantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private StockDirection direction;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(length = 255)
    private String note;

    public StockMovement() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public InventoryItem getItem() {
        return item;
    }

    public void setItem(InventoryItem item) {
        this.item = item;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public StockDirection getDirection() {
        return direction;
    }

    public void setDirection(StockDirection direction) {
        this.direction = direction;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}