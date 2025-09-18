import { useState } from 'react';
import { trpc } from '../utils/trpc';

interface NewThreadProps {
  userId: string;
  onClose: () => void;
  onThreadCreated: (threadId: string) => void;
}

export default function NewThread({ onClose, onThreadCreated }: NewThreadProps) {
  const [usernames, setUsernames] = useState('');
  const [error, setError] = useState('');

  const createThreadMutation = trpc.createThread.useMutation({
    onSuccess: (thread) => {
      onThreadCreated(thread.id);
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const participantUsernames = usernames
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (participantUsernames.length === 0) {
      setError('Please enter at least one username');
      return;
    }

    createThreadMutation.mutate({ participantUsernames });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Start New Chat</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="usernames" className="block text-sm font-medium text-gray-700 mb-2">
              Enter usernames (comma-separated)
            </label>
            <input
              id="usernames"
              type="text"
              value={usernames}
              onChange={(e) => setUsernames(e.target.value)}
              placeholder="alice, bob, charlie"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={createThreadMutation.isPending}
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple usernames with commas
            </p>
          </div>

          {error && (
            <div className="text-red-600 text-sm mb-4">{error}</div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={createThreadMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createThreadMutation.isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {createThreadMutation.isPending ? 'Creating...' : 'Create Chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
