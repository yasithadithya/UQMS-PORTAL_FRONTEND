'use client';

import { useState } from 'react';
import s from './SegmentedControl.module.css';

export default function SegmentedControl({ segments, defaultIndex = 0, onChange }) {
    const [active, setActive] = useState(defaultIndex);

    const handleClick = (idx) => {
        setActive(idx);
        onChange?.(idx, segments[idx]);
    };

    return (
        <div className={s.segmented}>
            {segments.map((seg, i) => (
                <button
                    key={seg}
                    className={`${s.btn} ${i === active ? s.active : ''}`}
                    onClick={() => handleClick(i)}
                >
                    {seg}
                </button>
            ))}
        </div>
    );
}
