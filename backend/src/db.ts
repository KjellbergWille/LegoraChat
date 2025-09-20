import { Pool } from 'pg';
import { User, Message, Thread } from '@legorachat/shared';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://willekjellberg@localhost:5432/legorachat',
});


export const db = {
  async init() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
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
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Database error:', error);
      throw new Error('Failed to initialize database');
    } finally {
      client.release();
    }
  },

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const result = await pool.query(
        'SELECT id::text, username, password, created_at FROM users WHERE username = $1',
        [username]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to get user');
    }
  },

  async createUser(username: string, password: string): Promise<User> {
    try {
      const result = await pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id::text, username, password, created_at',
        [username, password]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to create user');
    }
  },

  async getThreadsForUser(userId: string): Promise<Thread[]> {
    try {
      const result = await pool.query(`
        SELECT 
          t.id::text,
          t.created_at,
          COALESCE(
            (SELECT string_agg(u.username, ', ') 
             FROM users u 
             JOIN thread_participants tp_inner ON u.id = tp_inner.user_id 
             WHERE tp_inner.thread_id = t.id AND u.id != $1), 
            'Group Chat'
          ) as name,
          lm.id::text as "lastMessageId",
          lm.content as "lastMessageContent",
          lm.sender_id::text as "lastMessageSenderId",
          lm_sender.username as "lastMessageSenderName"
        FROM threads t
        JOIN thread_participants tp ON t.id = tp.thread_id
        LEFT JOIN (
          SELECT *, 
                 ROW_NUMBER() OVER(PARTITION BY thread_id ORDER BY created_at DESC) as rn
          FROM messages
        ) lm ON lm.thread_id = t.id AND lm.rn = 1
        LEFT JOIN users lm_sender ON lm.sender_id = lm_sender.id
        WHERE tp.user_id = $1
        ORDER BY COALESCE(lm.created_at, t.created_at) DESC
      `, [userId]);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        lastMessage: row.lastMessageId ? {
          id: row.lastMessageId,
          threadId: row.id,
          senderId: row.lastMessageSenderId,
          content: row.lastMessageContent,
          senderName: row.lastMessageSenderName
        } : undefined
      }));
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to get threads');
    }
  },

  async createThread(participantIds: string[]): Promise<Thread> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create thread
      const threadResult = await client.query(
        'INSERT INTO threads (name) VALUES ($1) RETURNING id::text, name, created_at',
        ['Chat'] // Static name since we use dynamic names in getThreadsForUser
      );
      const thread = threadResult.rows[0];

      // Insert participants
      const uniqueParticipantIds = [...new Set(participantIds)];
      for (const userId of uniqueParticipantIds) {
        await client.query(
          'INSERT INTO thread_participants (thread_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [thread.id, userId]
        );
      }

      await client.query('COMMIT');
      return {
        id: thread.id,
        name: thread.name,
        createdAt: thread.created_at
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Database error:', error);
      throw new Error('Failed to create thread');
    } finally {
      client.release();
    }
  },

  async createThreadWithParticipants(currentUserId: string, participantUsernames: string[]): Promise<Thread> {
    try {
      // Get user IDs for participants
      const participantIds = [currentUserId];
      for (const username of participantUsernames) {
        const user = await this.getUserByUsername(username);
        if (user) {
          participantIds.push(user.id);
        }
      }
      
      return await this.createThread(participantIds);
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to create thread with participants');
    }
  },

  async getMessagesForThread(threadId: string): Promise<Message[]> {
    try {
      const result = await pool.query(`
        SELECT m.id::text, m.thread_id::text, m.sender_id::text, m.content, u.username as "senderName"
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.thread_id = $1
        ORDER BY m.created_at ASC
      `, [threadId]);
      return result.rows;
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to get messages');
    }
  },

  async addMessage(threadId: string, senderId: string, content: string): Promise<Message> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert message
      const messageResult = await client.query(`
        INSERT INTO messages (thread_id, sender_id, content) 
        VALUES ($1, $2, $3) 
        RETURNING id::text, thread_id::text, sender_id::text, content, created_at
      `, [threadId, senderId, content]);
      
      // Get sender name
      const senderResult = await client.query(
        'SELECT username FROM users WHERE id = $1',
        [senderId]
      );
      
      await client.query('COMMIT');
      return {
        ...messageResult.rows[0],
        senderName: senderResult.rows[0]?.username
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Database error:', error);
      throw new Error('Failed to add message');
    } finally {
      client.release();
    }
  },

  async getThreadParticipants(threadId: string): Promise<string[]> {
    try {
      const result = await pool.query(
        'SELECT user_id::text FROM thread_participants WHERE thread_id = $1',
        [threadId]
      );
      return result.rows.map(row => row.user_id);
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to get thread participants');
    }
  }
};
