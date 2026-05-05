package com.example.quizforge_backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class QuestionDTO {
    private String text;
    private String topic;
    private List<OptionDTO> options;
}
