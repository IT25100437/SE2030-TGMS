package com.sliit.tgms.dto;

import jakarta.validation.constraints.NotBlank;

public class CustomerRequest {

    @NotBlank(message = "customer name is required")
    private String name;

    @NotBlank(message = "contact info is required")
    private String contact;

    @NotBlank(message = "address is required")
    private String address;

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

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }
}
