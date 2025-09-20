import { useState } from 'react';
import { trpc } from '../utils/trpc';
import { useSSE } from '../hooks/useSSE';

interface ChatListProps {
  onSelectThread: (threadId: string) => void;
  selectedThreadId: string | null;
  userId: string;
}

export default function ChatList({ onSelectThread, selectedThreadId, userId }: ChatListProps) {
  const [newThreadInput, setNewThreadInput] = useState('');
  const { data: threads, isLoading } = trpc.getThreads.useQuery();

  const utils = trpc.useContext();

  // SSE for real-time updates
  useSSE(userId, (event) => {
    if (event.type === 'newThread' || event.type === 'newMessage') {
      // Refresh threads list
      utils.getThreads.invalidate();
    }
  });

  const createThreadMutation = trpc.createThread.useMutation({
    onSuccess: (thread) => {
      setNewThreadInput('');
      // Invalidate threads list to get updated data
      utils.getThreads.invalidate();
      onSelectThread(thread.id);
    }
  });

  const handleCreateThread = () => {
    if (!newThreadInput.trim()) return;
    
    const participantUsernames = newThreadInput
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (participantUsernames.length > 0) {
      createThreadMutation.mutate({ participantUsernames });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {/* Simple input field for creating new threads */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={newThreadInput}
            onChange={(e) => setNewThreadInput(e.target.value)}
            placeholder="Write usernames for new chat..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateThread()}
            disabled={createThreadMutation.isPending}
          />
          <button
            onClick={handleCreateThread}
            disabled={!newThreadInput.trim() || createThreadMutation.isPending}
            className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {createThreadMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Separate multiple usernames with commas
        </p>
      </div>

      {threads?.map((thread) => (
        <div
          key={thread.id}
          onClick={() => onSelectThread(thread.id)}
          className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
            selectedThreadId === thread.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
          }`}
        >
          <div className="font-medium text-gray-900">{thread.name}</div>
          {thread.lastMessage && (
            <div className="text-sm text-gray-500 truncate">
              <span className="font-medium">{thread.lastMessage.senderName || 'Unknown'}: </span>
              {thread.lastMessage.content}
            </div>
          )}
        </div>
      ))}
      {threads?.length === 0 && (
        <div className="p-4 text-center text-gray-500">
          No conversations yet. Start a new chat!
        </div>
      )}
    </div>
  );
}
