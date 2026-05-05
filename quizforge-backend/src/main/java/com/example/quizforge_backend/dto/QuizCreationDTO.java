package com.example.quizforge_backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class QuizCreationDTO {
    private String title;
    private Long adminId;
    private List<Long> questionIds;
}
