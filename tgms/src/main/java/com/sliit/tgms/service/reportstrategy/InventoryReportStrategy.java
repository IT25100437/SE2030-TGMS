package com.sliit.tgms.service.reportstrategy;

import com.sliit.tgms.repository.InventoryItemRepository;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class InventoryReportStrategy implements ReportStrategy {
    private final InventoryItemRepository repository;
    public InventoryReportStrategy(InventoryItemRepository repository) { this.repository = repository; }
    @Override public String getType() { return "INVENTORY"; }
    @Override public List<Map<String, Object>> generate() {
        return repository.findAll().stream().map(i -> {
            Map<String,Object> r = new LinkedHashMap<>();
            r.put("SKU", i.getSku()); r.put("Item", i.getItemName()); r.put("Type", i.getType());
            r.put("Quantity", i.getQuantity()); r.put("Threshold", i.getThreshold());
            r.put("Location", i.getLocation()); r.put("Active", i.isActive());
            return r;
        }).toList();
    }
}
