import { useState, useEffect, useRef } from 'react';
import { trpc } from '../utils/trpc';
import { Message } from '@legorachat/shared';
import { useSSE } from '../hooks/useSSE';

interface ChatViewProps {
  threadId: string;
  userId: string;
  onBack: () => void;
}

export default function ChatView({ threadId, userId, onBack }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = trpc.getMessages.useQuery(
    { threadId }
  );

  const utils = trpc.useContext();

  // SSE for real-time updates
  useSSE(userId, (event) => {
    if (event.type === 'newMessage' && event.threadId === threadId) {
      // Refresh messages for this thread
      utils.getMessages.invalidate({ threadId });
    }
  });

  const sendMessageMutation = trpc.sendMessage.useMutation({
    onMutate: async (newMessage) => {
      // Optimistically add message to UI immediately
      const previousMessages = utils.getMessages.getData({ threadId });
      
      const optimisticMessage: Message = {
        id: 'temp-' + Date.now(),
        threadId,
        senderId: userId,
        content: newMessage.content,
        senderName: 'You'
      };
      
      utils.getMessages.setData({ threadId }, (old) => [
        ...(old || []),
        optimisticMessage
      ]);
      
      return { previousMessages };
    },
    onSuccess: () => {
      setMessage('');
      // Refresh to get real data
      utils.getMessages.invalidate({ threadId });
      // utils.getThreads.invalidate(); // <- optional if SSE refreshes list already
    },
    onError: (_err, _newMessage, context) => {
      // Revert optimistic update on error
      utils.getMessages.setData({ threadId }, context?.previousMessages);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate({
        threadId,
        content: message.trim()
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white">
        <button
          onClick={onBack}
          className="mr-4 text-blue-500 hover:text-blue-700"
        >
          ← Back
        </button>
        <span className="font-medium">Chat</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.senderId === userId
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {msg.senderId !== userId && (
                <div className="text-xs font-medium mb-1 text-gray-600">
                  {msg.senderName || 'Unknown'}
                </div>
              )}
              <div className="text-sm">{msg.content}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sendMessageMutation.isPending}
          />
          <button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
