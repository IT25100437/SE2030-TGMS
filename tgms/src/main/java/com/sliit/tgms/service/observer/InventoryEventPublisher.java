package com.sliit.tgms.service.observer;

import com.sliit.tgms.model.InventoryItem;
import com.sliit.tgms.model.StockMovement;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class InventoryEventPublisher {

    private final List<InventoryObserver> observers;

    public InventoryEventPublisher(List<InventoryObserver> observers) {
        this.observers = observers;
    }

    public void notifyStockChanged(InventoryItem item, StockMovement movement) {
        for (InventoryObserver observer : observers) {
            observer.onStockChanged(item, movement);
        }
    }
}
