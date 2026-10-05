package com.sliit.tgms.service.strategy;

import com.sliit.tgms.model.ProductionStageName;

public interface ProductionStageTransitionStrategy {
    boolean canTransition(ProductionStageName current, ProductionStageName next);
}
