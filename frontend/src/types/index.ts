export interface User {
  id: string;
  username: string;
}

export interface Message {
  id: string;
  content: string;
  senderName: string;
  senderId: string;
  createdAt: string;
  // It's helpful to ensure the backend includes threadId in real-time events
  threadId: string;
}

export interface Thread {
  id: string;
  name: string;
  lastMessage?: Message;
}
