package com.sliit.tgms.service.observer;

import com.sliit.tgms.model.InventoryItem;
import com.sliit.tgms.model.StockMovement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LowStockInventoryObserver implements InventoryObserver {

    private static final Logger log = LoggerFactory.getLogger(LowStockInventoryObserver.class);

    @Override
    public void onStockChanged(InventoryItem item, StockMovement movement) {
        if (item.isLowStock()) {
            log.warn("Low-stock alert: SKU {} has {} units remaining (threshold {}).",
                    item.getSku(), item.getQuantity(), item.getThreshold());
        }
    }
}
