import { useEffect, useState } from 'react';
import { healthService } from '@/api';
import s from './BootScreen.module.css';

// Long enough to avoid a flash when the backend is already awake.
const MIN_DISPLAY_MS = 600;
// After this, explain the wait (the backend host spins down on idle and takes a while to wake).
const SLOW_NOTICE_MS = 5_000;
// Stop waiting and show the login screen; it reports its own errors if the backend is still down.
const MAX_WAIT_MS = 60_000;
const RETRY_EVERY_MS = 3_000;

export default function BootScreen({ onDone }: { onDone: () => void }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      const remaining = Math.max(0, MIN_DISPLAY_MS - (Date.now() - startedAt));
      setTimeout(onDone, remaining);
    };

    const ping = () => {
      healthService.check()
        .then(finish)
        .catch(() => {
          // A waking host often answers 502/503 first; keep trying until the cap.
          if (!cancelled) retryTimer = setTimeout(ping, RETRY_EVERY_MS);
        });
    };
    ping();

    const slowTimer = setTimeout(() => setSlow(true), SLOW_NOTICE_MS);
    const capTimer = setTimeout(finish, MAX_WAIT_MS);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearTimeout(slowTimer);
      clearTimeout(capTimer);
    };
  }, [onDone]);

  return (
    <div className={s.container}>
      <div className={s.card} role="status" aria-live="polite">
        <div className={s.logo}>
          <img src="/logo.png" alt="UQMS Logo" className={s.logoImage} />
        </div>
        <h1 className={s.title}>UQMS</h1>
        <div className={s.spinner} aria-hidden="true" />
        <p className={s.subtitle}>
          {slow ? 'Waking up the server. This can take up to a minute after a quiet period…' : 'Starting up services…'}
        </p>
      </div>
    </div>
  );
}
