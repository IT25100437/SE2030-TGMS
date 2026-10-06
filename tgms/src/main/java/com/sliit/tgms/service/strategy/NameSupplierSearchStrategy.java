//Used when the user searches by supplier name.

package com.sliit.tgms.service.strategy;

import com.sliit.tgms.model.Supplier;
import com.sliit.tgms.repository.SupplierRepository;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class NameSupplierSearchStrategy implements SupplierSearchStrategy {

    private final SupplierRepository supplierRepository;

    public NameSupplierSearchStrategy(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    @Override
    public List<Supplier> search(String category, String name) {
        return supplierRepository.findByNameContainingIgnoreCase(name);
    }
}
