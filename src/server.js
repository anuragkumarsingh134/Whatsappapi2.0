require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sessionRoutes = require('./routes/sessions');
const messageRoutes = require('./routes/messages');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const { initializeSessions } = require('./services/sessionManager');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/files', express.static(path.join(__dirname, '../uploads')));

// Serve static files (Dashboard)
app.use(express.static('public'));

const adminRoutes = require('./routes/admin');
const userQuotaRoutes = require('./routes/userQuota');
const userAuth = require('./middleware/userAuth');
const adminAuth = require('./middleware/adminAuth');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/user', userQuotaRoutes);
app.use('/api/admin', userAuth, adminAuth, adminRoutes);

// Auth pages
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/signup.html'));
});

// Admin Dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Session detail page route
app.get('/session/:deviceId', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/session.html'));
});

// API Documentation page route
app.get('/session/:deviceId/docs', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/docs.html'));
});

// Profile page route
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/profile.html'));
});

// Admin User Sessions page route
app.get('/admin/sessions', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin-sessions.html'));
});

// Admin All Devices page route
app.get('/admin-devices', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin-devices.html'));
});

// File Upload page route
app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/upload.html'));
});

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);

    // Initialize sessions from database
    console.log('Initializing sessions from database...');
    await initializeSessions();
    console.log('Session initialization complete');
});
