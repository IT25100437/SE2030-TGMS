package com.sliit.tgms.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * One historical log entry per stage a WorkOrder has passed through (PBI-18).
 * endDate is null while the stage is the current/active one; PBI-19's bottleneck
 * alert and PBI-20's daily output summary both read this table.
 */
@Entity
@Table(name = "production_stages")
public class ProductionStage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductionStageName stageName;

    @Column(nullable = false)
    private LocalDateTime startDate = LocalDateTime.now();

    private LocalDateTime endDate;

    public ProductionStage() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public WorkOrder getWorkOrder() {
        return workOrder;
    }

    public void setWorkOrder(WorkOrder workOrder) {
        this.workOrder = workOrder;
    }

    public ProductionStageName getStageName() {
        return stageName;
    }

    public void setStageName(ProductionStageName stageName) {
        this.stageName = stageName;
    }

    public LocalDateTime getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDateTime startDate) {
        this.startDate = startDate;
    }

    public LocalDateTime getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDateTime endDate) {
        this.endDate = endDate;
    }
}