
let currentEditUserId = null;

async function openQuotaModal(userId) {
    currentEditUserId = userId;
    const modal = document.getElementById('quotaModal');

    // Fetch user quota details
    console.log('[Quota Modal] Fetching quotas for user:', userId);
    const res = await api.get(`/users/${userId}/quotas`);
    console.log('[Quota Modal] Response:', res);
    if (!res.success) {
        console.error('[Quota Modal] Error:', res.error);
        alert('Failed to load user quotas: ' + (res.error || 'Unknown error'));
        return;
    }

    const user = res.user;

    // Display user info
    document.getElementById('quotaUserInfo').innerHTML = `
        <div style="margin-bottom: 20px; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
            <strong>${user.username}</strong> ${user.name ? `(${user.name})` : ''}
            <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
                Current Usage: ${user.usage.devices_used} devices, 
                ${user.usage.messages_today} msgs today, 
                ${user.usage.storage_used_mb} MB storage
            </div>
        </div>
    `;

    // Populate form
    document.getElementById('quota_device_limit').value = user.quotas.device_limit;
    document.getElementById('quota_message_daily').value = user.quotas.message_quota_daily;
    document.getElementById('quota_message_monthly').value = user.quotas.message_quota_monthly;
    document.getElementById('quota_storage_limit').value = user.quotas.storage_limit_mb;
    document.getElementById('quota_expiry').value = user.quotas.account_expiry || '';
    document.getElementById('quota_unlimited').checked = user.quotas.is_quota_unlimited === 1;

    modal.style.display = 'flex';
}

function closeQuotaModal() {
    document.getElementById('quotaModal').style.display = 'none';
    currentEditUserId = null;
}

async function saveQuotas() {
    if (!currentEditUserId) return;

    const quotas = {
        device_limit: parseInt(document.getElementById('quota_device_limit').value),
        message_quota_daily: parseInt(document.getElementById('quota_message_daily').value),
        message_quota_monthly: parseInt(document.getElementById('quota_message_monthly').value),
        storage_limit_mb: parseInt(document.getElementById('quota_storage_limit').value),
        account_expiry: document.getElementById('quota_expiry').value || null,
        is_quota_unlimited: document.getElementById('quota_unlimited').checked ? 1 : 0
    };

    const res = await api.put(`/users/${currentEditUserId}/quotas`, quotas);

    if (res.success) {
        alert('Quotas updated successfully!');
        closeQuotaModal();
        refreshData();
    } else {
        alert('Failed to update quotas: ' + res.error);
    }
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('quotaModal');
    if (event.target === modal) {
        closeQuotaModal();
    }
}
