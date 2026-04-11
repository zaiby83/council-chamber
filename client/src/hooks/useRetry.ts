import { useState, useCallback } from 'react';

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  onError?: (error: Error, attempt: number) => void;
}

export function useRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
) {
  const { maxAttempts = 3, delayMs = 1000, onError } = options;
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      let lastError: Error | null = null;

      for (let i = 0; i < maxAttempts; i++) {
        try {
          setAttempt(i + 1);
          if (i > 0) setIsRetrying(true);
          
          const result = await fn(...args);
          setIsRetrying(false);
          setAttempt(0);
          return result;
        } catch (error) {
          lastError = error as Error;
          onError?.(lastError, i + 1);
          
          if (i < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
          }
        }
      }

      setIsRetrying(false);
      setAttempt(0);
      throw lastError;
    },
    [fn, maxAttempts, delayMs, onError]
  );

  return { execute, isRetrying, attempt };
}
