import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { db } from './db';
import { loginSchema, createThreadSchema, sendMessageSchema } from '@legorachat/shared';

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

// Initialize tRPC
const t = initTRPC.context<{ userId?: string }>().create();

// Protected procedure helper
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new Error('Not authenticated');
  return next({ ctx: { userId: ctx.userId } });
});

// tRPC Router
const appRouter = t.router({
  login: t.procedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      const user = await db.getUserByUsername(input.username);
      
      if (user && user.password === input.password) {
        return { success: true, user: { id: user.id, username: user.username, password: user.password, createdAt: user.createdAt } };
      }
      
      if (!user) {
        // Create new user
        const newUser = await db.createUser(input.username, input.password);
        return { success: true, user: { id: newUser.id, username: newUser.username, password: newUser.password, createdAt: newUser.createdAt } };
      }
      
      return { success: false, error: 'Invalid password' };
    }),

  getThreads: protectedProcedure
    .query(async ({ ctx }) => {
      return await db.getThreadsForUser(ctx.userId);
    }),

  createThread: protectedProcedure
    .input(createThreadSchema)
    .mutation(async ({ input, ctx }) => {
      return await db.createThreadWithParticipants(ctx.userId, input.participantUsernames);
    }),

  getMessages: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ input }) => {
      return await db.getMessagesForThread(input.threadId);
    }),

  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ input, ctx }) => {
      const message = await db.addMessage(input.threadId, ctx.userId, input.content);
      return message;
    }),
});

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
export type AppRouter = typeof appRouter;
