package com.sliit.tgms.service.reportstrategy;

import com.sliit.tgms.repository.WorkOrderRepository;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class ProductionReportStrategy implements ReportStrategy {
    private final WorkOrderRepository repository;
    public ProductionReportStrategy(WorkOrderRepository repository) { this.repository = repository; }
    @Override public String getType() { return "PRODUCTION"; }
    @Override public List<Map<String, Object>> generate() {
        return repository.findAll().stream().map(w -> {
            Map<String,Object> r = new LinkedHashMap<>();
            r.put("Work Order", w.getId()); r.put("Order", w.getOrder().getId());
            r.put("Line", w.getAssignedLine()); r.put("Status", w.getStatus()); r.put("Created", w.getCreatedDate());
            return r;
        }).toList();
    }
}
