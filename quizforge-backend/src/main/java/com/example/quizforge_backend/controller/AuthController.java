package com.example.quizforge_backend.controller;

import com.example.quizforge_backend.model.User;
import com.example.quizforge_backend.model.Role;
import com.example.quizforge_backend.repository.UserRepository;
import com.example.quizforge_backend.dto.AuthRequest;
import com.example.quizforge_backend.dto.AuthResponse;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*") // Allows the frontend HTML to communicate with the backend
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public AuthResponse register(@RequestBody AuthRequest request) {
        AuthResponse response = new AuthResponse();
        try {
            if (userRepository.findByUsername(request.getUsername()).isPresent()) {
                response.setSuccess(false);
                response.setMessage("Username already exists!");
                return response;
            }

            User user = new User();
            user.setUsername(request.getUsername());
            user.setPassword(BCrypt.hashpw(request.getPassword(), BCrypt.gensalt()));
            user.setEmail(request.getEmail());
            user.setRole(Role.STUDENT);

            userRepository.save(user);

            response.setSuccess(true);
            response.setMessage("User registered successfully");
            response.setUser(user);
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

            response.setSuccess(true);
            response.setMessage("Login successful");
            response.setUser(user);
        } else {
            response.setSuccess(false);
            response.setMessage("Invalid username or password");
        }
        return response;
    }
}
