//Used when the user provides both.
package com.sliit.tgms.service.strategy;

import com.sliit.tgms.model.Supplier;
import com.sliit.tgms.repository.SupplierRepository;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class NameAndCategorySupplierSearchStrategy implements SupplierSearchStrategy {

    private final SupplierRepository supplierRepository;

    public NameAndCategorySupplierSearchStrategy(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    @Override
    public List<Supplier> search(String category, String name) {
        return supplierRepository
                .findByNameContainingIgnoreCaseAndMaterialCategoryContainingIgnoreCase(
                        name, category);
    }
}
