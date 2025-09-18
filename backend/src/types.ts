import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const createThreadSchema = z.object({
  participantUsernames: z.array(z.string()).min(1),
});

export const sendMessageSchema = z.object({
  threadId: z.string(),
  content: z.string().min(1),
});
