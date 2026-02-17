import express from 'express';
import 'dotenv/config';
import userRouter from './routes/auth.route.js';
import cors from 'cors';
import cookieParser from "cookie-parser";


const app = express();
const FRONTEND_ORIGIN = process.env.FRONTEND_URL ?? 'http://localhost:3000';

app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
app.use('/api/auth', userRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Auth Service API', status: 'UP' });
});

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Auth service running on port ${PORT}`);
    console.log(`🔗 Accepting requests from: ${FRONTEND_ORIGIN}`);
  });
}

export default app;