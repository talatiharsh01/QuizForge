const API_BASE_URL = 'http://localhost:8080/api';

// Utility to handle JSON responses safely
async function handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }
    return data;
}
