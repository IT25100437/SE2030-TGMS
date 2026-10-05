package com.sliit.tgms.repository;

import com.sliit.tgms.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    Optional<Attendance> findByEmployeeIdAndDate(Long employeeId, LocalDate date);

    // Used by Employee permanent delete: all attendance rows that belong to one employee
    List<Attendance> findByEmployeeId(Long employeeId);

    // PBI-25: monthly summary - all records for one employee within a date range
    List<Attendance> findByEmployeeIdAndDateBetween(Long employeeId, LocalDate start, LocalDate end);
}
