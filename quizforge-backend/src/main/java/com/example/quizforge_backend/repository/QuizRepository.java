package com.example.quizforge_backend.repository;

import com.example.quizforge_backend.model.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.quizforge_backend.model.Role;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, Long> {
    java.util.List<Quiz> findByCreatedByRole(Role role);
}
