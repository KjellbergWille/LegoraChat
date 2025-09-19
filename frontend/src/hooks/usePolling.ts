import { useEffect } from 'react';

/**
 * Custom hook for polling data at regular intervals
 * @param refetch - Function to call for refetching data
 * @param interval - Polling interval in milliseconds
 */
export const usePolling = (refetch: () => void, interval: number) => {
  useEffect(() => {
    const timer = setInterval(refetch, interval);
    return () => clearInterval(timer);
  }, [refetch, interval]);
};
