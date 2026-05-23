'use client';

import { useState } from 'react';
import s from './Stepper.module.css';

export default function Stepper({ title, subtitle, initial = 0, min = 0 }) {
    const [value, setValue] = useState(initial);

    return (
        <div className={s.row}>
            <div className={s.info}>
                <div className={s.title}>{title}</div>
                {subtitle && <div className={s.sub}>{subtitle}</div>}
            </div>
            <div className={s.stepper}>
                <button className={s.btn} onClick={() => setValue(v => Math.max(min, v - 1))}>−</button>
                <div className={s.val}>{value}</div>
                <button className={s.btn} onClick={() => setValue(v => v + 1)}>+</button>
            </div>
        </div>
    );
}
