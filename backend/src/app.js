const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');
const logger = require('./utils/logger');

const app = express();

// ── Security ───────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Rate limiting ──────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Stricter for login attempts
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

app.use(limiter);
app.use('/api/auth/login', authLimiter);

// ── Parsing ────────────────────────────────────────────────────────────────────
// 5mb limit to accommodate large CSV row payloads
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── Logging ────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
    })
  );
}

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
// Vercel auto-routes /api/* to api/index.js, so strip /api prefix before routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    req.url = req.path.substring(4); // Remove /api prefix
  }
  next();
});
app.use('/', routes);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
