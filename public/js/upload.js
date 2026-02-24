// Check authentication on page load
let userApiKey = null;

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('wa_api_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Display username
    const userStr = localStorage.getItem('wa_api_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        document.getElementById('usernameDisplay').textContent = user.username;
    }

    // Load user API key, then sessions
    loadUserApiKey().then(() => loadSessions());

    // Setup drag and drop
    setupDragAndDrop();
});

// Load user-level API key
async function loadUserApiKey() {
    try {
        const token = localStorage.getItem('wa_api_token');
        const res = await fetch('/api/auth/api-key', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.apiKey) {
                userApiKey = data.apiKey;
            }
        }
    } catch (e) {
        console.error('Error loading user API key:', e);
    }
}

// Load user sessions
async function loadSessions() {
    try {
        const token = localStorage.getItem('wa_api_token');
        const response = await fetch('/api/sessions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load sessions');
        }

        const data = await response.json();
        const select = document.getElementById('deviceSelect');

        // Clear existing options (except first one)
        select.innerHTML = '<option value="">Select a session...</option>';

        // Add session options
        data.sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.deviceId;
            option.textContent = `${session.deviceId} (${session.connectionState})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading sessions:', error);
        alert('Failed to load sessions. Please refresh the page.');
    }
}

// Load device info when selected
function loadDeviceInfo() {
    const select = document.getElementById('deviceSelect');
    const deviceId = select.value;
    const deviceInfo = document.getElementById('deviceInfo');
    const uploadSection = document.getElementById('uploadSection');
    const filesSection = document.getElementById('filesSection');

    if (!deviceId) {
        deviceInfo.classList.add('hidden');
        uploadSection.classList.add('hidden');
        filesSection.classList.add('hidden');
        return;
    }

    const selectedOption = select.options[select.selectedIndex];

    deviceInfo.innerHTML = `
        <div class="device-info-item">
            <span class="device-info-label">Device ID:</span>
            <span class="device-info-value">${deviceId}</span>
        </div>
        <div class="device-info-item">
            <span class="device-info-label">API Key:</span>
            <span class="device-info-value">${userApiKey ? '✓ Configured' : '✗ Not Set (go to Profile)'}</span>
        </div>
    `;

    deviceInfo.classList.remove('hidden');

    if (userApiKey) {
        uploadSection.classList.remove('hidden');
        filesSection.classList.remove('hidden');
        loadFiles();
    } else {
        uploadSection.classList.add('hidden');
        filesSection.classList.add('hidden');
        alert('Please set an API key in your Profile before uploading files.');
    }
}

// Setup drag and drop
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // Click to select file
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File selected via input
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Handle selected file
function handleFile(file) {
    const maxSize = 52428800; // 50MB

    if (file.size > maxSize) {
        alert('File is too large. Maximum file size is 50MB.');
        return;
    }

    // Store file globally
    window.selectedFile = file;

    // Display file info
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileInfo').classList.remove('hidden');
    document.getElementById('uploadBtn').classList.remove('hidden');
    document.getElementById('uploadSuccess').classList.add('hidden');
}

// Clear selected file
function clearFile() {
    window.selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').classList.add('hidden');
    document.getElementById('uploadBtn').classList.add('hidden');
    document.getElementById('uploadProgress').classList.add('hidden');
    document.getElementById('uploadSuccess').classList.add('hidden');
}

// Upload file
async function uploadFile() {
    if (!window.selectedFile) {
        alert('Please select a file first.');
        return;
    }

    const select = document.getElementById('deviceSelect');
    const deviceId = select.value;

    if (!deviceId || !userApiKey) {
        alert('Please select a session and ensure your API key is set in Profile.');
        return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('file', window.selectedFile);
    formData.append('deviceId', deviceId);

    // Show progress bar
    const progressSection = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    progressSection.classList.remove('hidden');
    document.getElementById('uploadBtn').disabled = true;

    try {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                progressFill.style.width = percentComplete + '%';
                progressText.textContent = percentComplete + '%';
            }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
            console.log('Upload complete. Status:', xhr.status);
            console.log('Response:', xhr.responseText);

            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    showSuccess(response.file.url);
                    loadFiles(); // Refresh file list
                } catch (e) {
                    console.error('Error parsing success response:', e);
                    alert('Upload completed but response was invalid: ' + xhr.responseText);
                    resetUpload();
                }
            } else {
                try {
                    const error = JSON.parse(xhr.responseText);
                    alert('Upload failed: ' + (error.error || 'Unknown error'));
                } catch (e) {
                    alert('Upload failed with status ' + xhr.status + ': ' + xhr.responseText);
                }
                resetUpload();
            }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
            console.error('XHR error event triggered');
            alert('Upload failed. Please try again.');
            resetUpload();
        });

        // Send request
        xhr.open('POST', '/api/files/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${userApiKey}`);
        xhr.send(formData);

    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed: ' + error.message);
        resetUpload();
    }
}

