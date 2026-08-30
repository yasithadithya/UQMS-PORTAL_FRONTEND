import { useEffect } from 'react';
import { healthService } from '@/api';
import s from './BootScreen.module.css';

const MIN_DISPLAY_MS = 3000;

export default function BootScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    // Fire-and-forget: this just pings the backend to wake it up (Render free
    // tier spins down on idle). We don't wait for it to succeed or resolve -
    // the timer below is what actually dismisses this screen.
    healthService.check().catch(() => {});

    const timer = setTimeout(onDone, MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={s.container}>
      <div className={s.card}>
        <div className={s.logo}>
          <img src="/logo.png" alt="UQMS Logo" className={s.logoImage} />
        </div>
        <h1 className={s.title}>UQMS</h1>
        <div className={s.spinner} />
        <p className={s.subtitle}>Starting up services…</p>
      </div>
    </div>
  );
}
