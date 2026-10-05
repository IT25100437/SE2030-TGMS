package com.sliit.tgms.service.decorator;

import com.sliit.tgms.dto.EmployeeRequest;
import com.sliit.tgms.model.Employee;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
@Primary
public class EmployeeAuditDecorator implements EmployeeCreator {

    private static final Logger log =
            LoggerFactory.getLogger(EmployeeAuditDecorator.class);

    private final EmployeeCreator delegate;

    public EmployeeAuditDecorator(
            @Qualifier("basicEmployeeCreator") EmployeeCreator delegate) {
        this.delegate = delegate;
    }

    @Override
    public Employee create(EmployeeRequest request) {
        Employee employee = delegate.create(request);

        log.info(
                "Employee created: id={}, name={}, department={}",
                employee.getId(),
                employee.getName(),
                employee.getDepartment()
        );

        return employee;
    }
}
