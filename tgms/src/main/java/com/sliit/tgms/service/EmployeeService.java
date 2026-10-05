package com.sliit.tgms.service;

import com.sliit.tgms.dto.AttendanceRequest;
import com.sliit.tgms.dto.EmployeeRequest;
import com.sliit.tgms.exception.BadRequestException;
import com.sliit.tgms.exception.ResourceNotFoundException;
import com.sliit.tgms.model.Attendance;
import com.sliit.tgms.model.AttendanceStatus;
import com.sliit.tgms.model.Employee;
import com.sliit.tgms.model.EmployeeStatus;
import com.sliit.tgms.repository.AttendanceRepository;
import com.sliit.tgms.repository.EmployeeRepository;
import com.sliit.tgms.service.decorator.EmployeeCreator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeCreator employeeCreator;

    public EmployeeService(EmployeeRepository employeeRepository,
                            AttendanceRepository attendanceRepository,
                            EmployeeCreator employeeCreator) {
        this.employeeRepository = employeeRepository;
        this.attendanceRepository = attendanceRepository;
        this.employeeCreator = employeeCreator;
    }

    // PBI-21: register a new employee
    public Employee registerEmployee(EmployeeRequest request) {
        // Decorator Pattern: EmployeeAuditDecorator adds logging around the core
        // employee creation operation without changing the core creator.
        return employeeCreator.create(request);
    }

    public List<Employee> getAllActiveEmployees() {
        return employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
    }

    public Employee getEmployeeById(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));
    }

    // PBI-23: update employee role/department (and other basic details)
    public Employee updateEmployee(Long id, EmployeeRequest request) {
        Employee employee = getEmployeeById(id);
        employee.setName(request.getName());
        employee.setDob(request.getDob());
        employee.setDepartment(request.getDepartment());
        employee.setRole(request.getRole());
        return employeeRepository.save(employee);
    }

    // PBI-24: deactivate a resigned employee (soft delete)
    public Employee deactivateEmployee(Long id) {
        Employee employee = getEmployeeById(id);
        if (employee.getStatus() == EmployeeStatus.INACTIVE) {
            throw new BadRequestException("Employee is already inactive");
        }
        employee.setStatus(EmployeeStatus.INACTIVE);
        return employeeRepository.save(employee);
    }

    // Permanent delete: physically removes the employee row from SQL Server.
    // Separate from PBI-24 (deactivate), which only flips the status.
    //
    // attendance_records.employee_id is a NOT NULL foreign key to employees, so the
    // employee's own attendance rows are removed first (same transaction), otherwise
    // SQL Server rejects the delete with a foreign-key error.
    @Transactional
    public void permanentlyDeleteEmployee(Long id) {
        Employee employee = getEmployeeById(id); // 404 if missing

        List<Attendance> records = attendanceRepository.findByEmployeeId(id);
        attendanceRepository.deleteAll(records);
        attendanceRepository.flush();

        employeeRepository.delete(employee);
    }

    // PBI-22: mark daily attendance. Marking the same employee+date again corrects
    // that day's record rather than creating a duplicate row.
    public Attendance markAttendance(Long employeeId, AttendanceRequest request) {
        Employee employee = getEmployeeById(employeeId);

        Attendance attendance = attendanceRepository
                .findByEmployeeIdAndDate(employeeId, request.getDate())
                .orElseGet(Attendance::new);

        attendance.setEmployee(employee);
        attendance.setDate(request.getDate());
        attendance.setStatus(request.getStatus());
        return attendanceRepository.save(attendance);
    }

    public List<Attendance> getAttendanceForMonth(Long employeeId, int year, int month) {
        getEmployeeById(employeeId); // 404 if employee doesn't exist
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        return attendanceRepository.findByEmployeeIdAndDateBetween(employeeId, start, end);
    }

    // PBI-25: monthly attendance summary - counts per status for one employee
    public Map<AttendanceStatus, Long> getMonthlyAttendanceSummary(Long employeeId, int year, int month) {
        List<Attendance> records = getAttendanceForMonth(employeeId, year, month);

        Map<AttendanceStatus, Long> summary = new EnumMap<>(AttendanceStatus.class);
        for (AttendanceStatus status : AttendanceStatus.values()) {
            summary.put(status, 0L);
        }
        for (Attendance record : records) {
            summary.merge(record.getStatus(), 1L, Long::sum);
        }
        return summary;
    }
}
