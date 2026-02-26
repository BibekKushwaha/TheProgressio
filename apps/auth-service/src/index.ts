import express from 'express';
import 'dotenv/config';
import { rateLimit } from 'express-rate-limit';
import userRouter from './routes/auth.route.js';
import cors from 'cors';
import cookieParser from "cookie-parser";


import { closeEmailWorker } from "./services/email.worker.js";
import { closeEmailQueue } from "./services/email.queue.js";

const app = express();
const FRONTEND_ORIGIN = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: isProduction ? FRONTEND_ORIGIN : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-family-share-token'],
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Global rate limit: cap all auth-service routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

// Strict limiter on authentication endpoints only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later' },
  skipSuccessfulRequests: true,
});

app.use(globalLimiter);
// Apply strict auth limiter only to endpoints that are authentication attempts
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot', authLimiter);
app.use('/api/auth/reset', authLimiter);
app.use('/api/auth/mobile/login', authLimiter);
app.use('/api/auth', userRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Auth Service API', status: 'UP' });
});

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Auth service running on port ${PORT}`);
    console.log(`🔗 Accepting requests from: ${FRONTEND_ORIGIN}`);
    console.log(`📧 Email worker initialized (BullMQ)`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down Auth Service...");
    await Promise.all([
      closeEmailWorker(),
      closeEmailQueue()
    ]);
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

export default app;