// Show success message
function showSuccess(url) {
    document.getElementById('fileUrl').value = url;
    document.getElementById('uploadSuccess').classList.remove('hidden');
    document.getElementById('uploadBtn').classList.add('hidden');
    document.getElementById('uploadProgress').classList.add('hidden');
    document.getElementById('fileInfo').classList.add('hidden');
}

// Reset upload state
function resetUpload() {
    document.getElementById('uploadBtn').disabled = false;
    document.getElementById('uploadProgress').classList.add('hidden');
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
}

// Copy URL to clipboard
function copyUrl() {
    const urlInput = document.getElementById('fileUrl');
    urlInput.select();
    urlInput.setSelectionRange(0, 99999); // For mobile devices

    try {
        document.execCommand('copy');

        // Visual feedback
        const btn = event.target.closest('.btn-copy');
        const originalText = btn.innerHTML;
        btn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Copied!
        `;
        btn.style.background = 'rgba(52, 199, 89, 0.3)';
        btn.style.borderColor = '#34c759';
        btn.style.color = '#34c759';

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    } catch (err) {
        alert('Failed to copy URL. Please copy manually.');
    }
}

// Load uploaded files
async function loadFiles() {
    const select = document.getElementById('deviceSelect');
    const deviceId = select.value;

    if (!deviceId || !userApiKey) return;

    const filesList = document.getElementById('filesList');
    filesList.innerHTML = '<div class="files-loading">Loading files...</div>';

    try {
        const response = await fetch(`/api/files/list?deviceId=${deviceId}`, {
            headers: {
                'Authorization': `Bearer ${userApiKey}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load files');
        }

        const data = await response.json();

        if (data.files.length === 0) {
            filesList.innerHTML = '<div class="files-loading">No files uploaded yet.</div>';
            return;
        }

        filesList.innerHTML = data.files.map(file => `
            <div class="file-item">
                <div class="file-item-info">
                    <div class="file-item-name">${file.filename}</div>
                    <div class="file-item-meta">
                        ${formatFileSize(file.size)} • ${formatDate(file.uploadedAt)}
                    </div>
                </div>
                <div class="file-item-actions">
                    <button class="btn-file-action btn-view" onclick="window.open('${file.url}', '_blank')">View</button>
                    <button class="btn-file-action btn-delete" onclick="deleteFile('${file.filename}')">Delete</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading files:', error);
        filesList.innerHTML = '<div class="files-loading">Failed to load files.</div>';
    }
}

// Delete file
async function deleteFile(filename) {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
        return;
    }

    const select = document.getElementById('deviceSelect');
    const deviceId = select.value;

    if (!userApiKey) {
        alert('API key not set. Go to Profile to generate one.');
        return;
    }

    try {
        const response = await fetch(`/api/files/${filename}?deviceId=${deviceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userApiKey}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete file');
        }

        alert('File deleted successfully');
        loadFiles(); // Refresh list

    } catch (error) {
        console.error('Error deleting file:', error);
        alert('Failed to delete file: ' + error.message);
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
}

// Profile functions
function openProfile() {
    document.getElementById('profileModal').style.display = 'flex';

    // Load current profile data from wa_api_user
    const userStr = localStorage.getItem('wa_api_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        document.getElementById('p_username').value = user.username || '';
        document.getElementById('p_name').value = user.name || '';
        document.getElementById('p_email').value = user.email || '';
    }
}

function closeProfile() {
    document.getElementById('profileModal').style.display = 'none';
}

async function updateProfile(event) {
    event.preventDefault();

    const token = localStorage.getItem('wa_api_token');
    const profileData = {
        username: document.getElementById('p_username').value,
        name: document.getElementById('p_name').value,
        email: document.getElementById('p_email').value
    };

    const password = document.getElementById('p_password').value;
    if (password) {
        profileData.password = password;
    }

    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        });

        const data = await response.json();

        if (data.success) {
            // Update user object in localStorage
            const userObj = {
                username: profileData.username,
                name: profileData.name || '',
                email: profileData.email || '',
                role: JSON.parse(localStorage.getItem('wa_api_user')).role
            };
            localStorage.setItem('wa_api_user', JSON.stringify(userObj));

            document.getElementById('usernameDisplay').textContent = profileData.username;
            document.getElementById('profileMsg').textContent = 'Profile updated successfully!';
            document.getElementById('profileMsg').style.color = '#34c759';

            setTimeout(() => {
                closeProfile();
                document.getElementById('profileMsg').textContent = '';
            }, 2000);
        } else {
            throw new Error(data.error || 'Failed to update profile');
        }
    } catch (error) {
        document.getElementById('profileMsg').textContent = 'Error: ' + error.message;
        document.getElementById('profileMsg').style.color = '#ff3b30';
    }
}

// Logout
function logout() {
    localStorage.removeItem('wa_api_token');
    localStorage.removeItem('wa_api_user');
    window.location.href = '/login';
}
