package com.example.quizforge_backend.repository;

import com.example.quizforge_backend.model.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {
    List<QuizAttempt> findByStudentIdOrderByAttemptDateDesc(Long studentId);
    boolean existsByStudentIdAndQuizId(Long studentId, Long quizId);

    @Query("SELECT COALESCE(AVG(CAST(a.score AS double) / a.totalQuestions * 100), 0) FROM QuizAttempt a")
    double getAverageScorePercentage();
}
