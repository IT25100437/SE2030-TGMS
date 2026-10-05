package com.sliit.tgms.model;

import jakarta.persistence.*;

/**
 * External stakeholder who places orders (Section 1.3 of the Final Report: "the Customer
 * is an external stakeholder... does not hold a login to the system"). Kept intentionally
 * minimal - just enough for the Sales Officer to attach an order to someone.
 */
@Entity
@Table(name = "customers")
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 100)
    private String contact;

    @Column(nullable = false, length = 255)
    private String address;

    public Customer() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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
