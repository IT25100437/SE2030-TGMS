package com.sliit.tgms.repository;

import com.sliit.tgms.model.ProductionStageName;
import com.sliit.tgms.model.WorkOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long> {

    Optional<WorkOrder> findByOrderId(Long orderId);

    List<WorkOrder> findByStatusNotIn(List<ProductionStageName> statuses);
}
