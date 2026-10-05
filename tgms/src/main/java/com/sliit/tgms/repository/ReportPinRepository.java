package com.sliit.tgms.repository;

import com.sliit.tgms.model.ReportPin;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReportPinRepository extends JpaRepository<ReportPin, Long> {
    List<ReportPin> findByUsernameOrderByCreatedAtDesc(String username);
    Optional<ReportPin> findByReportTypeAndUsername(String reportType, String username);
}
