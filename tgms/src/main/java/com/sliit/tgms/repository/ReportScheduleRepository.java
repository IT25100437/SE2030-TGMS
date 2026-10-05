package com.sliit.tgms.repository;

import com.sliit.tgms.model.ReportSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReportScheduleRepository extends JpaRepository<ReportSchedule, Long> {
    List<ReportSchedule> findByCreatedByOrderByScheduledTimeAsc(String createdBy);
}
