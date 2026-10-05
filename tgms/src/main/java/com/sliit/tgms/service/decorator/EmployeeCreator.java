package com.sliit.tgms.service.decorator;

import com.sliit.tgms.dto.EmployeeRequest;
import com.sliit.tgms.model.Employee;

public interface EmployeeCreator {
    Employee create(EmployeeRequest request);
}
