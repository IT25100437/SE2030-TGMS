package com.sliit.tgms.service;

import com.sliit.tgms.dto.ReportPinRequest;
import com.sliit.tgms.dto.ReportScheduleRequest;
import com.sliit.tgms.exception.BadRequestException;
import com.sliit.tgms.exception.ResourceNotFoundException;
import com.sliit.tgms.model.*;
import com.sliit.tgms.repository.*;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReportsService {
    private final SupplierRepository supplierRepository;
    private final ContractRepository contractRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final OrderRepository orderRepository;
    private final InvoiceRepository invoiceRepository;
    private final WorkOrderRepository workOrderRepository;
    private final ProductionStageRepository productionStageRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final ReportScheduleRepository reportScheduleRepository;
    private final ReportPinRepository reportPinRepository;

    public ReportsService(SupplierRepository supplierRepository,
                          ContractRepository contractRepository,
                          InventoryItemRepository inventoryItemRepository,
                          OrderRepository orderRepository,
                          InvoiceRepository invoiceRepository,
                          WorkOrderRepository workOrderRepository,
                          ProductionStageRepository productionStageRepository,
                          EmployeeRepository employeeRepository,
                          AttendanceRepository attendanceRepository,
                          ReportScheduleRepository reportScheduleRepository,
                          ReportPinRepository reportPinRepository) {
        this.supplierRepository = supplierRepository;
        this.contractRepository = contractRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.orderRepository = orderRepository;
        this.invoiceRepository = invoiceRepository;
        this.workOrderRepository = workOrderRepository;
        this.productionStageRepository = productionStageRepository;
        this.employeeRepository = employeeRepository;
        this.attendanceRepository = attendanceRepository;
        this.reportScheduleRepository = reportScheduleRepository;
        this.reportPinRepository = reportPinRepository;
    }

    private void validateReportType(String type) {
        if (type == null || !Set.of("ORDERS", "INVENTORY", "PRODUCTION", "EMPLOYEES", "SUPPLIERS").contains(type)) {
            throw new BadRequestException("Invalid report type");
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getKpis() {
        List<Order> orders = orderRepository.findAll();
        List<InventoryItem> inventory = inventoryItemRepository.findByActiveTrue();
        List<Employee> employees = employeeRepository.findAll();
        List<WorkOrder> workOrders = workOrderRepository.findAll();
        List<Supplier> suppliers = supplierRepository.findAll();

        BigDecimal totalSales = orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.DRAFT)
                .map(Order::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("totalOrders", orders.size());
        kpis.put("confirmedOrders", orders.stream().filter(o -> o.getStatus() == OrderStatus.CONFIRMED).count());
        kpis.put("shippedOrders", orders.stream().filter(o -> o.getStatus() == OrderStatus.SHIPPED).count());
        kpis.put("deliveredOrders", orders.stream().filter(o -> o.getStatus() == OrderStatus.DELIVERED).count());
        kpis.put("totalSales", totalSales);
        kpis.put("totalInventoryItems", inventory.size());
        kpis.put("lowStockItems", inventory.stream().filter(InventoryItem::isLowStock).count());
        kpis.put("activeSuppliers", suppliers.stream().filter(s -> s.getStatus() == SupplierStatus.ACTIVE).count());
        kpis.put("activeEmployees", employees.stream().filter(e -> e.getStatus() == EmployeeStatus.ACTIVE).count());
        kpis.put("activeWorkOrders", workOrders.stream().filter(w -> w.getStatus() != ProductionStageName.COMPLETED).count());
        kpis.put("completedWorkOrders", workOrders.stream().filter(w -> w.getStatus() == ProductionStageName.COMPLETED).count());
        return kpis;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getReport(String type) {
        validateReportType(type);
        return switch (type) {
            case "ORDERS" -> orderRepository.findAll().stream().map(o -> {
                Map<String,Object> r = new LinkedHashMap<>();
                r.put("Order ID", o.getId());
                r.put("Customer", o.getCustomer() != null ? o.getCustomer().getName() : "-");
                r.put("Status", o.getStatus());
                r.put("Order Date", o.getOrderDate());
                r.put("Total", o.getTotalAmount());
                r.put("Invoice", invoiceRepository.findByOrderId(o.getId()).map(i -> i.getAmount()).orElse(BigDecimal.ZERO));
                return r;
            }).toList();
            case "INVENTORY" -> inventoryItemRepository.findAll().stream().map(i -> {
                Map<String,Object> r = new LinkedHashMap<>();
                r.put("SKU", i.getSku()); r.put("Item", i.getItemName()); r.put("Type", i.getType());
                r.put("Quantity", i.getQuantity()); r.put("Threshold", i.getThreshold());
                r.put("Location", i.getLocation()); r.put("Active", i.isActive()); return r;
            }).toList();
            case "PRODUCTION" -> workOrderRepository.findAll().stream().map(w -> {
                Map<String,Object> r = new LinkedHashMap<>();
                r.put("Work Order", w.getId()); r.put("Order", w.getOrder().getId());
                r.put("Line", w.getAssignedLine()); r.put("Status", w.getStatus()); r.put("Created", w.getCreatedDate());
                return r;
            }).toList();
            case "EMPLOYEES" -> employeeRepository.findAll().stream().map(e -> {
                Map<String,Object> r = new LinkedHashMap<>();
                r.put("Employee ID", e.getId()); r.put("Name", e.getName()); r.put("Department", e.getDepartment());
                r.put("Role", e.getRole()); r.put("Status", e.getStatus()); return r;
            }).toList();
            case "SUPPLIERS" -> supplierRepository.findAll().stream().map(s -> {
                Map<String,Object> r = new LinkedHashMap<>();
                r.put("Supplier ID", s.getId()); r.put("Name", s.getName()); r.put("Contact", s.getContact());
                r.put("Material Category", s.getMaterialCategory()); r.put("Status", s.getStatus());
                r.put("Contracts", contractRepository.findBySupplierId(s.getId()).size()); return r;
            }).toList();
            default -> List.of();
        };
    }

    @Transactional(readOnly = true)
    public List<ReportSchedule> getSchedules(String username) {
        return reportScheduleRepository.findByCreatedByOrderByScheduledTimeAsc(username);
    }

    public ReportSchedule createSchedule(ReportScheduleRequest request, String username) {
        validateReportType(request.getReportType());
        validateFrequency(request.getFrequency());
        ReportSchedule s = new ReportSchedule();
        s.setReportType(request.getReportType()); s.setFrequency(request.getFrequency());
        s.setScheduledTime(request.getScheduledTime()); s.setEnabled(request.isEnabled()); s.setCreatedBy(username);
        return reportScheduleRepository.save(s);
    }

    public ReportSchedule updateSchedule(Long id, ReportScheduleRequest request, String username) {
        validateReportType(request.getReportType()); validateFrequency(request.getFrequency());
        ReportSchedule s = reportScheduleRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Report schedule not found"));
        if (!s.getCreatedBy().equals(username)) throw new BadRequestException("You cannot modify this schedule");
        s.setReportType(request.getReportType()); s.setFrequency(request.getFrequency());
        s.setScheduledTime(request.getScheduledTime()); s.setEnabled(request.isEnabled());
        return reportScheduleRepository.save(s);
    }

    public void deleteSchedule(Long id, String username) {
        ReportSchedule s = reportScheduleRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Report schedule not found"));
        if (!s.getCreatedBy().equals(username)) throw new BadRequestException("You cannot delete this schedule");
        reportScheduleRepository.delete(s);
    }

    private void validateFrequency(String frequency) {
        if (frequency == null || !Set.of("DAILY", "WEEKLY", "MONTHLY").contains(frequency)) {
            throw new BadRequestException("Frequency must be DAILY, WEEKLY or MONTHLY");
        }
    }

    @Transactional(readOnly = true)
    public List<ReportPin> getPins(String username) { return reportPinRepository.findByUsernameOrderByCreatedAtDesc(username); }

    public ReportPin createPin(ReportPinRequest request, String username) {
        validateReportType(request.getReportType());
        if (reportPinRepository.findByReportTypeAndUsername(request.getReportType(), username).isPresent()) {
            throw new BadRequestException("This report is already pinned");
        }
        ReportPin p = new ReportPin(); p.setReportType(request.getReportType()); p.setReportName(request.getReportName()); p.setUsername(username);
        return reportPinRepository.save(p);
    }

    public void deletePin(Long id, String username) {
        ReportPin p = reportPinRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Pinned report not found"));
        if (!p.getUsername().equals(username)) throw new BadRequestException("You cannot delete this pinned report");
        reportPinRepository.delete(p);
    }

    public byte[] exportExcel(String type) {
        List<Map<String,Object>> rows = getReport(type);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(type);
            if (rows.isEmpty()) { workbook.write(out); return out.toByteArray(); }
            List<String> headers = new ArrayList<>(rows.get(0).keySet());
            Row header = sheet.createRow(0);
            for (int i=0;i<headers.size();i++) header.createCell(i).setCellValue(headers.get(i));
            for (int r=0;r<rows.size();r++) {
                Row row = sheet.createRow(r+1); Map<String,Object> data = rows.get(r);
                for (int c=0;c<headers.size();c++) row.createCell(c).setCellValue(String.valueOf(data.get(headers.get(c))));
            }
            for (int i=0;i<headers.size();i++) sheet.autoSizeColumn(i);
            workbook.write(out); return out.toByteArray();
        } catch (IOException e) { throw new IllegalStateException("Could not create Excel report", e); }
    }
}
