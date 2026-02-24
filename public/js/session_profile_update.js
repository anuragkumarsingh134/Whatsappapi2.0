function openConnectionStatusModal() {
    const modal = document.getElementById('qrModal');
    const container = document.getElementById('qrContainer');
    const instructions = modal.querySelector('.qr-instructions');
    const title = modal.querySelector('.modal-title');

    // Update modal content for connected status
    title.textContent = 'Connection Status';
    instructions.textContent = 'Your WhatsApp session is active and connected.';

    // Show loading state
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 20px;">
            <div class="qr-placeholder">Loading profile...</div>
        </div>
    `;

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
                    // Use real WhatsApp profile picture
                    container.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                        <img src="${data.profilePicUrl}" alt="Profile" 
                             style="width: 160px; height: 160px; border-radius: 50%; border: 4px solid #10b981; object-fit: cover;"
                             onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${currentSession.phoneNumber}&background=10b981&color=fff&size=200&bold=true';">
                        <div style="text-align: center;">
                            <div style="color: #10b981; font-weight: 700; font-size: 1.1rem; margin-bottom: 4px;">✓ Connected</div>
                            <div style="color: #64748b; font-size: 0.9rem;">+${currentSession.phoneNumber}</div>
                        </div>
                    </div>
                `;
                } else {
                    // Fallback to avatar if no profile picture
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
                console.error('Error fetching profile picture:', err);
                // Fallback to success icon on error
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
            });
    } else {
        // No phone number available
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
}
