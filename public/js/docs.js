const token = localStorage.getItem('wa_api_token');
if (!token) window.location.href = '/login';

const deviceId = window.location.pathname.split('/')[2];
const baseUrl = window.location.origin;

async function loadDocs() {
    try {
        const res = await fetch(`/api/sessions/${deviceId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.success) {
            alert('Session not found');
            window.location.href = '/';
            return;
        }

        // Fetch user-level API key
        let apiKey = null;
        try {
            const keyRes = await fetch('/api/auth/api-key', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const keyData = await keyRes.json();
            if (keyData.success && keyData.apiKey) {
                apiKey = keyData.apiKey;
            }
        } catch (e) {
            console.error('Error loading user API key:', e);
        }

        document.getElementById('deviceDisplayName').textContent = deviceId;
        document.getElementById('authKeyLabel').textContent = apiKey || 'NOT_SET (go to Profile)';
        document.getElementById('backLink').href = `/session/${deviceId}`;

        if (apiKey) {
            // Text POST
            document.getElementById('curlTextExample').textContent = `curl -X POST ${baseUrl}/api/messages/send \\\\
  -H "Authorization: Bearer ${apiKey}" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"deviceId": "${deviceId}", "number": "1234567890", "message": "Hello World"}'`;

            // Text GET
            document.getElementById('getUrlTextExample').textContent = `${baseUrl}/api/messages/send?deviceId=${deviceId}&number=1234567890&message=Hello+World&apiKey=${apiKey}`;

            // File POST
            document.getElementById('curlFileExample').textContent = `curl -X POST ${baseUrl}/api/messages/send-file \\\\
  -H "Authorization: Bearer ${apiKey}" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"deviceId": "${deviceId}", "number": "1234567890", "url": "https://pdfobject.com/pdf/sample.pdf", "fileName": "sample.pdf"}'`;

            // JS Example
            document.getElementById('jsFileExample').textContent = `await fetch('${baseUrl}/api/messages/send-file', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    deviceId: '${deviceId}',
    number: '1234567890',
    url: 'https://pdfobject.com/pdf/sample.pdf',
    fileName: 'sample.pdf'
  })
});`;

            // File GET
            document.getElementById('getUrlFileExample').textContent = `${baseUrl}/api/messages/send-file?deviceId=${deviceId}&number=1234567890&url=https://pdfobject.com/pdf/sample.pdf&fileName=sample.pdf&apiKey=${apiKey}`;
        } else {
            const fallback = "// Please set an API Key in your Profile to see live examples";
            ['curlTextExample', 'getUrlTextExample', 'curlFileExample', 'jsFileExample', 'getUrlFileExample'].forEach(id => {
                document.getElementById(id).textContent = fallback;
            });
        }

    } catch (error) {
        console.error('Error loading docs:', error);
    }
}

// Active link handling on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (pageYOffset >= sectionTop - 60) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Copy to clipboard function (make it globally available)
window.copyToClipboard = function (elementId) {
    console.log('Copy button clicked for:', elementId);

    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Element not found:', elementId);
        alert('Code element not found!');
        return;
    }

    const text = element.textContent;
    console.log('Copying text length:', text.length);

    // Fallback for older browsers or HTTPS requirement
    if (!navigator.clipboard) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showCopySuccess(element);
        } catch (err) {
            console.error('Fallback copy failed:', err);
            alert('Failed to copy to clipboard');
        }
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        console.log('Copy successful!');
        showCopySuccess(element);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy: ' + err.message);
    });
}

function showCopySuccess(element) {
    const codeBlock = element.closest('.code-block');
    const button = codeBlock ? codeBlock.querySelector('.copy-btn') : null;

    if (!button) {
        console.error('Copy button not found');
        return;
    }

    const originalHTML = button.innerHTML;

    button.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied!
    `;
    button.style.background = 'rgba(16, 185, 129, 0.2)';

    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.background = 'rgba(16, 185, 129, 0.1)';
    }, 2000);
}

loadDocs();
console.log('Docs.js loaded, copyToClipboard function available:', typeof window.copyToClipboard);
