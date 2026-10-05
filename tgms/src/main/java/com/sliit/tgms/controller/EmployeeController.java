package com.sliit.tgms.controller;

import com.sliit.tgms.dto.AttendanceRequest;
import com.sliit.tgms.dto.EmployeeRequest;
import com.sliit.tgms.model.Attendance;
import com.sliit.tgms.model.AttendanceStatus;
import com.sliit.tgms.model.Employee;
import com.sliit.tgms.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Employee Management module - owned by Bandara J.M.O.N (HR Manager persona).
 * Access restricted to HR_MANAGER / ADMIN, see SecurityConfig.
 */
@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    // PBI-21: register a new employee
    @PostMapping
    public ResponseEntity<Employee> registerEmployee(@Valid @RequestBody EmployeeRequest request) {
        Employee saved = employeeService.registerEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public ResponseEntity<List<Employee>> listEmployees() {
        return ResponseEntity.ok(employeeService.getAllActiveEmployees());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployee(@PathVariable Long id) {
        return ResponseEntity.ok(employeeService.getEmployeeById(id));
    }

    // PBI-23: update employee role/department
    @PutMapping("/{id}")
    public ResponseEntity<Employee> updateEmployee(@PathVariable Long id, @Valid @RequestBody EmployeeRequest request) {
        return ResponseEntity.ok(employeeService.updateEmployee(id, request));
    }

    // PBI-24: deactivate a resigned employee (soft delete)
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<Employee> deactivateEmployee(@PathVariable Long id) {
        return ResponseEntity.ok(employeeService.deactivateEmployee(id));
    }

    // Permanent delete: removes the employee (and their attendance records) from the
    // database. Separate from the deactivate action above.
    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentlyDeleteEmployee(@PathVariable Long id) {
        employeeService.permanentlyDeleteEmployee(id);
        return ResponseEntity.noContent().build();
    }

    // PBI-22: mark (or correct) daily attendance
    @PostMapping("/{id}/attendance")
    public ResponseEntity<Attendance> markAttendance(@PathVariable Long id, @Valid @RequestBody AttendanceRequest request) {
        Attendance saved = employeeService.markAttendance(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // List attendance records for one month, e.g. GET /api/employees/3/attendance?year=2026&month=9
    @GetMapping("/{id}/attendance")
    public ResponseEntity<List<Attendance>> getAttendance(
            @PathVariable Long id, @RequestParam int year, @RequestParam int month) {
        return ResponseEntity.ok(employeeService.getAttendanceForMonth(id, year, month));
    }

    // PBI-25: monthly attendance summary
    @GetMapping("/{id}/attendance/summary")
    public ResponseEntity<Map<AttendanceStatus, Long>> getAttendanceSummary(
            @PathVariable Long id, @RequestParam int year, @RequestParam int month) {
        return ResponseEntity.ok(employeeService.getMonthlyAttendanceSummary(id, year, month));
    }
}
