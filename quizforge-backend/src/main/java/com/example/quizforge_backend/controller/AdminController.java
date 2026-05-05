package com.example.quizforge_backend.controller;

import com.example.quizforge_backend.model.Question;
import com.example.quizforge_backend.model.QuestionOption;
import com.example.quizforge_backend.model.Quiz;
import com.example.quizforge_backend.model.User;
import com.example.quizforge_backend.repository.QuestionRepository;
import com.example.quizforge_backend.repository.QuizRepository;
import com.example.quizforge_backend.repository.UserRepository;
import com.example.quizforge_backend.dto.QuestionDTO;
import com.example.quizforge_backend.dto.OptionDTO;
import com.example.quizforge_backend.dto.QuizCreationDTO;
import com.example.quizforge_backend.repository.QuizAttemptRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private QuizRepository quizRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private QuizAttemptRepository attemptRepository;

    @GetMapping("/questions")
    public List<Question> getAllQuestions() {
        return questionRepository.findAll();
    }

    @PostMapping("/questions")
    public Question addQuestion(@RequestBody QuestionDTO dto) {
        Question q = new Question();
        q.setText(dto.getText());
        q.setTopic(dto.getTopic().toLowerCase());

        List<QuestionOption> options = new ArrayList<>();
        if (dto.getOptions() != null) {
            for (OptionDTO oDto : dto.getOptions()) {
                QuestionOption opt = new QuestionOption();
                opt.setText(oDto.getText());
                opt.setCorrect(oDto.isCorrect());
                opt.setQuestion(q);
                options.add(opt);
            }
        }
        q.setOptions(options);

        // Saving the question cascades to saving its options because of CascadeType.ALL
        return questionRepository.save(q);
    }
    
    @DeleteMapping("/questions/{id}")
    public void deleteQuestion(@PathVariable Long id) {
        questionRepository.deleteById(id);
    }

    @GetMapping("/quizzes")
    public List<Quiz> getAllQuizzes() {
        return quizRepository.findAll();
    }

    @PostMapping("/quizzes")
    public Quiz createQuiz(@RequestBody QuizCreationDTO dto) {
        Quiz quiz = new Quiz();
        quiz.setTitle(dto.getTitle());

        if (dto.getAdminId() != null) {
            User admin = userRepository.findById(dto.getAdminId()).orElse(null);
            quiz.setCreatedBy(admin);
        }

        List<Question> selectedQuestions = questionRepository.findAllById(dto.getQuestionIds());
        quiz.setQuestions(selectedQuestions);

        return quizRepository.save(quiz);
    }

    @GetMapping("/stats")
    public Map<String, Object> getAdminStats() {
        Map<String, Object> stats = new HashMap<>();
        
        long students = userRepository.findAll().stream().filter(u -> "STUDENT".equals(u.getRole().name())).count();
        long quizzesTaken = attemptRepository.count();
        long questionsInBank = questionRepository.count();
        
        double avgScore = attemptRepository.findAll().stream()
                .mapToInt(a -> a.getTotalQuestions() > 0 ? (int) Math.round((double) a.getScore() / a.getTotalQuestions() * 100) : 0)
                .average()
                .orElse(0.0);

        stats.put("totalStudents", students);
        stats.put("quizzesTaken", quizzesTaken);
        stats.put("questionsInBank", questionsInBank);
        stats.put("avgScore", Math.round(avgScore));
        
        return stats;
    }
}
