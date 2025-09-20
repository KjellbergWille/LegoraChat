# LegoraChat - Real-time Messaging App

A simple, real-time messaging application built with React, TypeScript, Node.js, and PostgreSQL.

## Features

✅ **Login System**: Username/password authentication with auto-registration  
✅ **Real-time Chat**: Instant message delivery using Server-Sent Events  
✅ **Direct Messages**: Start conversations with other users by username  
✅ **Thread Management**: List of conversations with latest message preview  
✅ **Type Safety**: End-to-end type safety with tRPC  
✅ **Responsive UI**: Clean interface built with Tailwind CSS  

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript  
- **API**: tRPC for type-safe communication
- **Database**: PostgreSQL
- **Real-time**: Server-Sent Events (SSE)

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+

### 1. Setup Database
```bash
# Create database
createdb legorachat

# Or using psql
psql -c "CREATE DATABASE legorachat;"
```

### 2. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

### 3. Environment Setup
Create `backend/.env`:
```env
DATABASE_URL=postgresql://localhost:5432/legorachat
PORT=3001
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend  
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Usage

1. **Login**: Enter any username/password. New users are created automatically
2. **Start Chat**: Enter a username in the input field and click "Start"
3. **Send Messages**: Type in the message box and press Enter or click Send
4. **Real-time Updates**: Messages appear instantly without page refresh

### Test Users
Pre-created users for testing:
- `alice` / `password123`
- `bob` / `password123`  
- `charlie` / `password123`

## Project Structure

```
LegoraChat/
├── backend/
│   ├── src/
│   │   └── server.ts          # Express + tRPC + Database
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main React app
│   │   ├── main.tsx           # React entry point
│   │   └── index.css          # Tailwind styles
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

## API Endpoints

### tRPC Routes
- `login` - Authenticate user
- `getThreads` - Get user's conversation threads  
- `createThread` - Start new conversation
- `getMessages` - Get messages for a thread
- `sendMessage` - Send message to thread

### SSE Endpoint
- `GET /events/:userId` - Real-time updates stream

## Database Schema

```sql
-- Users table
users (id, username, password, created_at)

-- Conversation threads  
threads (id, name, created_at)

-- Thread participants (many-to-many)
thread_participants (thread_id, user_id)

-- Messages
messages (id, thread_id, sender_id, content, created_at)
```

## Development Commands

```bash
# Backend
npm run dev          # Start development server
npm run build        # Build for production  
npm start            # Run production build

# Frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Architecture

- **Frontend**: React components communicate with backend via tRPC
- **Backend**: Express server with tRPC router and PostgreSQL
- **Real-time**: Server-Sent Events push updates to connected clients
- **Database**: PostgreSQL with simple relational schema
- **Type Safety**: Shared types between frontend/backend via tRPC

## Troubleshooting

**Database connection issues:**
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists

**Port conflicts:**
- Backend runs on port 3001
- Frontend runs on port 3000  
- Change ports in package.json scripts if needed

**Real-time not working:**
- Check browser dev tools for SSE connection errors
- Ensure both servers are running
- Try refreshing the page

## License

MIT License - feel free to use this code for your own projects!