package com.sliit.tgms.model;

/**
 * PBI-18: production progresses forward-only through these stages
 * (per the Final Report reflection: "Reduced the workflow to one 'current stage'
 * field per work order with a simple forward-only progression").
 *
 * Used both as WorkOrder.status (the current stage) and as ProductionStage.stageName
 * (a historical log entry for each stage the work order has passed through).
 */
public enum ProductionStageName {
    PENDING,
    CUTTING,
    SEWING,
    QC,
    PACKING,
    COMPLETED,
    CANCELLED
}
