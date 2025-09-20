import { useState, useEffect, useRef } from 'react';
import { trpcClient } from '../lib/trpc';
import type { Message } from '../types';

interface ChatViewProps {
  threadId: string;
  currentUserId: string;
  currentUserName: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function ChatView({ threadId, currentUserId, currentUserName, messages, setMessages }: ChatViewProps) {
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || isSending) return;

    const content = messageContent.trim();
    setMessageContent('');
    setIsSending(true);

    const optimisticMessage: Message = {
      id: Date.now().toString(),
      content,
      senderId: currentUserId,
      senderName: currentUserName,
      createdAt: new Date().toISOString(),
      threadId: threadId,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const savedMessage = await trpcClient.sendMessage.mutate({ threadId, content });
      setMessages((prev) => prev.map((m) => (m.id === optimisticMessage.id ? savedMessage : m)));
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.senderId === currentUserId ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
              }`}
            >
              <div className="text-xs font-medium mb-1 opacity-75">{msg.senderName}</div>
              <div>{msg.content}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!messageContent.trim() || isSending}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
