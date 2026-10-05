package com.sliit.tgms.repository;

import com.sliit.tgms.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    // PBI-03: search & filter suppliers by material category
    List<Supplier> findByMaterialCategoryContainingIgnoreCase(String category);

    // Free-text search on supplier name, used together with the category filter
    List<Supplier> findByNameContainingIgnoreCaseAndMaterialCategoryContainingIgnoreCase(
            String name, String category);

    List<Supplier> findByNameContainingIgnoreCase(String name);
}
