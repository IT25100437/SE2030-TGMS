package com.sliit.tgms.repository;

import com.sliit.tgms.model.Employee;
import com.sliit.tgms.model.EmployeeStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    List<Employee> findByStatus(EmployeeStatus status);
}
