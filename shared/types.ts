// Shared type definitions for LegoraChat
// Used by both frontend and backend

import { z } from 'zod';

// Core domain types
export interface User {
  id: string;
  username: string;
  password: string;
  createdAt: string;
}

// Client-safe user type (no password)
export interface ClientUser {
  id: string;
  username: string;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  senderName?: string;
  createdAt?: string;
}

export interface Thread {
  id: string;
  name: string;
  createdAt: string;
  lastMessage?: Message;
}

// Context types for tRPC
export interface AuthenticatedContext {
  userId: string;
}

export interface UnauthenticatedContext {
  userId?: string;
}

// API Response types
export interface LoginResponse {
  success: boolean;
  user?: ClientUser;
  error?: string;
}


// Zod schemas for validation
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const createThreadSchema = z.object({
  participantUsernames: z.array(z.string().min(1, 'Username cannot be empty')),
});

export const sendMessageSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  content: z.string().min(1, 'Message content cannot be empty'),
});

