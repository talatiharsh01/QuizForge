package com.example.quizforge_backend.controller;

import com.example.quizforge_backend.model.Question;
import com.example.quizforge_backend.model.Quiz;
import com.example.quizforge_backend.repository.QuestionRepository;
import com.example.quizforge_backend.repository.QuizRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/student")
@CrossOrigin(origins = "*")
public class StudentController {

    @Autowired
    private QuizRepository quizRepository;

    @Autowired
    private QuestionRepository questionRepository;

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
        
        return randomQuiz;
    }
}
