package com.sliit.tgms.service;

import com.sliit.tgms.dto.SupplierRequest;
import com.sliit.tgms.exception.BadRequestException;
import com.sliit.tgms.exception.ResourceNotFoundException;
import com.sliit.tgms.model.Contract;
import com.sliit.tgms.model.Supplier;
import com.sliit.tgms.model.SupplierStatus;
import com.sliit.tgms.repository.ContractRepository;
import com.sliit.tgms.repository.SupplierRepository;
import com.sliit.tgms.service.strategy.AllSupplierSearchStrategy;
import com.sliit.tgms.service.strategy.CategorySupplierSearchStrategy;
import com.sliit.tgms.service.strategy.NameAndCategorySupplierSearchStrategy;
import com.sliit.tgms.service.strategy.NameSupplierSearchStrategy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final ContractRepository contractRepository;

    private final AllSupplierSearchStrategy allSupplierSearchStrategy;
    private final NameSupplierSearchStrategy nameSupplierSearchStrategy;
    private final CategorySupplierSearchStrategy categorySupplierSearchStrategy;
    private final NameAndCategorySupplierSearchStrategy nameAndCategorySupplierSearchStrategy;

    public SupplierService(
            SupplierRepository supplierRepository,
            ContractRepository contractRepository,
            AllSupplierSearchStrategy allSupplierSearchStrategy,
            NameSupplierSearchStrategy nameSupplierSearchStrategy,
            CategorySupplierSearchStrategy categorySupplierSearchStrategy,
            NameAndCategorySupplierSearchStrategy nameAndCategorySupplierSearchStrategy) {

        this.supplierRepository = supplierRepository;
        this.contractRepository = contractRepository;
        this.allSupplierSearchStrategy = allSupplierSearchStrategy;
        this.nameSupplierSearchStrategy = nameSupplierSearchStrategy;
        this.categorySupplierSearchStrategy = categorySupplierSearchStrategy;
        this.nameAndCategorySupplierSearchStrategy =
                nameAndCategorySupplierSearchStrategy;
    }

    // PBI-01: Register a new supplier
    public Supplier registerSupplier(SupplierRequest request) {
        Supplier supplier = new Supplier();
        supplier.setName(request.getName());
        supplier.setContact(request.getContact());
        supplier.setMaterialCategory(request.getMaterialCategory());

        return supplierRepository.save(supplier);
    }

    public List<Supplier> getAllSuppliers() {
        return supplierRepository.findAll();
    }

    public Supplier getSupplierById(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Supplier not found with id: " + id));
    }

    // Edit / update supplier details
    public Supplier updateSupplier(Long id, SupplierRequest request) {
        Supplier supplier = getSupplierById(id);

        supplier.setName(request.getName());
        supplier.setContact(request.getContact());
        supplier.setMaterialCategory(request.getMaterialCategory());

        return supplierRepository.save(supplier);
    }

    // PBI-03: Search & filter suppliers
    // Strategy Pattern is used to select the search behavior.
    public List<Supplier> searchSuppliers(String category, String name) {

        boolean hasCategory =
                category != null && !category.isBlank();

        boolean hasName =
                name != null && !name.isBlank();

        if (hasCategory && hasName) {
            return nameAndCategorySupplierSearchStrategy
                    .search(category, name);

        } else if (hasCategory) {
            return categorySupplierSearchStrategy
                    .search(category, name);

        } else if (hasName) {
            return nameSupplierSearchStrategy
                    .search(category, name);
        }

        return allSupplierSearchStrategy
                .search(category, name);
    }

    // PBI-04: Deactivate supplier (soft delete)
    public Supplier deactivateSupplier(Long id) {
        Supplier supplier = getSupplierById(id);

        if (supplier.getStatus() == SupplierStatus.INACTIVE) {
            throw new BadRequestException(
                    "Supplier is already inactive");
        }

        supplier.setStatus(SupplierStatus.INACTIVE);

        return supplierRepository.save(supplier);
    }

    // Permanent delete
    @Transactional
    public void permanentlyDeleteSupplier(Long id) {
        Supplier supplier = getSupplierById(id);

        List<Contract> contracts =
                contractRepository.findBySupplierId(id);

        contractRepository.deleteAll(contracts);
        contractRepository.flush();

        supplierRepository.delete(supplier);
    }

    // PBI-05: Export supplier list as CSV
    public byte[] exportSuppliersToCsv() {

        StringBuilder csv =
                new StringBuilder(
                        "ID,Name,Contact,Material Category,Status\n");

        for (Supplier s : supplierRepository.findAll()) {

            csv.append(s.getId()).append(',')
                    .append(escapeCsv(s.getName())).append(',')
                    .append(escapeCsv(s.getContact())).append(',')
                    .append(escapeCsv(s.getMaterialCategory())).append(',')
                    .append(s.getStatus()).append('\n');
        }

        return csv.toString()
                .getBytes(StandardCharsets.UTF_8);
    }

    private String escapeCsv(String value) {

        if (value == null) {
            return "";
        }

        if (value.contains(",") || value.contains("\"")) {
            return "\"" +
                    value.replace("\"", "\"\"") +
                    "\"";
        }

        return value;
    }
}
