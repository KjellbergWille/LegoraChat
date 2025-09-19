import { Pool } from 'pg';
import { User, Message, Thread } from '@legorachat/shared';

const pool = new Pool({
  user: process.env.DB_USER || 'willekjellberg',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'legorachat',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
});

export const db = {
  async init() {
    const client = await pool.connect();
    try {
      // Create tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS threads (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS thread_participants (
          thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          PRIMARY KEY (thread_id, user_id)
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
          sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed some users
      await client.query(`
        INSERT INTO users (username, password) VALUES 
        ('alice', 'password123'),
        ('bob', 'password123'),
        ('charlie', 'password123')
        ON CONFLICT (username) DO NOTHING;
      `);
    } finally {
      client.release();
    }
  },

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id::text, username, password, created_at FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  },

  async createUser(username: string, password: string): Promise<User> {
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id::text, username, password, created_at',
      [username, password]
    );
    return result.rows[0];
  },

  async getThreadsForUser(userId: string): Promise<Thread[]> {
    // 1. Get basic thread info
    const threadsResult = await pool.query(`
      SELECT t.id::text, t.created_at
      FROM threads t
      JOIN thread_participants tp ON t.id = tp.thread_id 
      WHERE tp.user_id = $1
      ORDER BY t.created_at DESC
    `, [userId]);

    const threads = [];

    // 2. For each thread, get thread name and last message
    for (const thread of threadsResult.rows) {
      // Get other participants (thread name)
      const participantsResult = await pool.query(`
        SELECT u.username 
        FROM users u
        JOIN thread_participants tp ON u.id = tp.user_id
        WHERE tp.thread_id = $1 AND u.id != $2
      `, [thread.id, userId]);
      
      const threadName = participantsResult.rows.map(p => p.username).join(', ') || 'Group Chat';

      // Get last message (optional)
      const lastMessageResult = await pool.query(`
        SELECT m.id::text, m.content, m.sender_id::text, u.username as "senderName"
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.thread_id = $1
        ORDER BY m.created_at DESC
        LIMIT 1
      `, [thread.id]);

      const lastMessage = lastMessageResult.rows[0] ? {
        id: lastMessageResult.rows[0].id,
        threadId: thread.id,
        senderId: lastMessageResult.rows[0].sender_id,
        content: lastMessageResult.rows[0].content,
        senderName: lastMessageResult.rows[0].senderName
      } : undefined;

      threads.push({
        id: thread.id,
        name: threadName,
        participants: [],
        createdAt: thread.created_at,
        lastMessage
      });
    }

    return threads;
  },

  async createThread(participantIds: string[]): Promise<Thread> {
    const threadResult = await pool.query(
      'INSERT INTO threads (name) VALUES ($1) RETURNING id::text, name, created_at',
      ['Chat'] // Static name since we use dynamic names in getThreadsForUser
    );
    const thread = threadResult.rows[0];

    // Insert participants
    const uniqueParticipantIds = [...new Set(participantIds)];
    for (const userId of uniqueParticipantIds) {
      await pool.query(
        'INSERT INTO thread_participants (thread_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [thread.id, userId]
      );
    }

    return {
      id: thread.id,
      name: thread.name,
      participants: uniqueParticipantIds,
      createdAt: thread.created_at
    };
  },

  async getMessagesForThread(threadId: string): Promise<Message[]> {
    const result = await pool.query(`
      SELECT m.id::text, m.thread_id::text, m.sender_id::text, m.content, u.username as "senderName"
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.thread_id = $1
      ORDER BY m.created_at ASC
    `, [threadId]);
    return result.rows;
  },

  async addMessage(threadId: string, senderId: string, content: string): Promise<Message> {
    const result = await pool.query(`
      INSERT INTO messages (thread_id, sender_id, content) 
      VALUES ($1, $2, $3) 
      RETURNING id::text, thread_id::text, sender_id::text, content, created_at
    `, [threadId, senderId, content]);
    
    // Get sender name
    const senderResult = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [senderId]
    );
    
    return {
      ...result.rows[0],
      senderName: senderResult.rows[0]?.username
    };
  },

  async getThreadParticipants(threadId: string): Promise<string[]> {
    const result = await pool.query(
      'SELECT user_id::text FROM thread_participants WHERE thread_id = $1',
      [threadId]
    );
    return result.rows.map(row => row.user_id);
  }
};
