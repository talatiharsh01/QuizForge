let currentQuiz = null;
let adminQuizzesList = [];
let isSubmitting = false;

// ─── Session Management ───
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
let sessionTimer = null;

function refreshSession() {
    clearTimeout(sessionTimer);
    localStorage.setItem('sessionTimestamp', Date.now().toString());
    sessionTimer = setTimeout(() => {
        showToast('Session expired. Please log in again.', 'error');
        setTimeout(() => logout(), 1500);
    }, SESSION_TIMEOUT_MS);
}

function checkSession() {
    const ts = localStorage.getItem('sessionTimestamp');
    if (ts && (Date.now() - parseInt(ts)) > SESSION_TIMEOUT_MS) {
        logout();
        return false;
    }
    refreshSession();
    return true;
}

// Refresh session on any user interaction
document.addEventListener('click', refreshSession);
document.addEventListener('keydown', refreshSession);

// ─── Toast Notifications ───
function showToast(message, type = 'success') {
    // Remove existing toast
    const existing = document.getElementById('qf-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'qf-toast';
    const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b';
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
    toast.style.cssText = `
        position:fixed; top:24px; right:24px; z-index:99999;
        background:${bgColor}; color:#fff; padding:14px 24px;
        border-radius:12px; font-family:'DM Sans',sans-serif;
        font-size:0.95rem; font-weight:500;
        box-shadow:0 8px 32px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
        max-width:400px;
    `;
    toast.textContent = `${icon} ${message}`;

    // Add animation keyframes if not present
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideIn { from { transform: translateX(120%); opacity:0; } to { transform: translateX(0); opacity:1; } }
            @keyframes slideOut { from { transform: translateX(0); opacity:1; } to { transform: translateX(120%); opacity:0; } }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ─── Initialization ───
document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) { window.location.href = 'login.html'; return; }

    const user = JSON.parse(userStr);
    if (user.role !== 'STUDENT') { window.location.href = 'admin.html'; return; }
    if (!checkSession()) return;

    document.getElementById('student-name-display').textContent = user.username;

    // Load both in parallel for speed
    Promise.all([loadAdminQuizzes(), loadStudentHistory(user.id)]);
});

// ─── History Loading ───
async function loadStudentHistory(studentId) {
    const listDiv = document.getElementById('student-history-body');
    listDiv.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--muted);"><div class="spinner"></div> Loading history...</div>';
    try {
        const res = await fetch(`${API_BASE_URL}/student/attempts/${studentId}`);
        const attempts = await res.json();

        document.getElementById('s-total').textContent = attempts.length;
        if (attempts.length > 0) {
            const best = Math.max(...attempts.map(a => a.score));
            const sum = attempts.reduce((acc, a) => acc + (a.score / a.totalQuestions * 100), 0);
            document.getElementById('s-best').textContent = best;
            document.getElementById('s-avg').textContent = Math.round(sum / attempts.length) + '%';
        } else {
            document.getElementById('s-best').textContent = '—';
            document.getElementById('s-avg').textContent = '—';
        }

        const listDiv = document.getElementById('student-history-body');
        if (attempts.length === 0) {
            listDiv.innerHTML = '<div class="empty-history">No history yet. Take your first quiz!</div>';
            return;
        }

        let html = '';
        attempts.forEach(a => {
            const date = new Date(a.attemptDate).toLocaleDateString();
            const pct = Math.round((a.score / a.totalQuestions) * 100);
            html += `
            <div class="ht-row">
                <span class="topics-badge">${a.quiz ? a.quiz.title : 'Random Quiz'}</span>
                <span>${a.totalQuestions} Qs</span>
                <span class="score-badge ${pct > 70 ? 'high' : 'med'}">${pct}%</span>
                <span class="ht-date">${date}</span>
            </div>`;
        });
        listDiv.innerHTML = html;
    } catch (e) {
        console.error(e);
    }
}

// ─── Admin Quizzes ───
function toggleTopic(topic) {
    document.getElementById(`pill-${topic}`).classList.toggle('active');
}

