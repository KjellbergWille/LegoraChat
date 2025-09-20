import { useEffect } from 'react';
import type { Message, Thread } from '../types';

// Define the functions the hook will call when an event is received
interface RealTimeUpdateHandlers {
  addMessage: (message: Message) => void;
  addThread: (thread: Thread) => void;
}

export function useRealTimeUpdates(userId: string | undefined, handlers: RealTimeUpdateHandlers) {
  // Destructure handlers for use in the useEffect hook
  const { addMessage, addThread } = handlers;

  useEffect(() => {
    // Don't establish a connection if there's no user ID
    if (!userId) return;

    const eventSource = new EventSource(`http://localhost:3001/events/${userId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'newMessage' && data.message) {
        addMessage(data.message);
      }

      if (data.type === 'newThread' && data.thread) {
        addThread(data.thread);
      }
    };

    // The cleanup function closes the connection when the component unmounts
    return () => eventSource.close();
  }, [userId, addMessage, addThread]);
}
