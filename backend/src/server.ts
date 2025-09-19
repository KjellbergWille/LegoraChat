import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { WebSocketServer } from 'ws';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
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

// Create WebSocket server
const server = app.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);
  
  // Initialize database
  await db.init();
  console.log('Database initialized');
});

const wss = new WebSocketServer({ server });

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
      const thread = await db.createThreadWithParticipants(ctx.userId, input.participantUsernames);
      // Emit to all participants
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'threadCreated',
            data: thread
          }));
        }
      });
      return thread;
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
      
      // Emit to all participants of the thread
      const participants = await db.getThreadParticipants(input.threadId);
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'newMessage',
            data: message,
            threadId: input.threadId
          }));
        }
      });
      
      return message;
    }),

  // Real-time subscriptions
  onNewMessage: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .subscription(async function* ({ input }) {
      // Yield current messages first
      const messages = await db.getMessagesForThread(input.threadId);
      yield messages;
      
      // Then listen for new messages via WebSocket
      // This is a simplified implementation - in production use Redis pub/sub
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
        const newMessages = await db.getMessagesForThread(input.threadId);
        if (newMessages.length > messages.length) {
          yield newMessages;
        }
      }
    }),

  onThreadsUpdate: protectedProcedure
    .subscription(async function* ({ ctx }) {
      // Yield current threads first
      const threads = await db.getThreadsForUser(ctx.userId);
      yield threads;
      
      // Then listen for thread updates
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
        const newThreads = await db.getThreadsForUser(ctx.userId);
        if (JSON.stringify(newThreads) !== JSON.stringify(threads)) {
          yield newThreads;
        }
      }
    }),
});

// tRPC middleware
app.use('/trpc', authMiddleware, createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }) => ({
    userId: req.userId,
  }),
}));

// Apply WebSocket handler
applyWSSHandler({
  wss,
  router: appRouter,
  createContext: ({ req }) => {
    const userId = req.headers['x-user-id'];
    return {
      userId: Array.isArray(userId) ? userId[0] : userId,
    };
  },
});

export { appRouter };
export type AppRouter = typeof appRouter;