async function loadAdminQuizzes() {
    try {
        const res = await fetch(`${API_BASE_URL}/student/quizzes`);
        adminQuizzesList = await res.json();

        // Check which quizzes the student already attempted
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const histRes = await fetch(`${API_BASE_URL}/student/attempts/${user.id}`);
        const attempts = await histRes.json();
        const attemptedQuizIds = new Set(attempts.filter(a => a.quiz).map(a => a.quiz.id));

        const listDiv = document.getElementById('admin-quizzes-list');
        if (adminQuizzesList.length === 0) {
            listDiv.innerHTML = '<div class="empty-history">No quizzes assigned by Admin.</div>';
            return;
        }

        let html = '';
        adminQuizzesList.forEach(q => {
            const alreadyDone = attemptedQuizIds.has(q.id);
            html += `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:1rem; margin-bottom:1rem;">
                <div>
                    <h3 style="margin:0; font-size:1.1rem; color:var(--text);">${q.title}</h3>
                    <span style="font-size:0.8rem; color:var(--muted);">${q.questions.length} questions</span>
                </div>
                ${alreadyDone
                    ? `<span style="color:var(--muted); font-size:0.85rem; font-style:italic;">✅ Completed</span>`
                    : `<button class="login-btn admin" style="width:auto; padding:0.5rem 1rem; border-radius:6px;" onclick='startAdminQuiz(${q.id})'>Take Quiz</button>`
                }
            </div>`;
        });
        listDiv.innerHTML = html;
    } catch (e) {
        console.error(e);
    }
}

function startAdminQuiz(id) {
    const quiz = adminQuizzesList.find(q => q.id === id);
    if (quiz) startQuiz(quiz);
}

// ─── Random Quiz Generator ───
async function generateRandomQuiz() {
    const topics = [];
    document.querySelectorAll('.tpill.active').forEach(p => {
        if (p.id === 'pill-java') topics.push('java');
        if (p.id === 'pill-os') topics.push('os');
        if (p.id === 'pill-env') topics.push('env');
    });

    if (topics.length === 0) return showToast('Select at least one topic!', 'warning');

    const count = document.getElementById('totalQ').value;

    try {
        const res = await fetch(`${API_BASE_URL}/student/quizzes/random?topics=${topics.join(',')}&count=${count}`);
        const quiz = await res.json();
        if (!quiz.questions || quiz.questions.length === 0) return showToast('No questions found for the selected topics!', 'error');
        showToast(`Generated ${quiz.questions.length} questions!`);
        startQuiz(quiz);
    } catch (e) {
        showToast('Failed to generate quiz', 'error');
        console.error(e);
    }
}

window.generateQuiz = generateRandomQuiz;

