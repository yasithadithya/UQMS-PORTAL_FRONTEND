import { useEffect, useMemo, useRef, useState } from 'react';
import s from './SearchableMultiSelect.module.css';

export type MultiSelectOption = {
  id: string;
  label: string;
};

type Props = {
  label?: string;
  value: string[];
  options: MultiSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  onChange: (value: string[]) => void;
};

export default function SearchableMultiSelect({
  label,
  value,
  options,
  placeholder = 'Select',
  searchPlaceholder = 'Search...',
  disabled,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selectedCount = value.length;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((item) => item.label.toLowerCase().includes(term));
  }, [options, query]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!wrapperRef.current || !event.target) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const handleToggle = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const handleToggleOption = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className={s.wrapper} ref={wrapperRef}>
      {label && <label className={s.label}>{label}</label>}
      <button
        type="button"
        className={`${s.control} ${disabled ? s.controlDisabled : ''}`}
        onClick={handleToggle}
        disabled={disabled}
      >
        <span className={`${s.controlText} ${selectedCount === 0 ? s.placeholder : ''}`}>
          {selectedCount === 0 ? placeholder : `${selectedCount} selected`}
        </span>
        <span className={s.caret}>{open ? '^' : 'v'}</span>
      </button>

      {open && (
        <div className={s.dropdown}>
          <input
            className={s.search}
            type="text"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className={s.list}>
            {filtered.length === 0 ? (
              <div className={s.empty}>No results</div>
            ) : (
              filtered.map((item) => (
                <label key={item.id} className={s.option}>
                  <input
                    type="checkbox"
                    checked={value.includes(item.id)}
                    onChange={() => handleToggleOption(item.id)}
                  />
                  {item.label}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
