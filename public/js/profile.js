const token = localStorage.getItem('wa_api_token');
const user = JSON.parse(localStorage.getItem('wa_api_user') || '{}');
if (!token) window.location.href = '/login';

// Populate fields
document.getElementById('p_username').value = user.username || '';
document.getElementById('p_name').value = user.name || '';
document.getElementById('p_email').value = user.email || '';

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
            msg.style.color = 'var(--accent)';
            msg.textContent = 'Profile updated successfully!';
            localStorage.setItem('wa_api_user', JSON.stringify({ ...data.user }));
            setTimeout(() => window.history.back(), 1500);
        } else {
            msg.style.color = 'var(--danger)';
            msg.textContent = data.error;
        }
    } catch (err) {
        msg.style.color = 'var(--danger)';
        msg.textContent = 'Error updating profile';
    } finally {
        btn.disabled = false;
        btn.innerText = 'Save Changes';
    }
}
