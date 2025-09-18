import { trpc } from '../utils/trpc';

interface ChatListProps {
  userId: string;
  onSelectThread: (threadId: string) => void;
  selectedThreadId: string | null;
}

export default function ChatList({ onSelectThread, selectedThreadId }: ChatListProps) {
  const { data: threads, isLoading } = trpc.getThreads.useQuery();

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
              <span className="font-medium">{(thread.lastMessage as any).sender_name || thread.lastMessage.senderName || 'Unknown'}: </span>
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
