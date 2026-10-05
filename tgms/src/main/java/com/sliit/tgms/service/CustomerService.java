package com.sliit.tgms.service;

import com.sliit.tgms.dto.CustomerRequest;
import com.sliit.tgms.exception.BadRequestException;
import com.sliit.tgms.exception.ResourceNotFoundException;
import com.sliit.tgms.model.Customer;
import com.sliit.tgms.repository.CustomerRepository;
import com.sliit.tgms.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;

    public CustomerService(CustomerRepository customerRepository,
                           OrderRepository orderRepository) {
        this.customerRepository = customerRepository;
        this.orderRepository = orderRepository;
    }

    // Register a new customer
    public Customer registerCustomer(CustomerRequest request) {

        Customer customer = new Customer();

        customer.setName(request.getName());
        customer.setContact(request.getContact());
        customer.setAddress(request.getAddress());

        return customerRepository.save(customer);
    }

    // Get all registered customers
    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    // Get one customer
    public Customer getCustomerById(Long id) {

        return customerRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Customer not found with id: " + id
                        )
                );
    }

    // Extra feature: update customer details
    public Customer updateCustomer(
            Long id,
            CustomerRequest request) {

        Customer customer = getCustomerById(id);

        customer.setName(request.getName());
        customer.setContact(request.getContact());
        customer.setAddress(request.getAddress());

        return customerRepository.save(customer);
    }

    // Permanent delete: physically removes the customer row from SQL Server.
    //
    // orders.customer_id is a NOT NULL foreign key to customers, and orders are
    // linked to invoices, stock movements and work orders. To protect that history
    // a customer who already has orders is refused with a clear message; only
    // customers with no orders (e.g. registered by mistake) can be deleted.
    @Transactional
    public void permanentlyDeleteCustomer(Long id) {

        Customer customer = getCustomerById(id); // 404 if missing

        long orderCount = orderRepository.countByCustomerId(id);

        if (orderCount > 0) {
            throw new BadRequestException(
                    "Cannot permanently delete customer '" + customer.getName()
                            + "' because they have " + orderCount
                            + " order(s) on record. Only customers with no orders can be deleted."
            );
        }

        customerRepository.delete(customer);
    }
}