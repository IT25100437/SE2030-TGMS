package com.sliit.tgms.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public class OrderItemRequest {

    @NotNull(message = "inventory item id is required")
    private Long inventoryItemId;

    @Positive(message = "quantity must be greater than zero")
    private int quantity;

    @NotNull(message = "price is required")
    @DecimalMin(value = "0.01", message = "price must be greater than zero")
    private BigDecimal price;

    public Long getInventoryItemId() {
        return inventoryItemId;
    }

    public void setInventoryItemId(Long inventoryItemId) {
        this.inventoryItemId = inventoryItemId;
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
