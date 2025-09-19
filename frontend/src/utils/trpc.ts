import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../backend/src/server';

export const trpc = createTRPCReact<AppRouter>();

export const createTRPCClient = (userId?: string) => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/trpc`,
        headers: userId ? { 'x-user-id': userId } : {},
      }),
    ],
  });
};
