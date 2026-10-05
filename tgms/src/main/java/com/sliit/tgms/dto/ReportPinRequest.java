package com.sliit.tgms.dto;

import jakarta.validation.constraints.NotBlank;

public class ReportPinRequest {
    @NotBlank
    private String reportType;
    @NotBlank
    private String reportName;

    public String getReportType() { return reportType; }
    public void setReportType(String reportType) { this.reportType = reportType; }
    public String getReportName() { return reportName; }
    public void setReportName(String reportName) { this.reportName = reportName; }
}
