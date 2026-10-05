package com.sliit.tgms.dto;

import jakarta.validation.constraints.NotBlank;

public class SupplierRequest {

    @NotBlank(message = "supplier name is required")
    private String name;

    @NotBlank(message = "contact info is required")
    private String contact;

    @NotBlank(message = "material category is required")
    private String materialCategory;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getContact() {
        return contact;
    }

    public void setContact(String contact) {
        this.contact = contact;
    }

    public String getMaterialCategory() {
        return materialCategory;
    }

    public void setMaterialCategory(String materialCategory) {
        this.materialCategory = materialCategory;
    }
}
