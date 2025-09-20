import { useState } from 'react';
import { trpcClient } from '../lib/trpc';
import type { Thread } from '../types';

interface ThreadListProps {
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  threads: Thread[];
  setThreads: React.Dispatch<React.SetStateAction<Thread[]>>;
}

export function ThreadList({ selectedThreadId, onSelectThread, threads, setThreads }: ThreadListProps) {
  const [newUsername, setNewUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateThread = async () => {
    if (!newUsername.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const thread = await trpcClient.createThread.mutate({
        participantUsernames: [newUsername.trim()],
      });
      setThreads((prev) => [thread, ...prev]);
      setNewUsername('');
      onSelectThread(thread.id);
    } catch (error) {
      console.error('Failed to create thread:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-1/3 bg-white border-r h-screen flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold mb-4">Chats</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Username to message"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateThread()}
          />
          <button
            onClick={handleCreateThread}
            disabled={!newUsername.trim() || isCreating}
            className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            Start
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.map((thread) => (
          <div
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
              selectedThreadId === thread.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
            }`}
          >
            <div className="font-medium">{thread.name}</div>
            {thread.lastMessage && (
              <div className="text-sm text-gray-500 truncate mt-1">
                <span className="font-medium">{thread.lastMessage.senderName}: </span>
                {thread.lastMessage.content}
              </div>
            )}
          </div>
        ))}
        {threads.length === 0 && (
          <div className="p-4 text-center text-gray-500">No chats yet. Start a new conversation!</div>
        )}
      </div>
    </div>
  );
}
