# LegoraChat

Real-time messaging app built with React, TypeScript, Node.js, and PostgreSQL.

## Features

- **Login**: Username/password authentication with auto-registration
- **Real-time Chat**: Create threads, send messages, receive updates instantly via Server-Sent Events (SSE)
- **Direct Messages**: Start conversations with other users by username
- **Type Safety**: End-to-end type safety with tRPC
- **Live Updates**: Messages and threads update in real-time without page refresh

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **API**: tRPC for type-safe communication
- **Database**: PostgreSQL
- **Real-time**: Server-Sent Events (SSE)

## Quick Start

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v12+)

### Setup

1. **Create database:**
```sql
CREATE DATABASE legorachat;
```

2. **Install and run:**
```bash
npm run install:all
npm run dev
```

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:3000`

The app auto-creates tables and seeds test users.

### Test Users
- `alice` / `password123`
- `bob` / `password123` 
- `charlie` / `password123`

## Project Structure

```
LegoraChat/
├── backend/           # Node.js + Express + tRPC
│   ├── src/
│   │   ├── server.ts  # Express server + SSE + tRPC routes
│   │   └── db.ts      # PostgreSQL operations
├── frontend/          # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/ # Login, ChatList, ChatView
│   │   └── utils/     # tRPC client
├── shared/            # Shared TypeScript types + Zod schemas
└── package.json       # Root scripts
```

## Commands

```bash
npm run dev          # Start development servers
npm run build        # Build for production
npm run install:all  # Install all dependencies
```
