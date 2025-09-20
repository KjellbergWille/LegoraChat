import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { db } from './db';
import { 
  loginSchema, 
  createThreadSchema, 
  sendMessageSchema, 
  AuthenticatedContext, 
  UnauthenticatedContext,
  LoginResponse
} from '@legorachat/shared';

// Global connections map for SSE
const globalConnections = new Map<string, Set<express.Response>>();

// SSE broadcasting functions
function broadcastToUser(userId: string, event: any) {
  const connections = globalConnections.get(userId);
  if (connections) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    connections.forEach(res => {
      try {
        res.write(data);
      } catch (error) {
        // Remove dead connections
        connections.delete(res);
      }
    });
  }
}

async function broadcastToThread(threadId: string, event: any) {
  try {
    const participants = await db.getThreadParticipants(threadId);
    participants.forEach(userId => {
      broadcastToUser(userId, event);
    });
  } catch (error) {
    console.error('Error broadcasting to thread:', error);
  }
}

// Extend Express Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple auth middleware (in production, use proper JWT)
const authMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  const userId = req.headers['x-user-id'];
  req.userId = typeof userId === 'string' ? userId : undefined;
  next();
};

// Initialize tRPC
const t = initTRPC.context<UnauthenticatedContext>().create();

// Protected procedure helper
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new Error('Not authenticated');
  return next({ ctx: { userId: ctx.userId } as AuthenticatedContext });
});

// tRPC Router
const appRouter = t.router({
  login: t.procedure
    .input(loginSchema)
    .mutation(async ({ input }): Promise<LoginResponse> => {
      try {
        const user = await db.getUserByUsername(input.username);
        
        if (user && user.password === input.password) {
          return { 
            success: true, 
            user: { 
              id: user.id, 
              username: user.username, 
              createdAt: user.createdAt 
            } 
          };
        }
        
        if (!user) {
          // Create new user
          const newUser = await db.createUser(input.username, input.password);
          return { 
            success: true, 
            user: { 
              id: newUser.id, 
              username: newUser.username, 
              createdAt: newUser.createdAt 
            } 
          };
        }
        
        return { success: false, error: 'Invalid password' };
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Login failed' };
      }
    }),

  getThreads: protectedProcedure
    .query(async ({ ctx }) => {
      return await db.getThreadsForUser(ctx.userId);
    }),

  createThread: protectedProcedure
    .input(createThreadSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const thread = await db.createThreadWithParticipants(ctx.userId, input.participantUsernames);
        
        // Broadcast new thread to all participants
        const participants = await db.getThreadParticipants(thread.id);
        participants.forEach(userId => {
          broadcastToUser(userId, {
            type: 'newThread',
            thread
          });
        });
        
        return thread;
      } catch (error) {
        console.error('Create thread error:', error);
        throw new Error('Failed to create thread');
      }
    }),

  getMessages: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ input }) => {
      return await db.getMessagesForThread(input.threadId);
    }),

  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const message = await db.addMessage(input.threadId, ctx.userId, input.content);
        
        // Broadcast new message to all thread participants
        await broadcastToThread(input.threadId, {
          type: 'newMessage',
          threadId: input.threadId,
          message
        });
        
        return message;
      } catch (error) {
        console.error('Send message error:', error);
        throw new Error('Failed to send message');
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

// SSE endpoint for real-time updates
app.get('/events/:userId', (req, res) => {
  const userId = req.params.userId;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'X-Accel-Buffering': 'no' // Disable nginx buffering
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Store connection for this user
  const userConnections = globalConnections.get(userId) || new Set();
  userConnections.add(res);
  globalConnections.set(userId, userConnections);

  // Send keep-alive ping every 30 seconds
  const keepAlive = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    } catch (error) {
      clearInterval(keepAlive);
    }
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    userConnections.delete(res);
    if (userConnections.size === 0) {
      globalConnections.delete(userId);
    }
  });

  req.on('error', () => {
    clearInterval(keepAlive);
    userConnections.delete(res);
    if (userConnections.size === 0) {
      globalConnections.delete(userId);
    }
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Initialize database
  await db.init();
  console.log('Database initialized');
});

export { appRouter };
export type AppRouter = typeof appRouter;