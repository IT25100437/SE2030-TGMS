package com.sliit.tgms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;

import java.time.LocalDate;

public class EmployeeRequest {

    @NotBlank(message = "employee name is required")
    private String name;

    @NotNull(message = "date of birth is required")
    @Past(message = "date of birth must be in the past")
    private LocalDate dob;

    @NotBlank(message = "department is required")
    private String department;

    @NotBlank(message = "role is required")
    private String role;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDate getDob() {
        return dob;
    }

    public void setDob(LocalDate dob) {
        this.dob = dob;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
