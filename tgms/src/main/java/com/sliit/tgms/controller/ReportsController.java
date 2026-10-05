package com.sliit.tgms.controller;

import com.lowagie.text.Document;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import com.sliit.tgms.dto.ReportPinRequest;
import com.sliit.tgms.dto.ReportScheduleRequest;
import com.sliit.tgms.model.ReportPin;
import com.sliit.tgms.model.ReportSchedule;
import com.sliit.tgms.service.ReportsService;

import jakarta.validation.Valid;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportsController {

    private final ReportsService reportsService;

    public ReportsController(ReportsService reportsService) {
        this.reportsService = reportsService;
    }

    // =========================
    // KPI DASHBOARD
    // =========================

    @GetMapping("/kpis")
    public Map<String, Object> kpis() {
        return reportsService.getKpis();
    }

    // =========================
    // MANAGEMENT REPORT
    // =========================

    @GetMapping("/{type}")
    public List<Map<String, Object>> report(@PathVariable String type) {
        return reportsService.getReport(type.toUpperCase());
    }

    // =========================
    // SCHEDULED REPORTS
    // =========================

    @GetMapping("/schedules")
    public List<ReportSchedule> schedules(Principal principal) {
        return reportsService.getSchedules(principal.getName());
    }

    @PostMapping("/schedules")
    public ReportSchedule createSchedule(
            @Valid @RequestBody ReportScheduleRequest request,
            Principal principal) {

        return reportsService.createSchedule(
                request,
                principal.getName()
        );
    }

    @PutMapping("/schedules/{id}")
    public ReportSchedule updateSchedule(
            @PathVariable Long id,
            @Valid @RequestBody ReportScheduleRequest request,
            Principal principal) {

        return reportsService.updateSchedule(
                id,
                request,
                principal.getName()
        );
    }

    @DeleteMapping("/schedules/{id}")
    public ResponseEntity<Void> deleteSchedule(
            @PathVariable Long id,
            Principal principal) {

        reportsService.deleteSchedule(
                id,
                principal.getName()
        );

        return ResponseEntity.noContent().build();
    }

    // =========================
    // PINNED REPORTS
    // =========================

    @GetMapping("/pins")
    public List<ReportPin> pins(Principal principal) {
        return reportsService.getPins(principal.getName());
    }

    @PostMapping("/pins")
    public ReportPin createPin(
            @Valid @RequestBody ReportPinRequest request,
            Principal principal) {

        return reportsService.createPin(
                request,
                principal.getName()
        );
    }

    @DeleteMapping("/pins/{id}")
    public ResponseEntity<Void> deletePin(
            @PathVariable Long id,
            Principal principal) {

        reportsService.deletePin(
                id,
                principal.getName()
        );

        return ResponseEntity.noContent().build();
    }

    // =========================
    // EXCEL EXPORT
    // =========================

    @GetMapping("/{type}/excel")
    public ResponseEntity<byte[]> excel(
            @PathVariable String type) {

        String reportType = type.toUpperCase();

        byte[] bytes = reportsService.exportExcel(reportType);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=TGMS-" + reportType + ".xlsx"
                )
                .contentType(
                        MediaType.parseMediaType(
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        )
                )
                .body(bytes);
    }

    // =========================
    // PDF EXPORT
    // =========================

    @GetMapping("/{type}/pdf")
    public ResponseEntity<byte[]> pdf(
            @PathVariable String type) {

        String reportType = type.toUpperCase();

        List<Map<String, Object>> rows =
                reportsService.getReport(reportType);

        try (ByteArrayOutputStream out =
                     new ByteArrayOutputStream()) {

            Document document = new Document(
                    PageSize.A4.rotate(),
                    24,
                    24,
                    24,
                    24
            );

            PdfWriter.getInstance(document, out);

            document.open();

            document.add(
                    new Paragraph(
                            "TGMS - " +
                                    reportType +
                                    " Management Report"
                    )
            );

            document.add(
                    new Paragraph(
                            "Generated: " +
                                    LocalDateTime.now()
                    )
            );

            document.add(
                    new Paragraph(" ")
            );

            if (!rows.isEmpty()) {

                List<String> headers =
                        new ArrayList<>(
                                rows.get(0).keySet()
                        );

                PdfPTable table =
                        new PdfPTable(headers.size());

                // Add table headers
                for (String header : headers) {
                    table.addCell(header);
                }

                // Add table data
                for (Map<String, Object> row : rows) {

                    for (String header : headers) {

                        Object value = row.get(header);

                        table.addCell(
                                String.valueOf(value)
                        );
                    }
                }

                document.add(table);

            } else {

                document.add(
                        new Paragraph(
                                "No records found."
                        )
                );
            }

            document.close();

            return ResponseEntity.ok()
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=TGMS-" +
                                    reportType +
                                    ".pdf"
                    )
                    .contentType(
                            MediaType.APPLICATION_PDF
                    )
                    .body(out.toByteArray());

        } catch (Exception e) {

            throw new IllegalStateException(
                    "Could not create PDF report",
                    e
            );
        }
    }
}