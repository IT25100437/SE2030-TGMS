package com.sliit.tgms.service.factory;

import com.sliit.tgms.dto.OrderItemRequest;
import com.sliit.tgms.model.InventoryItem;
import com.sliit.tgms.model.Order;
import com.sliit.tgms.model.OrderItem;
import org.springframework.stereotype.Component;

@Component
public class OrderItemFactory {

    public OrderItem create(Order order, InventoryItem inventoryItem, OrderItemRequest request) {
        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setInventoryItem(inventoryItem);
        item.setQuantity(request.getQuantity());
        item.setPrice(request.getPrice());
        return item;
    }
}
