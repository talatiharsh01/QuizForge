package com.example.quizforge_backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class QuizAttemptDTO {
    private Long studentId;
    private Long quizId;
    private int score;
    private int totalQuestions;
    // We could store actual responses if we want, but for now we'll just track the score.
}
