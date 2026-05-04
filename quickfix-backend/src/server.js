require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
});

// Store io on app for access in routes
app.set('io', io);

// Socket handlers
require('./socket')(io);

// ─── Security Middleware ────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many auth attempts, please try again in 15 minutes' },
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Logging ────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) }
}));

// ─── Body Parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health Check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'QuickFix API' });
});

// ─── Routes ─────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/public'));
app.use('/api/workers', require('./routes/workers'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/match', require('./routes/match'));
app.use('/api/pricing', require('./routes/match')); // pricing/benchmark is in match router

// ─── Analytics endpoint ─────────────────────────────────────
const { PrismaClient } = require('@prisma/client');
const { optionalAuth } = require('./middleware/auth');
const prisma = new PrismaClient();

app.post('/api/analytics/event', optionalAuth, async (req, res) => {
  try {
    const { event, metadata } = req.body;
    if (!event) return res.status(400).json({ message: 'Event name required' });
    await prisma.analyticsEvent.create({
      data: {
        userId: req.user?.id || null,
        event,
        metadata: metadata || {},
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }
    });
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// ─── Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`${err.message} - ${req.method} ${req.url}`, { stack: err.stack });

  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'Duplicate entry conflict' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found' });
  }
  if (err.message === 'Invalid file type. Only JPEG, PNG, WebP, PDF allowed.') {
    return res.status(400).json({ message: err.message });
  }

  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// ─── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 QuickFix API running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 Client URL: ${process.env.CLIENT_URL}`);
});

module.exports = { app, server, io };
