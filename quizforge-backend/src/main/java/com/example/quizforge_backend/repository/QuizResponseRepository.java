package com.example.quizforge_backend.repository;

import com.example.quizforge_backend.model.QuizResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizResponseRepository extends JpaRepository<QuizResponse, Long> {
}
