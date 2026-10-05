package com.sliit.tgms.repository;

import com.sliit.tgms.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    // Used by Inventory permanent delete: an item that appears on any customer
    // order line must not be physically deleted (order_items.item_id is a foreign key).
    boolean existsByInventoryItemId(Long inventoryItemId);
}
