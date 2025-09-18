import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { db } from './db';
import { loginSchema, createThreadSchema, sendMessageSchema } from './types';

const t = initTRPC.context<{ userId?: string }>().create();

export const appRouter = t.router({
  login: t.procedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      const user = await db.getUserByUsername(input.username);
      
      if (user && user.password === input.password) {
        return { success: true, user: { id: user.id, username: user.username } };
      }
      
      if (!user) {
        // Create new user
        const newUser = await db.createUser(input.username, input.password);
        return { success: true, user: { id: newUser.id, username: newUser.username } };
      }
      
      return { success: false, error: 'Invalid password' };
    }),

  getThreads: t.procedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      return await db.getThreadsForUser(ctx.userId);
    }),

  createThread: t.procedure
    .input(createThreadSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      
      // Get user IDs for participants
      const participantIds = [ctx.userId];
      for (const username of input.participantUsernames) {
        const user = await db.getUserByUsername(username);
        if (user) {
          participantIds.push(user.id);
        }
      }
      
      return await db.createThread(participantIds);
    }),

  getMessages: t.procedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      return await db.getMessagesForThread(input.threadId);
    }),

  sendMessage: t.procedure
    .input(sendMessageSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      const message = await db.addMessage(input.threadId, ctx.userId, input.content);
      
      // Broadcast the message to all participants
      const { broadcastToThread } = await import('./server');
      await broadcastToThread(input.threadId, message);
      
      return message;
    }),
});

export type AppRouter = typeof appRouter;
