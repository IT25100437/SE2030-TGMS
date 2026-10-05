package com.sliit.tgms.service.observer;

import com.sliit.tgms.model.InventoryItem;
import com.sliit.tgms.model.StockMovement;

public interface InventoryObserver {
    void onStockChanged(InventoryItem item, StockMovement movement);
}
