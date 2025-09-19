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

## Quick Start

### 1. Database Setup

Make sure PostgreSQL is running and create a database:

```sql
CREATE DATABASE legorachat;
```

### 2. Install and Run

Install all dependencies and start both frontend and backend:

```bash
npm run install:all
npm run dev
```

This will start:
- Backend on `http://localhost:3001`
- Frontend on `http://localhost:3000`

The backend will automatically create the necessary database tables and seed test users.

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
│   │   ├── db-utils.ts    # Database utility functions
│   │   └── types.ts       # Zod schemas and TypeScript interfaces
│   ├── dist/              # Compiled JavaScript files
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ChatList.tsx
│   │   │   ├── ChatView.tsx
│   │   │   ├── Login.tsx
│   │   │   └── NewThread.tsx
│   │   ├── hooks/         # Custom React hooks
│   │   │   └── useWebSocket.ts
│   │   ├── utils/         # tRPC client setup
│   │   │   └── trpc.ts
│   │   ├── App.tsx        # Main application component
│   │   ├── main.tsx       # Application entry point
│   │   ├── types.ts       # TypeScript interfaces (duplicated from backend)
│   │   └── index.css      # Global styles
│   ├── dist/              # Built frontend files
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── docker-compose.yml      # Docker configuration
├── package.json           # Root package with dev scripts
└── README.md
```

**Note**: Currently, both frontend and backend have their own `types.ts` files with identical interfaces (User, Message, Thread). This creates duplication and potential for type drift. Consider creating a shared types package to eliminate this duplication.

## Development

```bash
npm run dev
```

## Building for Production

```bash
npm run build
```
