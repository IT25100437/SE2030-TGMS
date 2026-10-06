//Used when there are no filters.

package com.sliit.tgms.service.strategy;

import com.sliit.tgms.model.Supplier;

import java.util.List;

public interface SupplierSearchStrategy {

    List<Supplier> search(String category, String name);
}
