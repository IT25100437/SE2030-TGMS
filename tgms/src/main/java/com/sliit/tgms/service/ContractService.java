package com.sliit.tgms.service;

import com.sliit.tgms.dto.ContractRequest;
import com.sliit.tgms.exception.BadRequestException;
import com.sliit.tgms.exception.ResourceNotFoundException;
import com.sliit.tgms.model.Contract;
import com.sliit.tgms.model.Supplier;
import com.sliit.tgms.repository.ContractRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ContractService {

    private final ContractRepository contractRepository;
    private final SupplierService supplierService;

    public ContractService(ContractRepository contractRepository, SupplierService supplierService) {
        this.contractRepository = contractRepository;
        this.supplierService = supplierService;
    }

    // PBI-02: Add contract terms for a supplier
    public Contract addContract(Long supplierId, ContractRequest request) {
        validateDates(request);
        Supplier supplier = supplierService.getSupplierById(supplierId); // throws 404 if missing

        Contract contract = new Contract();
        contract.setSupplier(supplier);
        contract.setTerms(request.getTerms());
        contract.setStartDate(request.getStartDate());
        contract.setEndDate(request.getEndDate());
        return contractRepository.save(contract);
    }

    // PBI-02: Update existing contract terms
    public Contract updateContract(Long contractId, ContractRequest request) {
        validateDates(request);
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found with id: " + contractId));

        contract.setTerms(request.getTerms());
        contract.setStartDate(request.getStartDate());
        contract.setEndDate(request.getEndDate());
        return contractRepository.save(contract);
    }

    public List<Contract> getContractsForSupplier(Long supplierId) {
        supplierService.getSupplierById(supplierId); // ensures supplier exists, throws 404 if not
        return contractRepository.findBySupplierId(supplierId);
    }

    // Delete an existing contract
    public void deleteContract(Long contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Contract not found with id: " + contractId));

        contractRepository.delete(contract);
    }

    private void validateDates(ContractRequest request) {
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("Contract end date cannot be before the start date");
        }
    }
}
