package com.sliit.tgms.repository;

import com.sliit.tgms.model.Order;
import com.sliit.tgms.model.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    // PBI-13: track orders by their current status
    List<Order> findByStatus(OrderStatus status);

    // Used by Customer permanent delete: orders.customer_id is a NOT NULL foreign key,
    // so a customer with orders on record must not be physically deleted.
    long countByCustomerId(Long customerId);
}
