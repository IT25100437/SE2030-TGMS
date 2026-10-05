package com.sliit.tgms.config;

import com.sliit.tgms.model.Role;
import com.sliit.tgms.model.User;
import com.sliit.tgms.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Runs once on every application startup and creates the demo login accounts if they
 * don't already exist yet, so the group can log in immediately without touching the
 * database by hand. Passwords are simple on purpose - this is coursework, not production.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        createIfMissing("admin", "admin123", "System Administrator", Role.ADMIN);
        createIfMissing("meewathura", "procure123", "Meewathura I.N (Procurement Officer)", Role.PROCUREMENT_OFFICER);
        createIfMissing("senevirathna", "inventory123", "Senevirathna B.S.M.R.S (Inventory Manager)", Role.INVENTORY_MANAGER);
        createIfMissing("ranatunga", "sales123", "Ranatunga Y.U.K (Sales Officer)", Role.SALES_OFFICER);
        createIfMissing("herathnayake", "production123", "Herathnayake H.M.D.L (Production Manager)", Role.PRODUCTION_MANAGER);
        createIfMissing("bandara", "hr123", "Bandara J.M.O.N (HR Manager)", Role.HR_MANAGER);
    }

    private void createIfMissing(String username, String rawPassword, String fullName, Role role) {
        if (!userRepository.existsByUsername(username)) {
            User user = new User(username, passwordEncoder.encode(rawPassword), fullName, role);
            userRepository.save(user);
            System.out.println("[DataSeeder] Created default user: " + username + " / role=" + role);
        }
    }
}
