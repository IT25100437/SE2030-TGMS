package com.sliit.tgms.dto;

import com.sliit.tgms.model.InventoryType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public class InventoryItemRequest {

    @NotBlank(message = "SKU is required")
    private String sku;

    @NotBlank(message = "item name is required")
    private String itemName;

    @NotNull(message = "type is required (RAW_MATERIAL or FINISHED_GOOD)")
    private InventoryType type;

    @PositiveOrZero(message = "quantity cannot be negative")
    private int quantity;

    @Min(value = 0, message = "threshold cannot be negative")
    private int threshold;

    @NotBlank(message = "location is required")
    private String location;

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
}
