export interface User {
  id: string;
  username: string;
  password: string;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  senderName?: string;
}

export interface Thread {
  id: string;
  name: string;
  participants: string[];
  createdAt: string;
  lastMessage?: Message;
}


import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const createThreadSchema = z.object({
  participantUsernames: z.array(z.string()),
});

export const sendMessageSchema = z.object({
  threadId: z.string(),
  content: z.string(),
});