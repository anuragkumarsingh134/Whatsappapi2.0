# WhatsApp API 2.0 — Proxmox Ubuntu Deployment Guide

Deploy on a Proxmox Ubuntu container with Node.js + PM2.

---

## 1. Create Proxmox LXC Container

In the Proxmox web UI:

1. **Create CT** → Template: `ubuntu-22.04` (or 24.04)
2. Resources: **1 CPU, 1GB RAM, 8GB disk** (minimum)
3. Network: Bridge `vmbr0`, DHCP or static IP
4. Start the container

---

## 2. Initial Server Setup

```bash
# Login to container
apt update && apt upgrade -y

# Install essentials
apt install -y curl git build-essential
```

---

## 3. Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify
node -v   # v20.x.x
npm -v    # 10.x.x
```

---

## 4. Install PM2

```bash
npm install -g pm2
```

---

## 5. Clone & Setup the App

```bash
# Create app directory
mkdir -p /opt/whatsapp-api
cd /opt/whatsapp-api

# Clone the repo
git clone https://github.com/anuragkumarsingh134/Whatsappapi2.0.git .

# Install dependencies
npm install
```

---

## 6. Configure Environment

```bash
cp .env.example .env
nano .env
```

Update these values:

```env
PORT=3000
NODE_ENV=production

# Database
DB_PATH=./data/whatsapp.db

# Security — CHANGE THESE to random strings!
JWT_SECRET=your_random_64_char_string_here
SESSION_SECRET=another_random_64_char_string_here

# CORS — set to your domain or * for all
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads
```

> **TIP**: Generate random secrets with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Create data and upload directories:

```bash
mkdir -p data uploads
```

---

## 7. Start with PM2

```bash
# Start the app
pm2 start src/server.js --name whatsapp-api

# Save PM2 process list (survives reboot)
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs (starts with: sudo env PATH=...)
```

### Useful PM2 Commands

```bash
pm2 status              # Check process status
pm2 logs whatsapp-api   # View logs
pm2 restart whatsapp-api # Restart
pm2 stop whatsapp-api    # Stop
pm2 monit               # Live monitoring dashboard
```

---

## 8. Verify

```bash
# Check if running
curl http://localhost:3000/api/auth/login

# Should return: {"success":false,"error":"Username and password are required"}
# This means the server is up!
```

Open in browser: `http://<container-ip>:3000`

---

## 9. (Optional) Reverse Proxy with Nginx + SSL

```bash
apt install -y nginx
```

Create config:

```bash
nano /etc/nginx/sites-available/whatsapp-api
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:

```bash
ln -s /etc/nginx/sites-available/whatsapp-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

### SSL with Let's Encrypt:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

## 10. (Optional) Cloudflare Tunnel (No Port Forwarding)

If you don't want to expose ports:

```bash
# Install cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/cloudflared.list
apt update && apt install -y cloudflared

# Login & create tunnel
cloudflared tunnel login
cloudflared tunnel create whatsapp-api
cloudflared tunnel route dns whatsapp-api your-domain.com
```

Create config `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:3000
  - service: http_status:404
```

Run as service:

```bash
cloudflared service install
systemctl start cloudflared
```

---

## 11. Updates

To update the app later:

```bash
cd /opt/whatsapp-api
git pull origin main
npm install
pm2 restart whatsapp-api
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start | `pm2 start whatsapp-api` |
| Stop | `pm2 stop whatsapp-api` |
| Restart | `pm2 restart whatsapp-api` |
| Logs | `pm2 logs whatsapp-api` |
| Status | `pm2 status` |
| Update | `git pull && npm install && pm2 restart whatsapp-api` |
