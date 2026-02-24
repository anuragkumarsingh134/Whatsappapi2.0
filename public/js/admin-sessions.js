const token = localStorage.getItem('wa_api_token');
const user = JSON.parse(localStorage.getItem('wa_api_user') || '{}');
const urlParams = new URLSearchParams(window.location.search);
const targetUserId = urlParams.get('userId');
const targetUsername = urlParams.get('username');

if (!token || user.role !== 'admin') window.location.href = '/login';
if (!targetUserId) window.location.href = '/admin';

document.getElementById('usernameDisplay').textContent = targetUsername || 'User';

async function loadSessions() {
    try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/admin/users/${targetUserId}/sessions?_=${timestamp}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        const list = document.getElementById('sessionsList');

        if (!data.success || data.sessions.length === 0) {
            list.innerHTML = '<div class="no-sessions">No active sessions found for this user.</div>';
            return;
        }

        list.innerHTML = data.sessions.map(s => `
                    <div class="session-card">
                        <div class="session-info">
                            <div class="session-id">${s.device_id}</div>
                            <div class="session-meta">
                                <div>Phone: ${s.phone_number || 'N/A'}</div>
                                <div>Created: ${new Date(s.created_at).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div class="status-badge ${s.connection_state === 'connected' ? 'status-connected' : 'status-disconnected'}">
                            ${s.connection_state}
                        </div>
                    </div>
                `).join('');

    } catch (err) {
        document.getElementById('sessionsList').innerHTML = '<div class="no-sessions" style="color:var(--danger)">Error loading sessions</div>';
    }
}

loadSessions();
