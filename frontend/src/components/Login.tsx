import { useState } from 'react';
import { trpc } from '../utils/trpc';
import { ClientUser } from '@legorachat/shared';

interface LoginProps {
  onLogin: (user: ClientUser) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = trpc.login.useMutation({
    onSuccess: (data) => {
      if (data.success && data.user) {
        onLogin(data.user);
      } else if (data.error) {
        setError(data.error);
      }
    },
    onError: () => {
      setError('Login failed');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            LegoraChat
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your username and password to continue
          </p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        <div className="text-center text-sm text-gray-600">
          <p>If the username doesn't exist, a new account will be created.</p>
        </div>
      </div>
    </div>
  );
}
