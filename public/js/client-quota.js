
// Load and display user quota
async function loadQuota() {
    try {
        const res = await fetch('/api/user/my-quota', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            const { quotas, usage } = data;

            // Update devices
            const devicesPercent = (usage.devices_used / quotas.device_limit) * 100;
            document.getElementById('devicesBar').style.width = `${Math.min(devicesPercent, 100)}%`;
            document.getElementById('devicesText').textContent = `${usage.devices_used}/${quotas.device_limit}`;

            // Update messages
            const messagesPercent = (usage.messages_today / quotas.message_quota_daily) * 100;
            document.getElementById('messagesBar').style.width = `${Math.min(messagesPercent, 100)}%`;
            document.getElementById('messagesText').textContent = `${usage.messages_today}/${quotas.message_quota_daily}`;

            // Update storage
            const storagePercent = (usage.storage_used_mb / quotas.storage_limit_mb) * 100;
            document.getElementById('storageBar').style.width = `${Math.min(storagePercent, 100)}%`;
            document.getElementById('storageText').textContent = `${usage.storage_used_mb}/${quotas.storage_limit_mb} MB`;

            // Color bars based on usage
            updateBarColor('devicesBar', devicesPercent);
            updateBarColor('messagesBar', messagesPercent);
            updateBarColor('storageBar', storagePercent);

            // Update expiry
            const expiryEl = document.getElementById('quotaExpiry');
            if (quotas.account_expiry) {
                const expiryDate = new Date(quotas.account_expiry);
                const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

                if (daysLeft <= 0) {
                    expiryEl.innerHTML = `<span style="color: #ef4444;">⚠️ Expired</span>`;
                } else if (daysLeft <= 3) {
                    expiryEl.innerHTML = `<span style="color: #f59e0b;">⏰ ${daysLeft} day${daysLeft > 1 ? 's' : ''} left</span>`;
                } else {
                    expiryEl.innerHTML = `<span style="color: #10b981;">✓ Expires: ${expiryDate.toLocaleDateString()}</span>`;
                }
            } else {
                expiryEl.innerHTML = `<span style="color: #6b7280;">♾️ No Expiry</span>`;
            }

            if (quotas.is_quota_unlimited === 1) {
                expiryEl.innerHTML = `<span style="color: #3b82f6;">⭐ Unlimited Access</span>`;
            }
        }
    } catch (error) {
        console.error('Error loading quota:', error);
    }
}

function updateBarColor(barId, percent) {
    const bar = document.getElementById(barId);
    if (percent >= 90) {
        bar.style.background = '#ef4444'; // Red
    } else if (percent >= 75) {
        bar.style.background = '#f59e0b'; // Orange
    } else {
        bar.style.background = '#10b981'; // Green
    }
}
