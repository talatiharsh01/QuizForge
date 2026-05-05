package com.example.quizforge_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.CommandLineRunner;
import com.example.quizforge_backend.model.User;
import com.example.quizforge_backend.model.Role;
import com.example.quizforge_backend.repository.UserRepository;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Value;
import java.util.Optional;

@SpringBootApplication
public class QuizforgeBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(QuizforgeBackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner initAdmin(UserRepository userRepository,
									   @Value("${admin.default.username:admin}") String adminUsername,
									   @Value("${admin.default.password:admin123}") String adminPassword,
									   @Value("${admin.default.email:admin@quizforge.com}") String adminEmail) {
		return args -> {
			Optional<User> optAdmin = userRepository.findByUsernameOrEmail(adminUsername, adminEmail);
			if (optAdmin.isEmpty()) {
				User admin = new User();
				admin.setUsername(adminUsername);
				admin.setPassword(BCrypt.hashpw(adminPassword, BCrypt.gensalt()));
				admin.setEmail(adminEmail);
				admin.setRole(Role.ADMIN);
				userRepository.save(admin);
				System.out.println("Default Admin account created with hashed password.");
			} else {
				User admin = optAdmin.get();
				// If the existing password is not hashed (doesn't start with $2a$), update it
				if (!admin.getPassword().startsWith("$2a$")) {
					admin.setPassword(BCrypt.hashpw(adminPassword, BCrypt.gensalt()));
					userRepository.save(admin);
					System.out.println("Updated existing Admin account with hashed password.");
				}
			}
		};
	}
}
