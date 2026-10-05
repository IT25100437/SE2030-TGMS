package com.sliit.tgms.model;

/**
 * The six user roles identified in the use case diagram (Section 3.1 of the Design Document).
 * Only PROCUREMENT_OFFICER, INVENTORY_MANAGER and ADMIN are actually used by any endpoint
 * in Sprint 1. The others exist now so the User table matches the final system from the start,
 * and so accounts can be created ahead of the sprints that need them.
 */
public enum Role {
    ADMIN,
    PROCUREMENT_OFFICER,
    INVENTORY_MANAGER,
    SALES_OFFICER,
    PRODUCTION_MANAGER,
    HR_MANAGER
}
