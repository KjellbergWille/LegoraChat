import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router';
import { db } from './db';

// Extend Express Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple auth middleware (in production, use proper JWT)
const authMiddleware = (req: any, _res: any, next: any) => {
  const userId = req.headers['x-user-id'];
  req.userId = userId;
  next();
};

// tRPC middleware
app.use('/trpc', authMiddleware, createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }) => ({
    userId: req.userId,
  }),
}));

// Start server
app.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);
  
  // Initialize database
  await db.init();
  console.log('Database initialized');
});

export { appRouter };
