package com.sliit.tgms.repository;

import com.sliit.tgms.model.Contract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractRepository extends JpaRepository<Contract, Long> {

    List<Contract> findBySupplierId(Long supplierId);
}
