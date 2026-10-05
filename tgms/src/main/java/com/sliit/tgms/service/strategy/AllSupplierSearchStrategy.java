package com.sliit.tgms.service.strategy;

import com.sliit.tgms.model.Supplier;
import com.sliit.tgms.repository.SupplierRepository;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AllSupplierSearchStrategy implements SupplierSearchStrategy {

    private final SupplierRepository supplierRepository;

    public AllSupplierSearchStrategy(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    @Override
    public List<Supplier> search(String category, String name) {
        return supplierRepository.findAll();
    }
}
