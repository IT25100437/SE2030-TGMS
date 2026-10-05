package com.sliit.tgms.service.reportstrategy;

import com.sliit.tgms.repository.EmployeeRepository;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class EmployeesReportStrategy implements ReportStrategy {
    private final EmployeeRepository repository;
    public EmployeesReportStrategy(EmployeeRepository repository) { this.repository = repository; }
    @Override public String getType() { return "EMPLOYEES"; }
    @Override public List<Map<String, Object>> generate() {
        return repository.findAll().stream().map(e -> {
            Map<String,Object> r = new LinkedHashMap<>();
            r.put("Employee ID", e.getId()); r.put("Name", e.getName()); r.put("Department", e.getDepartment());
            r.put("Role", e.getRole()); r.put("Status", e.getStatus());
            return r;
        }).toList();
    }
}
