import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { WebSocketServer, WebSocket } from 'ws';
import { appRouter } from './router';
import { db } from './db';

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

// tRPC middleware
app.use('/trpc', authMiddleware, createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }) => ({
    userId: req.userId,
  }),
}));

// WebSocket server for real-time updates
const server = app.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);
  
  // Initialize database
  await db.init();
  console.log('Database initialized');
});

const wss = new WebSocketServer({ server });

// Store active connections
const connections = new Map<string, Set<any>>();

wss.on('connection', (ws, req) => {
  const userId = req.url?.split('?userId=')[1];
  if (userId) {
    if (!connections.has(userId)) {
      connections.set(userId, new Set());
    }
    connections.get(userId)!.add(ws);
    
    ws.on('close', () => {
      connections.get(userId)?.delete(ws);
      if (connections.get(userId)?.size === 0) {
        connections.delete(userId);
      }
    });
  }
});

// Broadcast message to all participants in a thread
export const broadcastToThread = async (threadId: string, message: any) => {
  // Get all participants in the thread
  const participants = await db.getThreadParticipants(threadId);
  
  // Broadcast to all connected participants
  participants.forEach((userId) => {
    const userConnections = connections.get(userId);
    if (userConnections) {
      userConnections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'newMessage', data: message }));
        }
      });
    }
  });
};

export { appRouter };
