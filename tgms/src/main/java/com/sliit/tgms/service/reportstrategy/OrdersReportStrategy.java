package com.sliit.tgms.service.reportstrategy;

import com.sliit.tgms.model.Order;
import com.sliit.tgms.repository.InvoiceRepository;
import com.sliit.tgms.repository.OrderRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class OrdersReportStrategy implements ReportStrategy {
    private final OrderRepository orderRepository;
    private final InvoiceRepository invoiceRepository;

    public OrdersReportStrategy(OrderRepository orderRepository, InvoiceRepository invoiceRepository) {
        this.orderRepository = orderRepository;
        this.invoiceRepository = invoiceRepository;
    }

    @Override public String getType() { return "ORDERS"; }

    @Override public List<Map<String, Object>> generate() {
        return orderRepository.findAll().stream().map(o -> {
            Map<String,Object> r = new LinkedHashMap<>();
            r.put("Order ID", o.getId());
            r.put("Customer", o.getCustomer() != null ? o.getCustomer().getName() : "-");
            r.put("Status", o.getStatus());
            r.put("Order Date", o.getOrderDate());
            r.put("Total", o.getTotalAmount());
            r.put("Invoice", invoiceRepository.findByOrderId(o.getId()).map(i -> i.getAmount()).orElse(BigDecimal.ZERO));
            return r;
        }).toList();
    }
}
