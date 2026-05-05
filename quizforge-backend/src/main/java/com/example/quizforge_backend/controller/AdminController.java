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
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
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
    @Cacheable("questions")
    public List<Question> getAllQuestions() {
        return questionRepository.findAll();
    }

    @PostMapping("/questions")
    @CacheEvict(value = "questions", allEntries = true)
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
    @CacheEvict(value = "questions", allEntries = true)
    public void deleteQuestion(@PathVariable Long id) {
        questionRepository.deleteById(id);
    }

    @GetMapping("/quizzes")
    @Cacheable("quizzes")
    public List<Quiz> getAllQuizzes() {
        return quizRepository.findAll();
    }

    @PostMapping("/quizzes")
    @CacheEvict(value = "quizzes", allEntries = true)
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
        
        stats.put("totalStudents", userRepository.countByRole(com.example.quizforge_backend.model.Role.STUDENT));
        stats.put("quizzesTaken", attemptRepository.count());
        stats.put("questionsInBank", questionRepository.count());
        stats.put("avgScore", Math.round(attemptRepository.getAverageScorePercentage()));
        
        return stats;
    }

    @GetMapping("/students")
    public List<Map<String, Object>> getStudents() {
        List<User> students = userRepository.findAll().stream()
                .filter(u -> u.getRole() == com.example.quizforge_backend.model.Role.STUDENT)
                .toList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (User s : students) {
            Map<String, Object> info = new HashMap<>();
            info.put("id", s.getId());
            info.put("username", s.getUsername());
            info.put("email", s.getEmail());
            
            List<com.example.quizforge_backend.model.QuizAttempt> attempts = 
                attemptRepository.findByStudentIdOrderByAttemptDateDesc(s.getId());
            info.put("quizzesTaken", attempts.size());
            
            if (!attempts.isEmpty()) {
                double avg = attempts.stream()
                    .mapToInt(a -> a.getTotalQuestions() > 0 ? (int) Math.round((double) a.getScore() / a.getTotalQuestions() * 100) : 0)
                    .average().orElse(0);
                info.put("avgScore", Math.round(avg));
            } else {
                info.put("avgScore", 0);
            }
            result.add(info);
        }
        return result;
    }
}
