package com.sliit.tgms.dto;

import com.sliit.tgms.model.AttendanceStatus;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class AttendanceRequest {

    @NotNull(message = "date is required")
    private LocalDate date;

    @NotNull(message = "status is required (PRESENT, ABSENT, or LATE)")
    private AttendanceStatus status;

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public AttendanceStatus getStatus() {
        return status;
    }

    public void setStatus(AttendanceStatus status) {
        this.status = status;
    }
}
