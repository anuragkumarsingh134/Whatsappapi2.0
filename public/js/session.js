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

const deviceId = window.location.pathname.split('/').pop();
let currentSession = null;
let isQrModalOpen = false;
let userApiKey = null;

// Fetch user-level API key
async function loadUserApiKey() {
    try {
        const res = await fetch('/api/auth/api-key', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                userApiKey = data.apiKey;
            }
        }
    } catch (e) {
        console.error('Error loading user API key:', e);
    }
}
loadUserApiKey();

async function loadSession() {
    try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/sessions/${deviceId}?_=${timestamp}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) {
            logout();
            return;
        }

        const data = await res.json();

        if (!data.success) {
            alert('Session not found');
            window.location.href = '/';
            return;
        }

        const prevStatus = currentSession ? currentSession.connectionState : null;
        currentSession = data.session;
        // Robust property access
        // User-level API key (not per-device)

        updateUI();

    } catch (error) {
        console.error('Error loading session:', error);
    }
}

function updateUI() {
    document.getElementById('deviceIdTitle').textContent = currentSession.deviceId;

    const statusBadge = document.getElementById('statusBadge');
    statusBadge.className = `status-badge ${currentSession.connectionState}`;
    statusBadge.textContent = formatState(currentSession.connectionState);

    document.getElementById('sessionInfo').innerHTML = `
                <div class="info-row"><strong>Device ID:</strong> <span>${currentSession.deviceId}</span></div>
                <div class="info-row"><strong>Phone:</strong> <span>${currentSession.phoneNumber || 'N/A'}</span></div>
                <div class="info-row"><strong>Created:</strong> <span>${new Date(currentSession.createdAt).toLocaleDateString()}</span></div>
            `;

    // Handle "Connect" button visibility
    const connectSection = document.getElementById('connectSection');
    const connectBtn = connectSection.querySelector('button');

    if (currentSession.connectionState === 'disconnected') {
        connectSection.classList.remove('hidden');
        connectBtn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Generate QR Code
        `;
        connectBtn.onclick = startSession;
    } else if (currentSession.connectionState === 'waiting_qr') {
        connectSection.classList.remove('hidden');
        connectBtn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            View QR Code
        `;
        connectBtn.onclick = openQRModal;
    } else if (currentSession.connectionState === 'connected') {
        connectSection.classList.remove('hidden');
        connectBtn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="9 12 12 15 16 10"></polyline>
            </svg>
            View Connection Status
        `;
        connectBtn.onclick = openConnectionStatusModal;
    } else {
        connectSection.classList.add('hidden');
    }

    // Handle QR polling if modal is open
    if (currentSession.connectionState === 'waiting_qr' && isQrModalOpen) {
        loadQRCode();
    }

    // Handle Connected Sections
    if (currentSession.connectionState === 'connected') {
        document.getElementById('apiKeySection').classList.remove('hidden');
        document.getElementById('messageSection').classList.remove('hidden');
        document.getElementById('pdfSection').classList.remove('hidden');
        updateApiKeyDisplay();
    } else {
        document.getElementById('apiKeySection').classList.add('hidden');
        document.getElementById('messageSection').classList.add('hidden');
        document.getElementById('pdfSection').classList.add('hidden');
    }
}


async function loadQRCode() {
    try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/sessions/${deviceId}/qr?_=${timestamp}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) return;

        const data = await res.json();
        const container = document.getElementById('qrContainer');

        if (data.qrImage) {
            container.innerHTML = `<img src="${data.qrImage}" alt="QR Code">`;
        } else {
            container.innerHTML = `<div class="qr-placeholder">${data.message || 'Initializing...'}</div>`;
        }
    } catch (error) {
        console.error('Error loading QR:', error);
    }
}


// --- Modal Functions ---

function openQRModal() {
    const modal = document.getElementById('qrModal');
    modal.classList.add('active');
    isQrModalOpen = true;
    loadQRCode(); // Immediate load
}

function closeQRModal() {
    const modal = document.getElementById('qrModal');
    modal.classList.remove('active');
    isQrModalOpen = false;
}

function openConnectionStatusModal() {
    const modal = document.getElementById('qrModal');
    const container = document.getElementById('qrContainer');
    const instructions = modal.querySelector('.qr-instructions');
    const title = modal.querySelector('.modal-title');

    // Update modal content for connected status
    title.textContent = 'Connection Status';
    instructions.textContent = 'Your WhatsApp session is active and connected.';

    // Show loading state first
    container.innerHTML = `<div class="qr-placeholder">Loading profile...</div>`;

    modal.classList.add('active');
    isQrModalOpen = true;

    // Fetch real WhatsApp profile picture
    if (currentSession.phoneNumber) {
        fetch(`/api/sessions/${deviceId}/profile-picture`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.profilePicUrl) {
                    container.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                        <img src="${data.profilePicUrl}" alt="Profile" style="width: 160px; height: 160px; border-radius: 50%; border: 4px solid #10b981; object-fit: cover;">
                        <div style="text-align: center;">
                            <div style="color: #10b981; font-weight: 700; font-size: 1.1rem; margin-bottom: 4px;">✓ Connected</div>
                            <div style="color: #64748b; font-size: 0.9rem;">+${currentSession.phoneNumber}</div>
                        </div>
                    </div>
                `;
                } else {
                    const avatarUrl = `https://ui-avatars.com/api/?name=${currentSession.phoneNumber}&background=10b981&color=fff&size=200&bold=true`;
                    container.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                        <img src="${avatarUrl}" alt="Profile" style="width: 160px; height: 160px; border-radius: 50%; border: 4px solid #10b981;">
                        <div style="text-align: center;">
                            <div style="color: #10b981; font-weight: 700; font-size: 1.1rem; margin-bottom: 4px;">✓ Connected</div>
                            <div style="color: #64748b; font-size: 0.9rem;">+${currentSession.phoneNumber}</div>
                        </div>
                    </div>
                `;
                }
            })
            .catch(err => {
                console.error('Error fetching profile:', err);
                const avatarUrl = `https://ui-avatars.com/api/?name=${currentSession.phoneNumber}&background=10b981&color=fff&size=200&bold=true`;
                container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                    <img src="${avatarUrl}" alt="Profile" style="width: 160px; height: 160px; border-radius: 50%; border: 4px solid #10b981;">
                    <div style="text-align: center;">
                        <div style="color: #10b981; font-weight: 700; font-size: 1.1rem; margin-bottom: 4px;">✓ Connected</div>
                        <div style="color: #64748b; font-size: 0.9rem;">+${currentSession.phoneNumber}</div>
                    </div>
                </div>
            `;
            });
    } else {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 20px;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); display: flex; align-items: center; justify-content: center;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="9 12 12 15 16 10"></polyline>
                    </svg>
                </div>
                <div style="color: #10b981; font-weight: 700; font-size: 1.2rem;">✓ Connected</div>
            </div>
        `;
    }

    modal.classList.add('active');
    isQrModalOpen = true;
}


