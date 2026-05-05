document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const userStr = localStorage.getItem('currentUser');
    if(!userStr) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userStr);
    
    // Security check: ensure only Admins access this page
    if(user.role !== 'ADMIN') {
        window.location.href = 'student.html';
        return;
    }

    // Populate dashboard
    document.getElementById('admin-name-display').textContent = user.username;
    
    console.log("Admin dashboard loaded for:", user.username);
    
    // Load Question Bank & Stats
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

    if(!text) return alert("Please enter the question text.");

    const options = [];
    for(let i=0; i<4; i++) {
        const optText = document.getElementById(`opt-${i}`).value;
        if(optText) {
            // Include both correct and isCorrect to safely map to DTO boolean field
            options.push({
                text: optText,
                correct: (i.toString() === correctIdx),
                isCorrect: (i.toString() === correctIdx)
            });
        }
    }

    if(options.length < 2) return alert("Provide at least 2 options.");

    const payload = { text, topic, options };

    try {
        const res = await fetch(`${API_BASE_URL}/admin/questions`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        if(res.ok) {
            const successMsg = document.getElementById('q-add-success');
            successMsg.style.display = 'block';
            setTimeout(() => { successMsg.style.display = 'none'; }, 2000);
            
            // Clear form
            document.getElementById('new-q-text').value = '';
            for(let i=0; i<4; i++) document.getElementById(`opt-${i}`).value = '';
            
            loadQuestions(); // Reload list
        }
    } catch(e) {
        alert("Failed to save: " + e);
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

    if (!title) return alert("Please enter a Quiz Title.");
    if (questionIds.length === 0) return alert("Please select at least 1 question.");

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
            const successMsg = document.getElementById('quiz-add-success');
            successMsg.style.display = 'block';
            setTimeout(() => { successMsg.style.display = 'none'; }, 2000);
            
            document.getElementById('new-quiz-title').value = '';
            document.querySelectorAll('.q-select-cb').forEach(cb => cb.checked = false);
        } else {
            alert("Failed to save quiz");
        }
    } catch(e) {
        alert("Failed to save quiz: " + e);
    }
}
