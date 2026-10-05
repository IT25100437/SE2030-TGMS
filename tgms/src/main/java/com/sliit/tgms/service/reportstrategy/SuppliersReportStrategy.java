package com.sliit.tgms.service.reportstrategy;

import com.sliit.tgms.repository.ContractRepository;
import com.sliit.tgms.repository.SupplierRepository;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class SuppliersReportStrategy implements ReportStrategy {
    private final SupplierRepository supplierRepository;
    private final ContractRepository contractRepository;

    public SuppliersReportStrategy(SupplierRepository supplierRepository, ContractRepository contractRepository) {
        this.supplierRepository = supplierRepository;
        this.contractRepository = contractRepository;
    }

    @Override public String getType() { return "SUPPLIERS"; }
    @Override public List<Map<String, Object>> generate() {
        return supplierRepository.findAll().stream().map(s -> {
            Map<String,Object> r = new LinkedHashMap<>();
            r.put("Supplier ID", s.getId()); r.put("Name", s.getName()); r.put("Contact", s.getContact());
            r.put("Material Category", s.getMaterialCategory()); r.put("Status", s.getStatus());
            r.put("Contracts", contractRepository.findBySupplierId(s.getId()).size());
            return r;
        }).toList();
    }
}
