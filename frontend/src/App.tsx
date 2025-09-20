import { useState, useEffect, useCallback } from 'react';
import { Login } from './components/Login';
import { ThreadList } from './components/ThreadList';
import { ChatView } from './components/ChatView';
import { useRealTimeUpdates } from './hooks/useRealTimeUpdates';
import { trpcClient } from './lib/trpc';
import type { User, Thread, Message } from './types';

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Fetch threads when the user logs in
  useEffect(() => {
    if (user) {
      setIsLoadingThreads(true);
      trpcClient.getThreads.query()
        .then((fetchedThreads) => setThreads(fetchedThreads))
        .catch((error) => console.error('Failed to load threads:', error))
        .finally(() => setIsLoadingThreads(false));
    }
  }, [user]);

  // Fetch messages when a thread is selected
  useEffect(() => {
    if (selectedThreadId) {
      setIsLoadingMessages(true);
      trpcClient.getMessages.query({ threadId: selectedThreadId })
        .then((fetchedMessages) => setMessages(fetchedMessages))
        .catch((error) => console.error('Failed to load messages:', error))
        .finally(() => setIsLoadingMessages(false));
    } else {
      setMessages([]);
    }
  }, [selectedThreadId]);
  
  // Define stable update handlers for the real-time hook
  const addMessageHandler = useCallback((message: Message) => {
    // Update the thread list to show the new last message and bring it to the top
    setThreads(prev => {
      const updatedThreads = prev.map(t => 
        t.id === message.threadId ? { ...t, lastMessage: message } : t
      );
      // Sort by the date of the last message to keep the list fresh
      return updatedThreads.sort((a, b) => 
        new Date(b.lastMessage?.createdAt ?? 0).getTime() - new Date(a.lastMessage?.createdAt ?? 0).getTime()
      );
    });

    // If the message belongs to the currently open thread, add it to the view
    // BUT only if it's not from the current user (to avoid duplicates with optimistic updates)
    if (message.threadId === selectedThreadId && message.senderId !== user?.id) {
      setMessages(prev => (prev.some(m => m.id === message.id) ? prev : [...prev, message]));
    }
  }, [selectedThreadId, user?.id]);

  const addThreadHandler = useCallback((thread: Thread) => {
    setThreads(prev => (prev.some(t => t.id === thread.id) ? prev : [thread, ...prev]));
  }, []);

  // Set up real-time updates using the custom hook
  useRealTimeUpdates(user?.id, {
    addMessage: addMessageHandler,
    addThread: addThreadHandler,
  });

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setSelectedThreadId(null);
    setThreads([]);
    setMessages([]);
  };

  // Render Login page if no user
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Render the main chat application
  return (
    <div className="h-screen flex bg-gray-100">
      <ThreadList
        selectedThreadId={selectedThreadId}
        onSelectThread={setSelectedThreadId}
        threads={threads}
        setThreads={setThreads}
      />
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b p-4 flex justify-between items-center">
          <span className="font-medium">Welcome, {user.username}!</span>
          <button onClick={handleLogout} className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">
            Logout
          </button>
        </div>
        {selectedThreadId ? (
          isLoadingMessages ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">Loading messages...</div>
          ) : (
            <ChatView
              threadId={selectedThreadId}
              currentUserId={user.id}
              currentUserName={user.username}
              messages={messages}
              setMessages={setMessages}
            />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}

export default App;