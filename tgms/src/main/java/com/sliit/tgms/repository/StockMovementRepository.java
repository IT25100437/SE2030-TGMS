package com.sliit.tgms.repository;

import com.sliit.tgms.model.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findByItemIdOrderByTimestampDesc(Long itemId);
}
