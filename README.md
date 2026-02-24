# Cloud WhatsApp API

Multi-session WhatsApp API service with modern UI. Manage multiple WhatsApp connections via REST API.

[![Version](https://img.shields.io/badge/version-1.8.0-blue)](https://github.com/anuragkumarsingh134/whatsapp-multi-session-api)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-ISC-green)](LICENSE)

## ✨ Features

- 🔐 User authentication with admin panel
- 📱 Multiple WhatsApp sessions per user
- 🔑 Per-session API key authentication
- 📨 Send text, images, and documents
- 🎨 Modern responsive dark UI
- 📖 Built-in API documentation
- 🔄 Auto-reconnect & session persistence
- 📊 Real-time connection status

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/anuragkumarsingh134/whatsapp-multi-session-api.git
cd whatsapp-multi-session-api

# Install dependencies
npm install

# Start server
npm start
```

Open `http://localhost:3000` and create your account. **First user automatically becomes admin!**

## 📖 Basic Usage

### 1. Create Session
- Click "Create New Session"
- Enter unique device ID
- Scan QR code with WhatsApp

### 2. Send Message

```bash
curl -X POST http://localhost:3000/api/sessions/{deviceId}/send-message \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"number": "1234567890", "message": "Hello!"}'
```

### 3. Send Image

```bash
curl -X POST http://localhost:3000/api/sessions/{deviceId}/send-image \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "number=1234567890" \
  -F "caption=Check this out" \
  -F "image=@photo.jpg"
```

Full API docs at `/session/{deviceId}/docs` after login.

---

## 🌐 Production Deployment

### Option 1: Render.com (Easiest)

**Best for:** Quick cloud deployment | **Cost:** $7/month

<details>
<summary>Click to expand Render.com deployment</summary>

#### Setup (15 minutes)

1. **Create Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Deploy**
   - New → Web Service
   - Connect your repo
   - Configure:
     - **Build:** `npm install`
     - **Start:** `npm start`
     - **Instance:** Starter ($7/mo)

3. **Environment Variables**
   ```
   PORT=3000
   NODE_ENV=production
   DB_PATH=/data/whatsapp.db
   JWT_SECRET=[32+ random characters]
   SESSION_SECRET=[32+ random characters]
   CORS_ORIGIN=https://your-app.onrender.com
   ```

4. **Add Disk** (Critical!)
   - Name: `data`
   - Mount: `/data`
   - Size: 1 GB

5. **Deploy** → Your app is live at `https://your-app.onrender.com` 🎉

**Auto-deploys on every git push!**

</details>

### Option 2: Proxmox + Cloudflare (Free)

**Best for:** Self-hosting | **Cost:** $0/month

<details>
<summary>Click to expand Proxmox deployment</summary>

#### Prerequisites
- Proxmox with Ubuntu container
- Domain with Cloudflare account

#### Deployment (20 minutes)

**1. Prepare Container**
```bash
pct enter <container-id>
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git
npm install -g pm2
```

**2. Deploy App**
```bash
cd /opt
git clone https://github.com/anuragkumarsingh134/whatsapp-multi-session-api.git whatsapp-api
cd whatsapp-api
npm install --production

# Create .env (see .env.example)
nano .env

mkdir -p data logs backups
pm2 start src/server.js --name whatsapp-api
pm2 save && pm2 startup
```

**3. Cloudflare Tunnel**
```bash
# Install
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared-linux-amd64.deb

# Setup
cloudflared tunnel login
cloudflared tunnel create whatsapp-api

# Configure (~/.cloudflared/config.yml)
tunnel: YOUR-TUNNEL-ID
credentials-file: /root/.cloudflared/YOUR-TUNNEL-ID.json
ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404

# Start
cloudflared tunnel route dns whatsapp-api api.yourdomain.com
cloudflared service install
systemctl enable --now cloudflared
```

**4. Secure**
```bash
apt install -y ufw fail2ban
ufw allow 22/tcp
ufw allow from 127.0.0.1 to any port 3000
ufw enable
```

✅ **Done!** Visit `https://api.yourdomain.com`

**Maintenance:**
```bash
# Update app
cd /opt/whatsapp-api
git pull && npm install --production
pm2 restart whatsapp-api

# Logs
pm2 logs whatsapp-api
journalctl -u cloudflared -f
```

</details>

### Option 3: VPS or Docker

**Best for:** Traditional hosting | **Cost:** $5-20/month

<details>
<summary>Click to expand VPS/Docker deployment</summary>

#### VPS with PM2

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git build-essential

# Clone & setup
git clone https://github.com/anuragkumarsingh134/whatsapp-multi-session-api.git
cd whatsapp-multi-session-api
npm install --production

# Create .env
nano .env  # Add your configuration

# Start with PM2
npm install -g pm2
pm2 start src/server.js --name whatsapp-api
pm2 save && pm2 startup
```

#### Docker

```bash
# Clone repo
git clone https://github.com/anuragkumarsingh134/whatsapp-multi-session-api.git
cd whatsapp-multi-session-api

# Start container
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Update

```bash
# PM2
git pull && npm install --production
pm2 restart whatsapp-api

# Docker  
git pull
docker-compose up -d --build
```

</details>

---

## ⚙️ Configuration

See `.env.example` for all options. Generate secure secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 👥 User Roles

- **Admin** - First signup, manages all users/sessions
- **Client** - Regular users, manage own sessions

## 🛠️ Tech Stack

- Node.js + Express
- SQLite (better-sqlite3)
- Baileys (WhatsApp library)
- JWT authentication
- PM2 (production)

## 📄 License

ISC License - see [LICENSE](LICENSE)

## 🆘 Support

- [Issues](https://github.com/anuragkumarsingh134/whatsapp-multi-session-api/issues)
- [Discussions](https://github.com/anuragkumarsingh134/whatsapp-multi-session-api/discussions)

---

**Made with ❤️ by [Anurag Kumar Singh](https://github.com/anuragkumarsingh134)**