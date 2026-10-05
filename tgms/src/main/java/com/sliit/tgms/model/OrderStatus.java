package com.sliit.tgms.model;

/**
 * Order lifecycle (PBI-13, PBI-14).
 * DRAFT      -> just created by the Sales Officer, not yet confirmed (PBI-11)
 * CONFIRMED  -> stock has been deducted and an Invoice generated (PBI-12)
 * SHIPPED    -> goods have left the factory
 * DELIVERED  -> customer has received the goods
 * CANCELLED  -> order will not be fulfilled
 */
public enum OrderStatus {
    DRAFT,
    CONFIRMED,
    SHIPPED,
    DELIVERED,
    CANCELLED
}
