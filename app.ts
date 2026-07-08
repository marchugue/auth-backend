import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { env } from './app/config/env';
import apiRouter from './app/index';
import { notFoundHandler, errorHandler } from './app/middleware/error.middleware';

const app: Express = express();
const allowedOrigins = [env.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true, // required so the browser sends/receives the refresh-token cookie
  })
);
app.use(morgan(env.isProduction ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'OK' });
});

app.use('/api', apiRouter);

// Must come after all routes.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
