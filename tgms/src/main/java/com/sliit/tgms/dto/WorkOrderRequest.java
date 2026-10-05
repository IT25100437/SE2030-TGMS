package com.sliit.tgms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class WorkOrderRequest {

    @NotNull(message = "order id is required")
    private Long orderId;

    @NotBlank(message = "assigned production line/team is required")
    private String assignedLine;

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getAssignedLine() {
        return assignedLine;
    }

    public void setAssignedLine(String assignedLine) {
        this.assignedLine = assignedLine;
    }
}
