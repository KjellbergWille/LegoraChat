# LegoraChat

A simple messaging app similar to Facebook Messenger or WhatsApp, built with React, TypeScript, Node.js, and PostgreSQL.

## Features

- **Authentication**: Users can log in with username/password. If the username doesn't exist, a new account is created automatically.
- **Messaging**: Create new chat threads with other users and send messages in real-time.
- **Real-time Updates**: Messages appear automatically without page refresh.
- **Type Safety**: End-to-end type safety with tRPC and TypeScript.

## Tech Stack

- **Frontend**: React with TypeScript and Tailwind CSS
- **Backend**: Node.js with TypeScript and Express
- **API**: tRPC for type-safe API communication
- **Database**: PostgreSQL
- **Real-time**: WebSockets

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup Instructions

### 1. Database Setup

First, make sure PostgreSQL is running and create a database:

```sql
CREATE DATABASE legorachat;
```

Update the database connection settings in `backend/src/db.ts` if needed:
```typescript
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'legorachat',
  password: 'password', // Change this to your PostgreSQL password
  port: 5432,
});
```

### 2. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

Start the backend server:

```bash
npm run dev
```

The backend will run on `http://localhost:3001` and automatically create the necessary database tables and seed some test users.

### 3. Frontend Setup

In a new terminal, navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`.

## Usage

1. Open your browser and go to `http://localhost:3000`
2. Enter any username and password to log in (or create a new account)
3. Click "New Chat" to start a conversation with other users
4. Enter usernames separated by commas (e.g., "alice, bob")
5. Start messaging!

## Pre-seeded Users

The app comes with some pre-seeded users for testing:
- Username: `alice`, Password: `password123`
- Username: `bob`, Password: `password123`
- Username: `charlie`, Password: `password123`

## Project Structure

```
LegoraChat/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── server.ts       # Express server setup
│   │   ├── router.ts       # tRPC router with API endpoints
│   │   ├── db.ts          # Database operations
│   │   └── types.ts       # Zod schemas
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── utils/         # tRPC client setup
│   │   └── types.ts       # TypeScript types
│   └── package.json
├── shared/                 # Shared types
│   └── types.ts
└── README.md
```

## API Endpoints

The app uses tRPC for type-safe API communication:

- `login` - Authenticate user or create new account
- `getThreads` - Get all chat threads for a user
- `createThread` - Create a new chat thread
- `getMessages` - Get messages for a specific thread
- `sendMessage` - Send a new message

## Development

To run both frontend and backend in development mode:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Building for Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
```

The built frontend files will be in the `frontend/dist` directory.
