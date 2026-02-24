# Changelog

## Version 1.0.0 (2026-01-09)

### 🎉 Initial Release

**WhatsApp Multi-Session API** - A comprehensive Node.js solution for managing multiple WhatsApp Web connections through a REST API.

### ✨ Features

#### Multi-Session Management
- ✅ Create and manage unlimited WhatsApp sessions
- ✅ Each session with unique Device ID
- ✅ Independent connection states per session
- ✅ Automatic reconnection handling
- ✅ Session persistence across server restarts

#### Authentication & Security
- ✅ Bearer token authentication for API requests
- ✅ Per-session API key management
- ✅ Auto-generated secure API keys (64-character hex)
- ✅ Custom API key support
- ✅ API key masking in responses
- ✅ Database-backed credential validation

#### WhatsApp Integration
- ✅ QR code authentication via Baileys
- ✅ Real-time QR code generation
- ✅ Session state tracking (disconnected/waiting_qr/connected)
- ✅ Phone number extraction after connection
- ✅ Persistent auth state in SQLite

#### REST API
- ✅ Session CRUD operations
- ✅ QR code retrieval endpoint
- ✅ Message sending with Bearer auth
- ✅ API key management endpoints
- ✅ Consistent JSON response format
- ✅ Comprehensive error handling

#### Web Dashboard
- ✅ Session listing with real-time status
- ✅ Session creation modal
- ✅ Session detail pages
- ✅ Live QR code display with auto-refresh
- ✅ API key management UI
- ✅ Test message interface
- ✅ Responsive design

#### Database
- ✅ SQLite for persistent storage
- ✅ Sessions table with connection states
- ✅ Auth state table for WhatsApp credentials
- ✅ Foreign key constraints
- ✅ Automatic schema creation
- ✅ Database helper functions

#### Developer Experience
- ✅ Comprehensive README with examples
- ✅ API documentation with cURL, Node.js, Python examples
- ✅ Clear project structure
- ✅ Error messages with context
- ✅ Console logging for debugging

### 📦 Dependencies
- `express` - Web server framework
- `@whiskeysockets/baileys` - WhatsApp Web API
- `better-sqlite3` - SQLite database
- `qrcode` - QR code generation
- `pino` - Logging
- `cors` - CORS support

### 🔧 Technical Stack
- **Backend**: Node.js + Express
- **Database**: SQLite
- **WhatsApp**: Baileys (WebSocket-based)
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Authentication**: Bearer tokens

### 📝 API Endpoints
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:deviceId` - Get session details
- `GET /api/sessions/:deviceId/qr` - Get QR code
- `PUT /api/sessions/:deviceId/api-key` - Set/update API key
- `DELETE /api/sessions/:deviceId` - Delete session
- `POST /api/messages/send` - Send message (Bearer auth required)

### 🎯 Use Cases
- Multi-tenant WhatsApp messaging platforms
- Customer support automation
- Marketing message broadcasting
- WhatsApp chatbot backends
- Integration testing environments
- Development/staging environments

### 🔒 Security Features
- API key-based authentication
- Session isolation
- Secure credential storage
- Input validation
- Error sanitization

### 📚 Documentation
- Complete README with installation guide
- API reference with request/response examples
- Usage examples in multiple languages
- Database schema documentation
- Security best practices
- Troubleshooting guide

---

**Release Date**: January 9, 2026  
**Status**: Stable  
**License**: MIT