// --- Action Functions ---

async function startSession() {
    const btn = document.querySelector('.btn-connect');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Starting...';
    }

    try {
        const res = await fetch(`/api/sessions/${deviceId}/start`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (data.success) {
            // Give backend a moment to switch state
            setTimeout(() => {
                loadSession();
                openQRModal();
            }, 500);
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                Generate QR Code
            `;
        }
    }
}

// --- APIs ---

function updateApiKeyDisplay() {
    const display = document.getElementById('apiKeyDisplay');
    if (userApiKey) {
        display.innerHTML = `<div class="api-key-display">${userApiKey}</div>`;
    } else {
        display.innerHTML = `<p style="color: #94a3b8; font-style: italic;">No API key set. Go to Profile to generate one.</p>`;
    }
}

async function sendMessage() {
    const phone = document.getElementById('phoneInput').value.trim();
    const message = document.getElementById('messageInput').value.trim();

    if (!phone || !message) {
        alert('Please enter phone number and message');
        return;
    }

    if (!userApiKey) {
        alert('Please set an API Key first (go to Profile)');
        return;
    }

    try {
        const res = await fetch('/api/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userApiKey}`
            },
            body: JSON.stringify({
                deviceId: deviceId,
                number: phone,
                message: message
            })
        });

        const data = await res.json();
        if (data.success) {
            alert('Message sent!');
            document.getElementById('messageInput').value = '';
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function sendPDF() {
    const phone = document.getElementById('pdfPhoneInput').value.trim();
    const url = document.getElementById('pdfUrlInput').value.trim();
    const fileName = document.getElementById('pdfFileNameInput').value.trim();

    if (!phone || !url) {
        alert('Please enter phone number and PDF URL');
        return;
    }

    if (!userApiKey) {
        alert('Please set an API Key first (go to Profile)');
        return;
    }

    try {
        const res = await fetch('/api/messages/send-file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userApiKey}`
            },
            body: JSON.stringify({
                deviceId: deviceId,
                number: phone,
                url: url,
                fileName: fileName || undefined
            })
        });

        const data = await res.json();
        if (data.success) {
            alert('PDF sent!');
            document.getElementById('pdfUrlInput').value = '';
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteSession() {
    if (!confirm(`Are you sure you want to delete session ${deviceId}?`)) {
        return;
    }

    try {
        const res = await fetch(`/api/sessions/${deviceId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (data.success) {
            alert('Session deleted');
            window.location.href = '/';
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Profile Functions
function openProfile() {
    const user = JSON.parse(localStorage.getItem('wa_api_user') || '{}');
    document.getElementById('p_username').value = user.username || '';
    document.getElementById('p_name').value = user.name || '';
    document.getElementById('p_email').value = user.email || '';
    document.getElementById('p_password').value = '';
    document.getElementById('profileMsg').textContent = '';
    document.getElementById('profileModal').classList.add('active');
    loadProfileApiKey();
}

async function loadProfileApiKey() {
    const display = document.getElementById('profileApiKeyDisplay');
    const msg = document.getElementById('apiKeyMsg');
    msg.textContent = '';

    try {
        const res = await fetch('/api/auth/api-key', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.apiKey) {
            display.textContent = data.apiKey;
            display.style.color = '#e2e8f0';
            userApiKey = data.apiKey; // sync with global
        } else {
            display.textContent = 'No API key generated yet';
            display.style.color = '#94a3b8';
        }
    } catch (e) {
        display.textContent = 'Error loading API key';
        display.style.color = '#ef4444';
    }
}

async function generateProfileApiKey() {
    const msg = document.getElementById('apiKeyMsg');
    msg.textContent = '';

    if (!confirm('This will generate a new API key. Any existing key will be replaced. Continue?')) {
        return;
    }

    try {
        const res = await fetch('/api/auth/api-key', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('profileApiKeyDisplay').textContent = data.apiKey;
            document.getElementById('profileApiKeyDisplay').style.color = '#e2e8f0';
            userApiKey = data.apiKey; // sync with global
            updateApiKeyDisplay(); // update session page display too
            msg.style.color = '#10b981';
            msg.textContent = 'API key generated! Save this key securely.';
        } else {
            msg.style.color = '#ef4444';
            msg.textContent = 'Error: ' + data.error;
        }
    } catch (e) {
        msg.style.color = '#ef4444';
        msg.textContent = 'Error generating API key';
    }
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
            localStorage.setItem('wa_api_user', JSON.stringify({ ...data.user }));
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


// Utility Functions
function formatState(state) {
    const states = {
        'disconnected': 'Disconnected',
        'waiting_qr': 'Waiting for QR',
        'connected': 'Connected'
    };
    return states[state] || state;
}


loadSession();
setInterval(loadSession, 3000);
