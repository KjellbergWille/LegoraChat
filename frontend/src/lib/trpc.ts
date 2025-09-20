import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
// The AppRouter type is imported from your backend project
import type { AppRouter } from '../../../backend/src/server'; // Adjust path if needed

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/trpc',
      // This function attaches the user's ID to every tRPC request
      headers: () => {
        const user = localStorage.getItem('user');
        return user ? { 'x-user-id': JSON.parse(user).id } : {};
      },
    }),
  ],
});
