package com.sliit.tgms.repository;

import com.sliit.tgms.model.ProductionStage;
import com.sliit.tgms.model.ProductionStageName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ProductionStageRepository extends JpaRepository<ProductionStage, Long> {

    List<ProductionStage> findByWorkOrderIdOrderByStartDateAsc(Long workOrderId);

    // The current/active stage for a work order is the one log entry that hasn't been closed yet
    Optional<ProductionStage> findByWorkOrderIdAndEndDateIsNull(Long workOrderId);

    // PBI-20: daily output summary - all COMPLETED entries logged within a day range
    List<ProductionStage> findByStageNameAndStartDateBetween(
            ProductionStageName stageName, LocalDateTime startOfDay, LocalDateTime endOfDay);
}
