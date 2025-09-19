import { useState, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, createTRPCClient } from './utils/trpc';
import Login from './components/Login';
import ChatList from './components/ChatList';
import ChatView from './components/ChatView';
import { User } from '@legorachat/shared';

const queryClient = new QueryClient();

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedThreadId(null);
    localStorage.removeItem('user');
  };

  // Memoize tRPC client to prevent recreation on every render
  const trpcClient = useMemo(() => createTRPCClient(user?.id), [user?.id]);

  if (!user) {
    return (
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Login onLogin={handleLogin} />
        </QueryClientProvider>
      </trpc.Provider>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="flex h-screen bg-gray-100">
        <div className="w-1/3 border-r bg-white">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold">LegoraChat</h1>
              <div className="flex gap-2">
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600">Welcome, {user.username}!</p>
          </div>
          <ChatList
            onSelectThread={setSelectedThreadId}
            selectedThreadId={selectedThreadId}
          />
        </div>
        <div className="flex-1">
          {selectedThreadId ? (
            <ChatView
              threadId={selectedThreadId}
              userId={user.id}
              onBack={() => setSelectedThreadId(null)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a chat to start messaging
            </div>
          )}
        </div>
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
