package com.sliit.tgms.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "work_orders")
public class WorkOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    @Column(nullable = false, length = 100)
    private String assignedLine;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductionStageName status = ProductionStageName.PENDING;

    @Column(nullable = false)
    private LocalDateTime createdDate = LocalDateTime.now();

    public WorkOrder() {
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

    public String getAssignedLine() {
        return assignedLine;
    }

    public void setAssignedLine(String assignedLine) {
        this.assignedLine = assignedLine;
    }

    public ProductionStageName getStatus() {
        return status;
    }

    public void setStatus(ProductionStageName status) {
        this.status = status;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(LocalDateTime createdDate) {
        this.createdDate = createdDate;
    }
}