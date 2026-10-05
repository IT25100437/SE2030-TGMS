package com.sliit.tgms.model;

/**
 * ACTIVE / INACTIVE is used by PBI-04 (deactivate supplier) which belongs to Sprint 2.
 * The field is included on the entity now (per the ER diagram), defaulting to ACTIVE,
 * so the data model doesn't need to change later.
 */
public enum SupplierStatus {
    ACTIVE,
    INACTIVE
}
