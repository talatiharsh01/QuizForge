// Uses API_BASE_URL from api.js

async function register(username, password, email, role) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, email, role })
        });
        
        const data = await response.json();
        return data; // {success: true/false, message: "...", user: {...}}
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function login(username, password, role) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, role })
        });
        
        const data = await response.json();
        if(data.success) {
            // Save user info in localStorage for other pages
            localStorage.setItem('currentUser', JSON.stringify(data.user));
        }
        return data;
    } catch (error) {
        return { success: false, message: error.message };
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = '../pages/login.html';
}
