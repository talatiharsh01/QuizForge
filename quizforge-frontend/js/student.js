let currentQuiz = null;
let adminQuizzesList = [];

document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('currentUser');
    if(!userStr) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userStr);
    if(user.role !== 'STUDENT') {
        window.location.href = 'admin.html';
        return;
    }

    document.getElementById('student-name-display').textContent = user.username;
    
    // Load assigned quizzes & history
    loadAdminQuizzes();
    loadStudentHistory(user.id);
});

async function loadStudentHistory(studentId) {
    try {
        const res = await fetch(`${API_BASE_URL}/student/attempts/${studentId}`);
        const attempts = await res.json();
        
        document.getElementById('s-total').textContent = attempts.length;
        if(attempts.length > 0) {
            const best = Math.max(...attempts.map(a => a.score));
            const sum = attempts.reduce((acc, a) => acc + (a.score / a.totalQuestions * 100), 0);
            document.getElementById('s-best').textContent = best;
            document.getElementById('s-avg').textContent = Math.round(sum / attempts.length) + '%';
        }

        const listDiv = document.getElementById('student-history-body');
        if(attempts.length === 0) {
            listDiv.innerHTML = '<div class="empty-history">No history found. Take a quiz!</div>';
            return;
        }

        let html = '';
        attempts.forEach(a => {
            const date = new Date(a.attemptDate).toLocaleDateString();
            const pct = Math.round((a.score / a.totalQuestions) * 100);
            html += `
            <div class="ht-row">
                <span class="topics-badge">${a.quiz.title}</span>
                <span>${a.totalQuestions} Qs</span>
                <span class="score-badge ${pct > 70 ? 'high' : 'med'}">${pct}%</span>
                <span class="ht-date">${date}</span>
            </div>`;
        });
        listDiv.innerHTML = html;
    } catch(e) {
        console.error(e);
    }
}

function toggleTopic(topic) {
    const el = document.getElementById(`pill-${topic}`);
    el.classList.toggle('active');
}

async function loadAdminQuizzes() {
    try {
        const res = await fetch(`${API_BASE_URL}/student/quizzes`);
        adminQuizzesList = await res.json();
        
        const listDiv = document.getElementById('admin-quizzes-list');
        if(adminQuizzesList.length === 0) {
            listDiv.innerHTML = '<div class="empty-history">No quizzes assigned by Admin.</div>';
            return;
        }

        let html = '';
        adminQuizzesList.forEach(q => {
            html += `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:1rem; margin-bottom:1rem;">
                <div>
                    <h3 style="margin:0; font-size:1.1rem; color:var(--text);">${q.title}</h3>
                    <span style="font-size:0.8rem; color:var(--muted);">${q.questions.length} questions</span>
                </div>
                <button class="login-btn admin" style="width:auto; padding:0.5rem 1rem; border-radius:6px;" onclick='startAdminQuiz(${q.id})'>Take Quiz</button>
            </div>`;
        });
        listDiv.innerHTML = html;
    } catch(e) {
        console.error(e);
    }
}

function startAdminQuiz(id) {
    const quiz = adminQuizzesList.find(q => q.id === id);
    if(quiz) startQuiz(quiz);
}

async function generateRandomQuiz() {
    const topics = [];
    document.querySelectorAll('.tpill.active').forEach(p => {
        if(p.id === 'pill-java') topics.push('java');
        if(p.id === 'pill-os') topics.push('os');
        if(p.id === 'pill-env') topics.push('env');
    });

    if(topics.length === 0) return alert('Select at least one topic!');

    const count = document.getElementById('totalQ').value;

    try {
        const res = await fetch(`${API_BASE_URL}/student/quizzes/random?topics=${topics.join(',')}&count=${count}`);
        const quiz = await res.json();
        if(!quiz.questions || quiz.questions.length === 0) return alert('No questions found for the selected topics!');
        startQuiz(quiz);
    } catch(e) {
        alert("Failed to generate quiz");
        console.error(e);
    }
}

// Ensure the HTML button calls generateRandomQuiz instead of the old function
window.generateQuiz = generateRandomQuiz;

function startQuiz(quiz) {
    currentQuiz = quiz;
    document.getElementById('quiz-page').style.display = 'block';
    document.getElementById('quiz-title-display').textContent = quiz.title;

    let html = '';
    quiz.questions.forEach((q, qIndex) => {
        let optsHtml = '';
        q.options.forEach((opt) => {
            optsHtml += `
            <label style="display:block; padding:0.8rem; margin-bottom:0.5rem; background:var(--bg); border:1px solid var(--border); border-radius:8px; cursor:pointer; color:var(--text);">
                <input type="radio" name="q-${qIndex}" value="${opt.id}" style="margin-right:10px;"> ${opt.text}
            </label>`;
        });

        html += `
        <div class="qcard" style="background:var(--surface); padding:1.5rem; border-radius:12px; margin-bottom:1.5rem; border:1px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="font-size:1.1rem; font-weight:600; color:var(--text); margin-bottom:1.2rem;">
                <span style="color:var(--${q.topic}); font-size:0.7em; text-transform:uppercase; margin-right:8px; border:1px solid var(--${q.topic}); padding:2px 6px; border-radius:4px;">${q.topic}</span>
                ${qIndex + 1}. ${q.text}
            </div>
            ${optsHtml}
        </div>`;
    });
    
    document.getElementById('quiz-questions-container').innerHTML = html;
    window.scrollTo(0, 0);
}

function exitQuiz() {
    if(confirm("Are you sure you want to exit? Your progress will be lost.")) {
        document.getElementById('quiz-page').style.display = 'none';
        currentQuiz = null;
    }
}

async function submitQuiz() {
    if(!currentQuiz) return;
    
    let score = 0;
    currentQuiz.questions.forEach((q, qIndex) => {
        const selected = document.querySelector(`input[name="q-${qIndex}"]:checked`);
        if (selected) {
            const selectedOptId = parseInt(selected.value);
            const opt = q.options.find(o => o.id === selectedOptId);
            if (opt && opt.correct) score++;
        }
    });

    const user = JSON.parse(localStorage.getItem('currentUser'));
    const payload = {
        studentId: user.id,
        quizId: currentQuiz.id,
        score: score,
        totalQuestions: currentQuiz.questions.length
    };

    try {
        await fetch(`${API_BASE_URL}/student/attempts`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        alert(`🎉 Quiz Completed!\n\nYour Score: ${score} out of ${currentQuiz.questions.length}`);
        document.getElementById('quiz-page').style.display = 'none';
        currentQuiz = null;
        
        loadStudentHistory(user.id);
    } catch(e) {
        alert("Failed to save attempt.");
    }
}
