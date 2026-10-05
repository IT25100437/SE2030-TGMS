package com.sliit.tgms.service;

import com.sliit.tgms.dto.InventoryItemRequest;
import com.sliit.tgms.dto.InventoryItemUpdateRequest;
import com.sliit.tgms.dto.StockMovementRequest;
import com.sliit.tgms.exception.BadRequestException;
import com.sliit.tgms.exception.ResourceNotFoundException;
import com.sliit.tgms.model.InventoryItem;
import com.sliit.tgms.model.StockDirection;
import com.sliit.tgms.model.StockMovement;
import com.sliit.tgms.repository.InventoryItemRepository;
import com.sliit.tgms.repository.OrderItemRepository;
import com.sliit.tgms.repository.StockMovementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class InventoryService {

    private final InventoryItemRepository itemRepository;
    private final StockMovementRepository movementRepository;
    private final OrderItemRepository orderItemRepository;

    public InventoryService(InventoryItemRepository itemRepository,
                            StockMovementRepository movementRepository,
                            OrderItemRepository orderItemRepository) {
        this.itemRepository = itemRepository;
        this.movementRepository = movementRepository;
        this.orderItemRepository = orderItemRepository;
    }

    // Add a new inventory item (raw material or finished good)
    public InventoryItem addItem(InventoryItemRequest request) {
        if (itemRepository.existsBySku(request.getSku())) {
            throw new BadRequestException(
                    "An inventory item with SKU '" + request.getSku() + "' already exists"
            );
        }

        InventoryItem item = new InventoryItem();
        item.setSku(request.getSku());
        item.setItemName(request.getItemName());
        item.setType(request.getType());
        item.setQuantity(request.getQuantity());
        item.setThreshold(request.getThreshold());
        item.setLocation(request.getLocation());

        return itemRepository.save(item);
    }

    public List<InventoryItem> getAllActiveItems() {
        return itemRepository.findByActiveTrue();
    }

    public InventoryItem getItemById(Long id) {
        InventoryItem item = itemRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Inventory item not found with id: " + id
                        )
                );

        if (!item.isActive()) {
            throw new ResourceNotFoundException(
                    "Inventory item with id " + id + " has been removed"
            );
        }

        return item;
    }

    // Extra feature: update inventory item details.
    // Quantity is intentionally NOT changed here.
    // Quantity must be changed through stock-in / stock-out movements.
    public InventoryItem updateItem(Long id, InventoryItemUpdateRequest request) {
        InventoryItem item = getItemById(id);

        item.setItemName(request.getItemName());
        item.setType(request.getType());
        item.setThreshold(request.getThreshold());
        item.setLocation(request.getLocation());

        return itemRepository.save(item);
    }

    // PBI-08: search & filter inventory by category (type)
    // and/or a SKU/name keyword
    public List<InventoryItem> searchItems(String keyword, String type) {
        List<InventoryItem> results;

        if (keyword != null && !keyword.isBlank()) {
            results = itemRepository
                    .findByActiveTrueAndSkuContainingIgnoreCaseOrActiveTrueAndItemNameContainingIgnoreCase(
                            keyword,
                            keyword
                    );
        } else {
            results = itemRepository.findByActiveTrue();
        }

        if (type != null && !type.isBlank()) {
            results.removeIf(item ->
                    !item.getType().name().equalsIgnoreCase(type)
            );
        }

        return results;
    }

    // PBI-07: low-stock alert
    public List<InventoryItem> getLowStockItems() {
        return itemRepository.findLowStockItems();
    }

    // PBI-06: record a stock-in or stock-out movement
    // and update the running quantity
    @Transactional
    public StockMovement recordMovement(
            Long itemId,
            StockMovementRequest request) {

        InventoryItem item = getItemById(itemId);

        if (request.getDirection() == StockDirection.OUT
                && request.getQuantity() > item.getQuantity()) {

            throw new BadRequestException(
                    "Cannot remove "
                            + request.getQuantity()
                            + " units - only "
                            + item.getQuantity()
                            + " currently in stock"
            );
        }

        int newQuantity =
                request.getDirection() == StockDirection.IN
                        ? item.getQuantity() + request.getQuantity()
                        : item.getQuantity() - request.getQuantity();

        item.setQuantity(newQuantity);
        itemRepository.save(item);

        StockMovement movement = new StockMovement();
        movement.setItem(item);
        movement.setQuantity(request.getQuantity());
        movement.setDirection(request.getDirection());
        movement.setNote(request.getNote());

        return movementRepository.save(movement);
    }

    public List<StockMovement> getMovementHistory(Long itemId) {
        getItemById(itemId);

        return movementRepository.findByItemIdOrderByTimestampDesc(itemId);
    }

    // PBI-09: remove a damaged/obsolete stock record
    // Soft delete - never hard-deletes the row
    public void removeItem(Long itemId) {
        InventoryItem item = getItemById(itemId);

        item.setActive(false);

        itemRepository.save(item);
    }

    // Permanent delete: physically removes the inventory item row from SQL Server.
    // Separate from PBI-09 (removeItem), which only hides the item (soft delete).
    //
    // Safety rules, based on the actual foreign keys:
    //  - order_items.item_id -> inventory_items: if the item is on ANY customer order
    //    it is refused with a clear message (deleting it would break order history).
    //  - stock_movements.item_id -> inventory_items: the item's own movement log is
    //    removed first (same transaction) so SQL Server does not raise an FK error.
    @Transactional
    public void permanentlyDeleteItem(Long itemId) {

        // Looked up directly (not via getItemById) so that an item which was
        // previously soft-deleted can still be permanently deleted.
        InventoryItem item = itemRepository.findById(itemId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Inventory item not found with id: " + itemId
                        )
                );

        if (orderItemRepository.existsByInventoryItemId(itemId)) {
            throw new BadRequestException(
                    "Cannot permanently delete item '" + item.getSku()
                            + "' because it is used in existing customer orders. "
                            + "Use Remove (deactivate) instead to hide it while keeping the order history."
            );
        }

        List<StockMovement> movements =
                movementRepository.findByItemIdOrderByTimestampDesc(itemId);
        movementRepository.deleteAll(movements);
        movementRepository.flush();

        itemRepository.delete(item);
    }

    // PBI-10: export current stock levels as CSV
    public byte[] exportStockReportToCsv() {

        StringBuilder csv = new StringBuilder(
                "SKU,Item Name,Category,Quantity,Threshold,Location,Status\n"
        );

        for (InventoryItem item : itemRepository.findByActiveTrue()) {

            csv.append(escapeCsv(item.getSku())).append(',')
                    .append(escapeCsv(item.getItemName())).append(',')
                    .append(item.getType()).append(',')
                    .append(item.getQuantity()).append(',')
                    .append(item.getThreshold()).append(',')
                    .append(escapeCsv(item.getLocation())).append(',')
                    .append(item.isLowStock() ? "LOW" : "OK")
                    .append('\n');
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    // Wraps a value in quotes if it contains a comma or quote
    private String escapeCsv(String value) {

        if (value == null) {
            return "";
        }

        if (value.contains(",") || value.contains("\"")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }

        return value;
    }
}