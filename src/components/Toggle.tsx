'use client';

import { useState } from 'react';
import s from './Toggle.module.css';

interface ToggleProps {
  label: React.ReactNode;
  checked?: boolean;
  onChange?: (val: boolean) => void;
  small?: boolean;
}

export default function Toggle({ label, checked = false, onChange, small = false }: ToggleProps) {
  const [on, setOn] = useState(checked);

  const handleChange = () => {
    const next = !on;
    setOn(next);
    onChange?.(next);
  };

  return (
    <div className={s.row}>
      <span className={`${s.label} ${small ? s.labelSmall : ''}`}>{label}</span>
      <label className={s.toggle}>
        <input className={s.input} type="checkbox" checked={on} onChange={handleChange} />
        <div className={s.track}></div>
        <div className={s.knob}></div>
      </label>
    </div>
  );
}
