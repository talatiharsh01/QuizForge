package com.example.quizforge_backend.controller;

import com.example.quizforge_backend.model.Question;
import com.example.quizforge_backend.model.Quiz;
import com.example.quizforge_backend.model.QuizAttempt;
import com.example.quizforge_backend.model.User;
import com.example.quizforge_backend.repository.QuestionRepository;
import com.example.quizforge_backend.repository.QuizRepository;
import com.example.quizforge_backend.repository.QuizAttemptRepository;
import com.example.quizforge_backend.repository.UserRepository;
import com.example.quizforge_backend.dto.QuizAttemptDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/student")
@CrossOrigin(origins = "*")
public class StudentController {

    @Autowired
    private QuizRepository quizRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private QuizAttemptRepository attemptRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/quizzes")
    public List<Quiz> getAdminQuizzes() {
        return quizRepository.findAll();
    }

    @GetMapping("/quizzes/{id}")
    public Quiz getQuiz(@PathVariable Long id) {
        return quizRepository.findById(id).orElse(null);
    }

    @GetMapping("/quizzes/random")
    public Quiz generateRandomQuiz(@RequestParam List<String> topics, @RequestParam int count) {
        List<Question> allQuestions = questionRepository.findAll();
        
        List<Question> filteredQuestions = allQuestions.stream()
                .filter(q -> topics.contains(q.getTopic().toLowerCase()))
                .collect(Collectors.toList());

        Collections.shuffle(filteredQuestions);
        
        List<Question> selectedQuestions = filteredQuestions.stream()
                .limit(count)
                .collect(Collectors.toList());

        Quiz randomQuiz = new Quiz();
        randomQuiz.setTitle("Random Quiz: " + String.join(", ", topics).toUpperCase());
        randomQuiz.setQuestions(selectedQuestions);
        
        return quizRepository.save(randomQuiz);
    }

    @PostMapping("/attempts")
    public Map<String, Object> saveAttempt(@RequestBody QuizAttemptDTO dto) {
        Map<String, Object> response = new HashMap<>();

        // Block duplicate attempts on the same quiz
        if (attemptRepository.existsByStudentIdAndQuizId(dto.getStudentId(), dto.getQuizId())) {
            response.put("success", false);
            response.put("message", "You have already attempted this quiz. Duplicate attempts are not allowed.");
            return response;
        }

        QuizAttempt attempt = new QuizAttempt();
        User student = userRepository.findById(dto.getStudentId()).orElseThrow();
        Quiz quiz = quizRepository.findById(dto.getQuizId()).orElseThrow();
        
        attempt.setStudent(student);
        attempt.setQuiz(quiz);
        attempt.setScore(dto.getScore());
        attempt.setTotalQuestions(dto.getTotalQuestions());
        
        attemptRepository.save(attempt);

        int pct = dto.getTotalQuestions() > 0 ? Math.round((float) dto.getScore() / dto.getTotalQuestions() * 100) : 0;
        response.put("success", true);
        response.put("message", "Quiz submitted! You scored " + dto.getScore() + "/" + dto.getTotalQuestions() + " (" + pct + "%)");
        response.put("score", dto.getScore());
        response.put("total", dto.getTotalQuestions());
        response.put("percentage", pct);
        return response;
    }

    @GetMapping("/attempts/{studentId}")
    public List<QuizAttempt> getStudentHistory(@PathVariable Long studentId) {
        return attemptRepository.findByStudentIdOrderByAttemptDateDesc(studentId);
    }
}
