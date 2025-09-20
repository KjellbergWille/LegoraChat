import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

interface User {
  id: string;
  username: string;
  password: string;
}

interface Message {
  id: string;
  content: string;
  senderName: string;
  senderId: string;
  createdAt: string;
  threadId: string;
}

interface Thread {
  id: string;
  name: string;
  lastMessage?: Message;
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const createThreadSchema = z.object({
  participantUsernames: z.array(z.string().min(1)),
});

const sendMessageSchema = z.object({
  threadId: z.string(),
  content: z.string().min(1),
});

// =============================================================================
// DATABASE
// =============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/legorachat',
});

// SSE connections
const sseConnections = new Map<string, Set<express.Response>>();

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS threads (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS thread_participants (
      thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (thread_id, user_id)
    );
    
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Test users
    INSERT INTO users (username, password) VALUES 
    ('alice', 'password123'), ('bob', 'password123'), ('charlie', 'password123')
    ON CONFLICT (username) DO NOTHING;
  `);
}

async function findUser(username: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT id::text, username, password FROM users WHERE username = $1',
    [username]
  );
  return result.rows[0] || null;
}

async function createUser(username: string, password: string): Promise<User> {
  const result = await pool.query(
    'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id::text, username, password',
    [username, password]
  );
  return result.rows[0];
}

async function getUserThreads(userId: string): Promise<Thread[]> {
  const result = await pool.query(`
    SELECT 
      t.id::text,
      t.name,
      m.id::text as msg_id,
      m.content as msg_content,
      u.username as msg_sender_name,
      m.sender_id::text as msg_sender_id,
      m.created_at as msg_created_at,
      m.thread_id::text as msg_thread_id
    FROM threads t
    JOIN thread_participants tp ON t.id = tp.thread_id
    LEFT JOIN messages m ON m.id = (
      SELECT id FROM messages 
      WHERE thread_id = t.id 
      ORDER BY created_at DESC 
      LIMIT 1
    )
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE tp.user_id = $1
    ORDER BY COALESCE(m.created_at, t.created_at) DESC
  `, [userId]);

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    lastMessage: row.msg_id ? {
      id: row.msg_id,
      content: row.msg_content,
      senderName: row.msg_sender_name,
      senderId: row.msg_sender_id,
      createdAt: row.msg_created_at,
      threadId: row.msg_thread_id
    } : undefined
  }));
}

async function createThread(participantUsernames: string[], currentUserId: string): Promise<Thread> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create thread with participant names
    const threadName = participantUsernames.join(', ');
    const threadResult = await client.query(
      'INSERT INTO threads (name) VALUES ($1) RETURNING id::text, name',
      [threadName]
    );
    const thread = threadResult.rows[0];

    // Add current user
    await client.query(
      'INSERT INTO thread_participants (thread_id, user_id) VALUES ($1, $2)',
      [thread.id, currentUserId]
    );

    // Add other participants
    for (const username of participantUsernames) {
      const user = await findUser(username);
      if (user && user.id !== currentUserId) {
        await client.query(
          'INSERT INTO thread_participants (thread_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [thread.id, user.id]
        );
      }
    }

    await client.query('COMMIT');
    
    // Notify participants
    const participantIds = await getThreadParticipants(thread.id);
    broadcastToUsers(participantIds, { type: 'newThread', thread });
    
    return thread;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getThreadMessages(threadId: string): Promise<Message[]> {
  const result = await pool.query(`
    SELECT 
      m.id::text,
      m.content,
      m.sender_id::text as "senderId",
      u.username as "senderName",
      m.created_at as "createdAt",
      m.thread_id::text as "threadId"
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.thread_id = $1
    ORDER BY m.created_at ASC
  `, [threadId]);
  
  return result.rows;
}

async function addMessage(threadId: string, senderId: string, content: string): Promise<Message> {
  const result = await pool.query(`
    INSERT INTO messages (thread_id, sender_id, content)
    VALUES ($1, $2, $3)
    RETURNING id::text, content, sender_id::text as "senderId", created_at as "createdAt", thread_id::text as "threadId"
  `, [threadId, senderId, content]);

  const message = result.rows[0];
  
  // Get sender name
  const senderResult = await pool.query(
    'SELECT username FROM users WHERE id = $1',
    [senderId]
  );
  
  const fullMessage = {
    ...message,
    senderName: senderResult.rows[0]?.username || 'Unknown'
  };
  
  // Notify participants
  const participantIds = await getThreadParticipants(threadId);
  broadcastToUsers(participantIds, { 
    type: 'newMessage', 
    message: fullMessage 
  });
  
  return fullMessage;
}

async function getThreadParticipants(threadId: string): Promise<string[]> {
  const result = await pool.query(
    'SELECT user_id::text FROM thread_participants WHERE thread_id = $1',
    [threadId]
  );
  return result.rows.map(row => row.user_id);
}

function broadcastToUsers(userIds: string[], event: any) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  userIds.forEach(userId => {
    const connections = sseConnections.get(userId);
    if (connections) {
      connections.forEach(res => {
        try {
          res.write(data);
        } catch (error) {
          connections.delete(res);
        }
      });
    }
  });
}

// =============================================================================
// EXPRESS SERVER & TRPC
// =============================================================================

const app = express();
app.use(cors());
app.use(express.json());

// TRPC setup
const t = initTRPC.context<{ userId?: string }>().create();

const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new Error('Not authenticated');
  }
  return next({ ctx: { userId: ctx.userId } });
});

const protectedProcedure = t.procedure.use(authMiddleware);

const appRouter = t.router({
  login: t.procedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      const user = await findUser(input.username);
      
      if (user && user.password === input.password) {
        return {
          success: true,
          user: { id: user.id, username: user.username }
        };
      }
      
      if (!user) {
        const newUser = await createUser(input.username, input.password);
        return {
          success: true,
          user: { id: newUser.id, username: newUser.username }
        };
      }
      
      return { success: false, error: 'Invalid password' };
    }),

  getThreads: protectedProcedure
    .query(({ ctx }) => getUserThreads(ctx.userId)),

  createThread: protectedProcedure
    .input(createThreadSchema)
    .mutation(({ input, ctx }) => 
      createThread(input.participantUsernames, ctx.userId)
    ),

  getMessages: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(({ input }) => getThreadMessages(input.threadId)),

  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(({ input, ctx }) => 
      addMessage(input.threadId, ctx.userId, input.content)
    ),
});

// Middleware to extract user ID from headers
app.use('/trpc', (req, res, next) => {
  (req as any).userId = req.headers['x-user-id'] as string;
  next();
});

// TRPC middleware
app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }) => ({ userId: (req as any).userId }),
}));

// Server-Sent Events endpoint
app.get('/events/:userId', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const userId = req.params.userId;
  
  if (!sseConnections.has(userId)) {
    sseConnections.set(userId, new Set());
  }
  sseConnections.get(userId)!.add(res);

  // Send connection confirmation
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Cleanup on disconnect
  res.on('close', () => {
    const connections = sseConnections.get(userId);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        sseConnections.delete(userId);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await initDatabase();
  console.log('Database initialized');
});

export type AppRouter = typeof appRouter;