package com.sliit.tgms.service;

import com.sliit.tgms.dto.WorkOrderRequest;
import com.sliit.tgms.exception.BadRequestException;
import com.sliit.tgms.exception.ResourceNotFoundException;
import com.sliit.tgms.model.*;
import com.sliit.tgms.repository.ProductionStageRepository;
import com.sliit.tgms.repository.WorkOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Production Management module (Herathnayake H.M.D.L / Production Manager persona).
 *
 * Reuses OrderService (Sprint 2) to look up and validate the Order a WorkOrder is
 * created from - integration by reuse, matching the pattern already used between
 * Order and Inventory in Sprint 2.
 */
@Service
public class ProductionService {

    // PBI-19: a work order sitting in the same stage longer than this is flagged as a bottleneck.
    // A constant keeps this simple to find and explain in a demo.
    private static final long BOTTLENECK_THRESHOLD_HOURS = 48;

    // PBI-18: the only forward-only path a work order may take, plus the cancel exception below.
    private static final List<ProductionStageName> STAGE_ORDER = List.of(
            ProductionStageName.PENDING,
            ProductionStageName.CUTTING,
            ProductionStageName.SEWING,
            ProductionStageName.QC,
            ProductionStageName.PACKING,
            ProductionStageName.COMPLETED
    );

    private final WorkOrderRepository workOrderRepository;
    private final ProductionStageRepository stageRepository;
    private final OrderService orderService;

    public ProductionService(WorkOrderRepository workOrderRepository,
                             ProductionStageRepository stageRepository,
                             OrderService orderService) {
        this.workOrderRepository = workOrderRepository;
        this.stageRepository = stageRepository;
        this.orderService = orderService;
    }

    // PBI-16 (+ PBI-17 embedded): create a work order from a confirmed customer order
    @Transactional
    public WorkOrder createWorkOrder(WorkOrderRequest request) {

        Order order = orderService.getOrderById(request.getOrderId());

        if (order.getStatus() != OrderStatus.CONFIRMED) {
            throw new BadRequestException(
                    "Work orders can only be created from a CONFIRMED order (current status: "
                            + order.getStatus() + ")"
            );
        }

        if (workOrderRepository.findByOrderId(order.getId()).isPresent()) {
            throw new BadRequestException(
                    "A work order already exists for order #" + order.getId()
            );
        }

        WorkOrder workOrder = new WorkOrder();

        workOrder.setOrder(order);
        workOrder.setAssignedLine(request.getAssignedLine());
        workOrder.setStatus(ProductionStageName.PENDING);

        workOrder = workOrderRepository.save(workOrder);

        // Log the starting stage so the history/bottleneck queries have something to read
        ProductionStage initialStage = new ProductionStage();

        initialStage.setWorkOrder(workOrder);
        initialStage.setStageName(ProductionStageName.PENDING);

        stageRepository.save(initialStage);

        return workOrder;
    }

    // Get all work orders
    public List<WorkOrder> getAllWorkOrders() {
        return workOrderRepository.findAll();
    }

