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

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateThreadRequest {
  participantUsernames: string[];
}

export interface SendMessageRequest {
  threadId: string;
  content: string;
}
