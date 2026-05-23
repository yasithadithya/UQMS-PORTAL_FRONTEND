'use client';

import { useState } from 'react';
import s from './Accordion.module.css';

export default function Accordion({ icon, title, defaultOpen = false, children }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className={`${s.item} ${open ? s.open : ''}`}>
            <button className={s.header} onClick={() => setOpen(o => !o)}>
                <span className={s.icon}>{icon}</span>
                <span className={s.headerLabel}>{title}</span>
                <div className={s.chevron}></div>
            </button>
            <div className={s.body}>
                <div className={s.content}>
                    {children}
                </div>
            </div>
        </div>
    );
}
