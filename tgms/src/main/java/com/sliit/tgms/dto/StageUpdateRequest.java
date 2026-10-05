package com.sliit.tgms.dto;

import com.sliit.tgms.model.ProductionStageName;
import jakarta.validation.constraints.NotNull;

public class StageUpdateRequest {

    @NotNull(message = "stage is required")
    private ProductionStageName stage;

    public ProductionStageName getStage() {
        return stage;
    }

    public void setStage(ProductionStageName stage) {
        this.stage = stage;
    }
}
