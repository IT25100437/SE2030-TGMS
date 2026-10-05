package com.sliit.tgms.service.strategy;

import com.sliit.tgms.model.ProductionStageName;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ForwardOnlyProductionStageStrategy implements ProductionStageTransitionStrategy {

    private static final List<ProductionStageName> STAGE_ORDER = List.of(
            ProductionStageName.PENDING,
            ProductionStageName.CUTTING,
            ProductionStageName.SEWING,
            ProductionStageName.QC,
            ProductionStageName.PACKING,
            ProductionStageName.COMPLETED
    );

    @Override
    public boolean canTransition(ProductionStageName current, ProductionStageName next) {
        int currentIndex = STAGE_ORDER.indexOf(current);
        int nextIndex = STAGE_ORDER.indexOf(next);
        return currentIndex >= 0 && nextIndex > currentIndex;
    }
}
