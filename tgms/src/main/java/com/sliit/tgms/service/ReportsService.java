package com.sliit.tgms.service;

import com.sliit.tgms.dto.ReportPinRequest;
import com.sliit.tgms.dto.ReportScheduleRequest;
import com.sliit.tgms.exception.BadRequestException;
import com.sliit.tgms.exception.ResourceNotFoundException;
import com.sliit.tgms.model.*;
import com.sliit.tgms.repository.*;
import com.sliit.tgms.service.reportstrategy.ReportStrategy;
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
    private final List<ReportStrategy> reportStrategies;

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
                          ReportPinRepository reportPinRepository,
                          List<ReportStrategy> reportStrategies) {
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
        this.reportStrategies = reportStrategies;
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

        // Strategy Pattern: each report type owns its own generation algorithm.
        return reportStrategies.stream()
                .filter(strategy -> strategy.getType().equals(type))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Invalid report type"))
                .generate();
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
