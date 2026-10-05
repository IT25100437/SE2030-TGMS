package com.sliit.tgms.dto;

import com.sliit.tgms.model.StockDirection;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class StockMovementRequest {

    @Positive(message = "quantity must be greater than zero")
    private int quantity;

    @NotNull(message = "direction is required (IN or OUT)")
    private StockDirection direction;

    private String note;

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

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
