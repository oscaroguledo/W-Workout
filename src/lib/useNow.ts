import { useEffect, useState } from 'react';

/**
 * Current time, refreshed every `ms`. Keeps Date.now() out of render.
 * Pass `null` to pause (no timer, no re-renders) until it's needed again.
 */
export function useNow(ms: number | null = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (ms == null) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
