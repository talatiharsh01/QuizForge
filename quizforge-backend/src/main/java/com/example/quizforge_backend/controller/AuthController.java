package com.example.quizforge_backend.controller;

import com.example.quizforge_backend.model.User;
import com.example.quizforge_backend.model.Role;
import com.example.quizforge_backend.repository.UserRepository;
import com.example.quizforge_backend.dto.AuthRequest;
import com.example.quizforge_backend.dto.AuthResponse;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public AuthResponse register(@RequestBody AuthRequest request) {
        AuthResponse response = new AuthResponse();
        try {
            // #2: Input validation
            if (request.getUsername() == null || request.getUsername().trim().length() < 3) {
                response.setSuccess(false);
                response.setMessage("Username must be at least 3 characters.");
                return response;
            }
            if (request.getPassword() == null || request.getPassword().length() < 6) {
                response.setSuccess(false);
                response.setMessage("Password must be at least 6 characters.");
                return response;
            }
            if (request.getEmail() == null || !request.getEmail().matches("^[^@]+@[^@]+\\.[^@]+$")) {
                response.setSuccess(false);
                response.setMessage("Please provide a valid email address.");
                return response;
            }

            if (userRepository.findByUsername(request.getUsername()).isPresent()) {
                response.setSuccess(false);
                response.setMessage("Username already exists!");
                return response;
            }

            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                response.setSuccess(false);
                response.setMessage("Email already registered!");
                return response;
            }

            User user = new User();
            user.setUsername(request.getUsername().trim());
            user.setPassword(BCrypt.hashpw(request.getPassword(), BCrypt.gensalt()));
            user.setEmail(request.getEmail().trim().toLowerCase());
            user.setRole(Role.STUDENT);

            userRepository.save(user);

            // Return safe user info (password is @JsonIgnore so it won't leak)
            Map<String, Object> safeUser = new HashMap<>();
            safeUser.put("id", user.getId());
            safeUser.put("username", user.getUsername());
            safeUser.put("email", user.getEmail());
            safeUser.put("role", user.getRole().name());

            response.setSuccess(true);
            response.setMessage("User registered successfully");
            response.setUser(safeUser);
        } catch (Exception e) {
            response.setSuccess(false);
            response.setMessage("Registration failed: " + e.getMessage());
        }
        return response;
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody AuthRequest request) {
        AuthResponse response = new AuthResponse();
        Optional<User> optUser = userRepository.findByUsernameOrEmail(request.getUsername(), request.getUsername());

        if (optUser.isPresent() && BCrypt.checkpw(request.getPassword(), optUser.get().getPassword())) {
            User user = optUser.get();
            // Validate role
            if (request.getRole() != null && !user.getRole().name().equalsIgnoreCase(request.getRole())) {
                response.setSuccess(false);
                response.setMessage("Invalid role selected for this user.");
                return response;
            }

            // Return safe user info without password
            Map<String, Object> safeUser = new HashMap<>();
            safeUser.put("id", user.getId());
            safeUser.put("username", user.getUsername());
            safeUser.put("email", user.getEmail());
            safeUser.put("role", user.getRole().name());

            response.setSuccess(true);
            response.setMessage("Login successful");
            response.setUser(safeUser);
        } else {
            response.setSuccess(false);
            response.setMessage("Invalid username or password");
        }
        return response;
    }
}
