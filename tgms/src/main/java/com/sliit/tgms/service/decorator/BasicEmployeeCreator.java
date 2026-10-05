package com.sliit.tgms.service.decorator;

import com.sliit.tgms.dto.EmployeeRequest;
import com.sliit.tgms.model.Employee;
import com.sliit.tgms.repository.EmployeeRepository;
import org.springframework.stereotype.Component;

@Component("basicEmployeeCreator")
public class BasicEmployeeCreator implements EmployeeCreator {

    private final EmployeeRepository employeeRepository;

    public BasicEmployeeCreator(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    @Override
    public Employee create(EmployeeRequest request) {
        Employee employee = new Employee();
        employee.setName(request.getName());
        employee.setDob(request.getDob());
        employee.setDepartment(request.getDepartment());
        employee.setRole(request.getRole());

        return employeeRepository.save(employee);
    }
}
