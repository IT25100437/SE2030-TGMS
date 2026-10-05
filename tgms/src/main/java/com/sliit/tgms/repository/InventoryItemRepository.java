package com.sliit.tgms.repository;

import com.sliit.tgms.model.InventoryItem;
import com.sliit.tgms.model.InventoryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {

    Optional<InventoryItem> findBySku(String sku);

    boolean existsBySku(String sku);

    // Only items not soft-deleted are ever shown in normal views
    List<InventoryItem> findByActiveTrue();

    // PBI-08: search & filter by SKU or item name, and optionally by type (raw material / finished good)
    List<InventoryItem> findByActiveTrueAndSkuContainingIgnoreCaseOrActiveTrueAndItemNameContainingIgnoreCase(
            String sku, String itemName);

    List<InventoryItem> findByActiveTrueAndType(InventoryType type);

    // PBI-07: low-stock alert -> quantity has dropped to or below the item's own threshold
    @Query("SELECT i FROM InventoryItem i WHERE i.active = true AND i.quantity <= i.threshold")
    List<InventoryItem> findLowStockItems();
}
