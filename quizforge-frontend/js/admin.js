// ─── Session Management ───
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
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

document.addEventListener('click', refreshSession);
document.addEventListener('keydown', refreshSession);

// ─── Toast Notifications ───
function showToast(message, type = 'success') {
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
    if (user.role !== 'ADMIN') { window.location.href = 'student.html'; return; }
    if (!checkSession()) return;

    document.getElementById('admin-name-display').textContent = user.username;

    loadQuestions();
    loadAdminStats();
});

async function loadAdminStats() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/stats`);
        const stats = await res.json();
        
        document.getElementById('a-students').textContent = stats.totalStudents;
        document.getElementById('a-quizzes').textContent = stats.quizzesTaken;
        document.getElementById('a-avg').textContent = stats.avgScore + '%';
        // a-questions is already updated by loadQuestions, but we can sync it
        document.getElementById('a-questions').textContent = stats.questionsInBank;
    } catch(e) {
        console.error(e);
    }
}

let allQuestions = [];
let currentFilter = 'java';

async function loadQuestions() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/questions`);
        allQuestions = await response.json();
        
        document.getElementById('a-questions').textContent = allQuestions.length;
        filterQuestions(currentFilter);
    } catch (e) {
        console.error("Failed to load questions", e);
    }
}

function filterQuestions(topic) {
    currentFilter = topic;
    // Update active tab UI
    document.querySelectorAll('.btab').forEach(b => b.classList.remove('active'));
    document.querySelector(`.btab.${topic}`).classList.add('active');

    const listDiv = document.getElementById('question-list');
    const filtered = allQuestions.filter(q => q.topic.toLowerCase() === topic);

    if (filtered.length === 0) {
        listDiv.innerHTML = '<div class="empty-history">No questions found in this topic. Add some!</div>';
        return;
    }

    let html = '';
    filtered.forEach((q, idx) => {
        let optsHtml = q.options.map(o => 
            `<span class="bi-opt ${o.correct ? 'ok' : ''}">${o.text}</span>`
        ).join('');

        html += `
        <div class="bi">
            <div class="bi-n">Q${idx+1}.</div>
            <div>
                <div class="bi-q"><span style="color:var(--${q.topic}); font-weight:bold; text-transform:uppercase; font-size:0.75em; margin-right:8px;">[${q.topic}]</span>${q.text}</div>
                <div class="bi-opts">${optsHtml}</div>
            </div>
        </div>`;
    });
    listDiv.innerHTML = html;
}

async function addQuestion() {
    const text = document.getElementById('new-q-text').value;
    const topic = document.getElementById('new-q-topic').value;
    const correctIdx = document.querySelector('input[name="correct-opt"]:checked').value;

    if(!text) return showToast('Please enter the question text.', 'warning');

    const options = [];
    for(let i=0; i<4; i++) {
        const optText = document.getElementById(`opt-${i}`).value;
        if(optText) {
            options.push({
                text: optText,
                correct: (i.toString() === correctIdx),
                isCorrect: (i.toString() === correctIdx)
            });
        }
    }

    if(options.length < 2) return showToast('Provide at least 2 options.', 'warning');

    const payload = { text, topic, options };

    try {
        const res = await fetch(`${API_BASE_URL}/admin/questions`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        if(res.ok) {
            showToast('Question added to the bank!');
            
            document.getElementById('new-q-text').value = '';
            for(let i=0; i<4; i++) document.getElementById(`opt-${i}`).value = '';
            
            loadQuestions();
        }
    } catch(e) {
        showToast('Failed to save: ' + e, 'error');
    }
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    
    // Highlight correct tab
    if(tabName === 'students') {
        document.querySelectorAll('.admin-tab')[0].classList.add('active');
    } else if(tabName === 'bank') {
        document.querySelectorAll('.admin-tab')[1].classList.add('active');
    } else if(tabName === 'quiz-creator') {
        document.querySelectorAll('.admin-tab')[2].classList.add('active');
        populateQuizCreator();
    }

    document.getElementById(`ap-${tabName}`).classList.add('active');
}

function populateQuizCreator() {
    const selectorDiv = document.getElementById('quiz-question-selector');
    if (allQuestions.length === 0) {
        selectorDiv.innerHTML = '<div class="empty-history">No questions in bank. Add some first!</div>';
        return;
    }
    
    let html = '';
    allQuestions.forEach(q => {
        html += `
        <label style="display:flex; align-items:flex-start; gap:10px; margin-bottom:12px; cursor:pointer; padding: 8px; border-radius: 6px; background: var(--surface);">
            <input type="checkbox" class="q-select-cb" value="${q.id}" style="margin-top: 3px;">
            <span style="font-size:0.9rem; color:var(--text);"><span style="color:var(--${q.topic}); font-weight:bold; text-transform:uppercase; font-size:0.75em; margin-right:5px;">[${q.topic}]</span> ${q.text}</span>
        </label>
        `;
    });
    selectorDiv.innerHTML = html;
}

async function saveCustomQuiz() {
    const title = document.getElementById('new-quiz-title').value;
    const checkboxes = document.querySelectorAll('.q-select-cb:checked');
    const questionIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (!title) return showToast('Please enter a Quiz Title.', 'warning');
    if (questionIds.length === 0) return showToast('Please select at least 1 question.', 'warning');

    const user = JSON.parse(localStorage.getItem('currentUser'));

    const payload = {
        title: title,
        adminId: user.id,
        questionIds: questionIds
    };

    try {
        const res = await fetch(`${API_BASE_URL}/admin/quizzes`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            showToast(`Quiz "${title}" created with ${questionIds.length} questions!`);
            
            document.getElementById('new-quiz-title').value = '';
            document.querySelectorAll('.q-select-cb').forEach(cb => cb.checked = false);
        } else {
            showToast('Failed to save quiz', 'error');
        }
    } catch(e) {
        showToast('Failed to save quiz: ' + e, 'error');
    }
}