// ─── Quiz Taking ───
function startQuiz(quiz) {
    currentQuiz = quiz;
    isSubmitting = false;
    document.getElementById('quiz-page').style.display = 'block';
    document.getElementById('quiz-title-display').textContent = quiz.title;

    // Reset submit button & exit button (they get hidden/changed after review)
    const submitBtn = document.querySelector('#quiz-page .gen-btn[onclick*="submitQuiz"]');
    if (submitBtn) submitBtn.style.display = '';
    const exitBtn = document.querySelector('#quiz-page .logout-btn[onclick*="exitQuiz"]');
    if (exitBtn) exitBtn.textContent = 'Exit Quiz';

    let html = '';
    quiz.questions.forEach((q, qIndex) => {
        let optsHtml = '';
        q.options.forEach((opt) => {
            optsHtml += `
            <label style="display:block; padding:0.8rem; margin-bottom:0.5rem; background:var(--bg); border:1px solid var(--border); border-radius:8px; cursor:pointer; color:var(--text); transition: all 0.2s;">
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
    if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
        document.getElementById('quiz-page').style.display = 'none';
        currentQuiz = null;
    }
}

// ─── Quiz Submission (with duplicate blocking + #11 answer review) ───
async function submitQuiz() {
    if (!currentQuiz) return;
    if (isSubmitting) return showToast('Quiz is already being submitted...', 'warning');

    // Check for unanswered questions
    let unanswered = 0;
    currentQuiz.questions.forEach((q, i) => {
        if (!document.querySelector(`input[name="q-${i}"]:checked`)) unanswered++;
    });
    if (unanswered > 0 && !confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return;

    isSubmitting = true;

    let score = 0;
    const results = []; // Track per-question results for review

    currentQuiz.questions.forEach((q, qIndex) => {
        const selected = document.querySelector(`input[name="q-${qIndex}"]:checked`);
        let selectedOptId = null;
        let isCorrect = false;
        if (selected) {
            selectedOptId = parseInt(selected.value);
            const opt = q.options.find(o => o.id === selectedOptId);
            if (opt && opt.correct) { score++; isCorrect = true; }
        }
        results.push({ selectedOptId, isCorrect });
    });

    const user = JSON.parse(localStorage.getItem('currentUser'));
    const payload = {
        studentId: user.id,
        quizId: currentQuiz.id,
        score: score,
        totalQuestions: currentQuiz.questions.length
    };

    try {
        const res = await fetch(`${API_BASE_URL}/student/attempts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success === false) {
            showToast(data.message, 'error');
            isSubmitting = false;
            return;
        }

        showToast(data.message, 'success');

        // #11: Show answer review — highlight correct/wrong answers
        showAnswerReview(score);
        
        isSubmitting = false;
        loadStudentHistory(user.id);
        loadAdminQuizzes();
    } catch (e) {
        isSubmitting = false;
        showToast('Failed to save attempt. Check your connection.', 'error');
    }

    function showAnswerReview(score) {
        const pct = Math.round((score / currentQuiz.questions.length) * 100);
        const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📚';

        // Add score header
        const container = document.getElementById('quiz-questions-container');
        const header = document.createElement('div');
        header.style.cssText = 'text-align:center; padding:1.5rem; margin-bottom:1.5rem; border-radius:12px; background:var(--surface); border:1px solid var(--border);';
        header.innerHTML = `
            <div style="font-size:2.5rem;">${emoji}</div>
            <div style="font-size:1.5rem; font-weight:bold; color:var(--text); margin:0.5rem 0;">You scored ${score}/${currentQuiz.questions.length} (${pct}%)</div>
            <button onclick="closeReview()" style="margin-top:0.8rem; padding:0.6rem 1.5rem; background:var(--java); color:#fff; border:none; border-radius:8px; cursor:pointer; font-family:'DM Sans'; font-size:0.9rem;">Close Review</button>
        `;
        container.insertBefore(header, container.firstChild);

        // Highlight each question
        currentQuiz.questions.forEach((q, qIndex) => {
            const correctOpt = q.options.find(o => o.correct);
            const selectedRadio = document.querySelector(`input[name="q-${qIndex}"]:checked`);
            const selectedOptId = selectedRadio ? parseInt(selectedRadio.value) : null;

            // Disable all radios
            document.querySelectorAll(`input[name="q-${qIndex}"]`).forEach(r => r.disabled = true);

            // Highlight options
            q.options.forEach(opt => {
                const label = document.querySelector(`input[name="q-${qIndex}"][value="${opt.id}"]`)?.parentElement;
                if (!label) return;

                if (opt.correct) {
                    label.style.border = '2px solid #10b981';
                    label.style.background = 'rgba(16, 185, 129, 0.1)';
                    label.innerHTML += ' <span style="color:#10b981; font-weight:bold;">✓ Correct</span>';
                } else if (opt.id === selectedOptId && !opt.correct) {
                    label.style.border = '2px solid #ef4444';
                    label.style.background = 'rgba(239, 68, 68, 0.1)';
                    label.innerHTML += ' <span style="color:#ef4444; font-weight:bold;">✗ Wrong</span>';
                }
            });
        });

        // Replace submit/exit buttons with close button
        const btnArea = document.querySelector('#quiz-page .quiz-actions') || document.querySelector('#quiz-page');
        const submitBtn = btnArea?.querySelector('[onclick*="submitQuiz"]');
        const exitBtn = btnArea?.querySelector('[onclick*="exitQuiz"]');
        if (submitBtn) submitBtn.style.display = 'none';
        if (exitBtn) exitBtn.textContent = '← Back to Dashboard';

        window.scrollTo(0, 0);
    }
}

function closeReview() {
    document.getElementById('quiz-page').style.display = 'none';
    currentQuiz = null;
}

