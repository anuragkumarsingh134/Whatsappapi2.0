const token = localStorage.getItem('wa_api_token');
const user = JSON.parse(localStorage.getItem('wa_api_user') || '{}');

// Redirect if not admin
if (!token || user.role !== 'admin') {
    window.location.href = '/login';
}

let allDevices = [];
let deviceToDelete = null;

// DOM Elements
const devicesList = document.getElementById('devicesList');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const refreshBtn = document.getElementById('refreshBtn');
const deleteModal = document.getElementById('deleteModal');
const deleteDeviceIdSpan = document.getElementById('deleteDeviceId');
const cancelDeleteBtn = document.getElementById('cancelDelete');
const confirmDeleteBtn = document.getElementById('confirmDelete');

// Load devices
async function loadDevices() {
    try {
        devicesList.innerHTML = '<div class="no-devices">Loading...</div>';

        const timestamp = new Date().getTime();
        const res = await fetch(`/api/admin/devices?_=${timestamp}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to load devices');
        }

        allDevices = data.devices;
        updateStats();
        renderDevices();

    } catch (err) {
        console.error('Error loading devices:', err);
        devicesList.innerHTML = '<div class="no-devices" style="color:var(--danger)">Error loading devices</div>';
    }
}

// Update stats
function updateStats() {
    const total = allDevices.length;
    const connected = allDevices.filter(d => d.connection_state === 'connected').length;
    const disconnected = total - connected;

    document.getElementById('totalDevices').textContent = total;
    document.getElementById('connectedCount').textContent = connected;
    document.getElementById('disconnectedCount').textContent = disconnected;
}

// Render devices based on filters
function renderDevices() {
    const search = searchInput.value.toLowerCase();
    const status = statusFilter.value;

    let filtered = allDevices.filter(device => {
        // Status filter
        if (status !== 'all' && device.connection_state !== status) {
            return false;
        }

        // Search filter
        if (search) {
            const searchStr = `${device.device_id} ${device.phone_number || ''} ${device.username || ''}`.toLowerCase();
            if (!searchStr.includes(search)) {
                return false;
            }
        }

        return true;
    });

    if (filtered.length === 0) {
        devicesList.innerHTML = '<div class="no-devices">No devices found matching your criteria</div>';
        return;
    }

    devicesList.innerHTML = filtered.map(device => `
        <div class="device-card">
            <div class="device-info">
                <div class="device-id">${device.device_id}</div>
                <div class="device-meta">
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        ${device.username || 'Unknown'}
                    </span>
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/>
                        </svg>
                        ${device.phone_number || 'N/A'}
                    </span>
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        ${new Date(device.created_at).toLocaleDateString()}
                    </span>
                </div>
            </div>
            <div class="device-actions">
                <span class="status-badge status-${device.connection_state}">${device.connection_state}</span>
                <button class="btn-delete" onclick="showDeleteModal('${device.device_id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Show delete modal
function showDeleteModal(deviceId) {
    deviceToDelete = deviceId;
    deleteDeviceIdSpan.textContent = deviceId;
    deleteModal.classList.add('show');
}

// Hide delete modal
function hideDeleteModal() {
    deviceToDelete = null;
    deleteModal.classList.remove('show');
}

// Delete device
async function deleteDevice() {
    if (!deviceToDelete) return;

    try {
        confirmDeleteBtn.textContent = 'Deleting...';
        confirmDeleteBtn.disabled = true;

        const res = await fetch(`/api/admin/devices/${encodeURIComponent(deviceToDelete)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to delete device');
        }

        hideDeleteModal();
        loadDevices(); // Refresh list

    } catch (err) {
        console.error('Error deleting device:', err);
        alert('Failed to delete device: ' + err.message);
    } finally {
        confirmDeleteBtn.textContent = 'Delete Device';
        confirmDeleteBtn.disabled = false;
    }
}

// Event listeners
searchInput.addEventListener('input', renderDevices);
statusFilter.addEventListener('change', renderDevices);
refreshBtn.addEventListener('click', loadDevices);
cancelDeleteBtn.addEventListener('click', hideDeleteModal);
confirmDeleteBtn.addEventListener('click', deleteDevice);

// Close modal on outside click
deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
        hideDeleteModal();
    }
});

// Initial load
loadDevices();