    // Get a single work order
    public WorkOrder getWorkOrderById(Long id) {
        return workOrderRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Work order not found with id: " + id
                        )
                );
    }

    // PBI-18: view complete stage history of a work order
    public List<ProductionStage> getStageHistory(Long workOrderId) {

        // 404 check
        getWorkOrderById(workOrderId);

        return stageRepository
                .findByWorkOrderIdOrderByStartDateAsc(workOrderId);
    }

    // PBI-18: move the work order forward one or more stages
    // Forward-only - no moving backwards
    @Transactional
    public WorkOrder updateStage(Long workOrderId, ProductionStageName newStage) {

        WorkOrder workOrder = getWorkOrderById(workOrderId);

        ProductionStageName current = workOrder.getStatus();

        if (current == ProductionStageName.COMPLETED
                || current == ProductionStageName.CANCELLED) {

            throw new BadRequestException(
                    "Work order is already " + current
                            + " and cannot be updated further"
            );
        }

        int currentIndex = STAGE_ORDER.indexOf(current);
        int newIndex = STAGE_ORDER.indexOf(newStage);

        if (newIndex <= currentIndex) {

            throw new BadRequestException(
                    "Cannot move from " + current
                            + " to " + newStage
                            + " - stages must move forward only"
            );
        }

        // Close the currently-open stage log entry
        stageRepository
                .findByWorkOrderIdAndEndDateIsNull(workOrderId)
                .ifPresent(openStage -> {

                    openStage.setEndDate(LocalDateTime.now());

                    stageRepository.save(openStage);
                });

        // Create a new stage history entry
        ProductionStage newStageEntry = new ProductionStage();

        newStageEntry.setWorkOrder(workOrder);
        newStageEntry.setStageName(newStage);

        stageRepository.save(newStageEntry);

        // Update current work order status
        workOrder.setStatus(newStage);

        return workOrderRepository.save(workOrder);
    }

    // Cancel a work order - only allowed before production has started
    @Transactional
    public WorkOrder cancelWorkOrder(Long workOrderId) {

        WorkOrder workOrder = getWorkOrderById(workOrderId);

        if (workOrder.getStatus() != ProductionStageName.PENDING) {

            throw new BadRequestException(
                    "Only a PENDING work order (not yet started) can be cancelled"
            );
        }

        // Close current PENDING stage
        stageRepository
                .findByWorkOrderIdAndEndDateIsNull(workOrderId)
                .ifPresent(openStage -> {

                    openStage.setEndDate(LocalDateTime.now());

                    stageRepository.save(openStage);
                });

        // Add CANCELLED history entry
        ProductionStage cancelEntry = new ProductionStage();

        cancelEntry.setWorkOrder(workOrder);
        cancelEntry.setStageName(ProductionStageName.CANCELLED);

        stageRepository.save(cancelEntry);

        // Update work order status
        workOrder.setStatus(ProductionStageName.CANCELLED);

        return workOrderRepository.save(workOrder);
    }

    // Permanent delete: physically removes a work order row from SQL Server.
    // Separate from cancelWorkOrder above, which only changes the status.
    //
    // Only CANCELLED work orders can be deleted: COMPLETED ones feed the daily
    // output summary / production history, and in-progress ones are live work.
    // production_stages.work_order_id is a NOT NULL foreign key, so the work
    // order's own stage-history rows are removed first (same transaction).
    // The linked customer Order is NOT touched.
    @Transactional
    public void permanentlyDeleteWorkOrder(Long workOrderId) {

        WorkOrder workOrder = getWorkOrderById(workOrderId); // 404 if missing

        if (workOrder.getStatus() != ProductionStageName.CANCELLED) {

            throw new BadRequestException(
                    "Only a CANCELLED work order can be permanently deleted "
                            + "(current status: " + workOrder.getStatus() + "). "
                            + "Cancel it first if it has not started production."
            );
        }

        List<ProductionStage> stages =
                stageRepository.findByWorkOrderIdOrderByStartDateAsc(workOrderId);

        stageRepository.deleteAll(stages);
        stageRepository.flush();

        workOrderRepository.delete(workOrder);
    }

    // PBI-19: bottleneck alert
    // Work orders whose current stage has been running for 48+ hours
    public List<WorkOrder> getBottleneckAlerts() {

        List<ProductionStageName> terminal = List.of(
                ProductionStageName.COMPLETED,
                ProductionStageName.CANCELLED
        );

        List<WorkOrder> activeOrders =
                workOrderRepository.findByStatusNotIn(terminal);

        return activeOrders.stream()
                .filter(wo ->
                        stageRepository
                                .findByWorkOrderIdAndEndDateIsNull(wo.getId())
                                .map(stage ->
                                        ChronoUnit.HOURS.between(
                                                stage.getStartDate(),
                                                LocalDateTime.now()
                                        ) >= BOTTLENECK_THRESHOLD_HOURS
                                )
                                .orElse(false)
                )
                .collect(Collectors.toList());
    }

    // PBI-20: daily output summary
    // Counts completed work orders for a selected date,
    // grouped by production line.
    //
    // @Transactional is important here because ProductionStage.workOrder
    // is LAZY-loaded. The transaction keeps the Hibernate session open
    // while getWorkOrder().getAssignedLine() is accessed.
    @Transactional(readOnly = true)
    public Map<String, Long> getDailyOutputSummary(
            java.time.LocalDate date) {

        LocalDateTime startOfDay = date.atStartOfDay();

        LocalDateTime endOfDay =
                date.plusDays(1).atStartOfDay();

        List<ProductionStage> completedToday =
                stageRepository.findByStageNameAndStartDateBetween(
                        ProductionStageName.COMPLETED,
                        startOfDay,
                        endOfDay
                );

        return completedToday.stream()
                .collect(Collectors.groupingBy(
                        stage -> stage.getWorkOrder().getAssignedLine(),
                        Collectors.counting()
                ));
    }
}