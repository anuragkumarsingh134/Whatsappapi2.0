// Auth check
const token = localStorage.getItem('wa_api_token');
if (!token) {
    window.location.href = '/login';
}

const user = JSON.parse(localStorage.getItem('wa_api_user') || '{}');
document.getElementById('usernameDisplay').textContent = user.username || '';

function logout() {
    localStorage.removeItem('wa_api_token');
    localStorage.removeItem('wa_api_user');
    window.location.href = '/login';
}

async function loadSessions() {
    try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/sessions?_=${timestamp}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) {
            logout();
            return;
        }

        const data = await res.json();

        const container = document.getElementById('sessions-container');

        if (!data.sessions || data.sessions.length === 0) {
            container.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <svg style="width: 64px; height: 64px; color: #475569;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                            </div>
                            <h2>No sessions found</h2>
                            <p>Create your first WhatsApp session to get started</p>
                        </div>
                    `;
            return;
        }

        container.innerHTML = '<div class="sessions-grid">' + data.sessions.map(s => `
                    <div class="session-card" onclick="openSession('${s.deviceId}')">
                        <div class="device-id">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                <line x1="12" y1="18" x2="12.01" y2="18"></line>
                            </svg>
                            ${s.deviceId}
                        </div>
                        <div class="status ${s.connectionState}">${formatState(s.connectionState)}</div>
                        <div class="info">
                            <svg class="icon" style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            <strong>API Key:</strong> ${s.hasApiKey ? '✓ Configured' : '✗ Not Set'}
                        </div>
                        ${s.phoneNumber ? `<div class="info">
                            <svg class="icon" style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            <strong>Phone:</strong> ${s.phoneNumber}
                        </div>` : ''}
                        <div class="info">
                            <svg class="icon" style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <strong>Created:</strong> ${new Date(s.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                `).join('') + '</div>';
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

function formatState(state) {
    const states = {
        'disconnected': 'Disconnected',
        'waiting_qr': 'Waiting for QR',
        'connected': 'Connected'
    };
    return states[state] || state;
}

function openSession(deviceId) {
    window.location.href = `/session/${deviceId}`;
}

function showCreateModal() {
    document.getElementById('createModal').style.display = 'block';
    document.getElementById('deviceIdInput').focus();
}

function hideCreateModal() {
    document.getElementById('createModal').style.display = 'none';
    document.getElementById('deviceIdInput').value = '';
}

async function createSession() {
    const deviceId = document.getElementById('deviceIdInput').value.trim();

    if (!deviceId) {
        alert('Please enter a device ID');
        return;
    }

    try {
        const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ deviceId })
        });

        const data = await res.json();

        if (data.success) {
            hideCreateModal();
            loadSessions();
            setTimeout(() => openSession(deviceId), 500);
        } else {
            alert(data.error || 'Failed to create session');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

document.getElementById('createModal').addEventListener('click', (e) => {
    if (e.target.id === 'createModal') hideCreateModal();
});

// Profile Functions
function openProfile() {
    const user = JSON.parse(localStorage.getItem('wa_api_user') || '{}');
    document.getElementById('p_username').value = user.username || '';
    document.getElementById('p_name').value = user.name || '';
    document.getElementById('p_email').value = user.email || '';
    document.getElementById('p_password').value = '';
    document.getElementById('profileMsg').textContent = '';
    document.getElementById('profileModal').classList.add('active');
}

function closeProfile() {
    document.getElementById('profileModal').classList.remove('active');
}

async function updateProfile(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const msg = document.getElementById('profileMsg');

    const username = document.getElementById('p_username').value;
    const name = document.getElementById('p_name').value;
    const email = document.getElementById('p_email').value;
    const password = document.getElementById('p_password').value;

    btn.disabled = true;
    btn.innerText = 'Saving...';
    msg.textContent = '';

    try {
        const body = { username, name, email };
        if (password) body.password = password;

        const res = await fetch('/api/auth/update-profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.success) {
            msg.style.color = '#10b981';
            msg.textContent = 'Profile updated successfully!';

            // Update local storage
            localStorage.setItem('wa_api_user', JSON.stringify({ ...data.user }));
            // Update header display if name changed
            document.getElementById('usernameDisplay').textContent = data.user.name || data.user.username;

            setTimeout(closeProfile, 1500);
        } else {
            msg.style.color = '#ef4444';
            msg.textContent = data.error;
        }
    } catch (err) {
        msg.style.color = '#ef4444';
        msg.textContent = 'Error updating profile';
    } finally {
        btn.disabled = false;
        btn.innerText = 'Save Changes';
    }
}

loadSessions();
setInterval(loadSessions, 5000);
