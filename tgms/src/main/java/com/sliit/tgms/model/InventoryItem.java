package com.sliit.tgms.model;

import jakarta.persistence.*;

/**
 * Inventory Management module (owned by Senevirathna B.S.M.R.S / Inventory Manager persona).
 * Covers PBI-06 (stock movements), PBI-07 (low-stock alert), PBI-08 (search/filter),
 * and PBI-09 (soft-delete removal via the `active` flag, per the project's status-based
 * soft-delete convention described in the Final Report).
 */
@Entity
@Table(name = "inventory_items")
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String sku;

    @Column(nullable = false, length = 150)
    private String itemName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InventoryType type;

    @Column(nullable = false)
    private int quantity = 0;

    // If quantity <= threshold, the item shows up in the low-stock alert (PBI-07).
    @Column(nullable = false)
    private int threshold;

    @Column(nullable = false, length = 100)
    private String location;

    // Soft-delete flag for PBI-09: "remove" never deletes the row, just hides it from
    // active views, matching the audit-trail requirement (FR-08) in the spec.
    @Column(nullable = false)
    private boolean active = true;

    public InventoryItem() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public InventoryType getType() {
        return type;
    }

    public void setType(InventoryType type) {
        this.type = type;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public int getThreshold() {
        return threshold;
    }

    public void setThreshold(int threshold) {
        this.threshold = threshold;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    // Convenience method used by the service/controller layer - not persisted.
    @Transient
    public boolean isLowStock() {
        return quantity <= threshold;
    }
}
