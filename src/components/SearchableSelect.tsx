import { useEffect, useId, useMemo, useRef, useState } from 'react';
import s from './SearchableSelect.module.css';

export type SearchOption = {
  id: string;
  label: string;
};

type Props = {
  label?: string;
  value: string;
  options: SearchOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  onChange: (value: string) => void;
  onSearchChange?: (query: string) => void;
};

export default function SearchableSelect({
  label,
  value,
  options,
  placeholder = 'Select',
  searchPlaceholder = 'Search...',
  disabled,
  allowClear,
  onChange,
  onSearchChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const controlRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const labelId = useId();

  // With server-side search the chosen option can drop out of `options`; remember its label so the control keeps showing it.
  const lastSelectedRef = useRef<SearchOption | null>(null);
  const found = useMemo(() => options.find((item) => item.id === value), [options, value]);
  if (found) lastSelectedRef.current = found;
  const selected = found || (value && lastSelectedRef.current?.id === value ? lastSelectedRef.current : undefined);

  const filtered = useMemo(() => {
    if (onSearchChange) return options;
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((item) => item.label.toLowerCase().includes(term));
  }, [options, query, onSearchChange]);

  const close = (refocus = false) => {
    setOpen(false);
    if (refocus) controlRef.current?.focus();
  };

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
    if (open) {
      const idx = filtered.findIndex((item) => item.id === value);
      setHighlight(idx >= 0 ? idx : 0);
      searchRef.current?.focus();
    } else if (query) {
      setQuery('');
      // Tell a server-searching parent the query was cleared, so reopening doesn't show stale results.
      onSearchChange?.('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const handleToggle = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const handleSelect = (id: string) => {
    onChange(id);
    close(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlight((h) => Math.min(h + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (filtered[highlight]) handleSelect(filtered[highlight].id);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <div className={s.wrapper} ref={wrapperRef} onKeyDown={handleKeyDown}>
      {label && <span id={labelId} className={s.label}>{label}</span>}
      <button
        ref={controlRef}
        type="button"
        className={`${s.control} ${disabled ? s.controlDisabled : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={label ? labelId : undefined}
      >
        <span className={`${s.controlText} ${!selected ? s.placeholder : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <div className={s.actions}>
          {allowClear && selected && !disabled && (
            <span
              role="button"
              aria-label="Clear selection"
              className={s.clearBtn}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
            >
              &times;
            </span>
          )}
          <svg className={`${s.caret} ${open ? s.caretOpen : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className={s.dropdown}>
          <input
            ref={searchRef}
            className={s.search}
            type="text"
            placeholder={searchPlaceholder}
            value={query}
            aria-label={searchPlaceholder}
            aria-controls={listId}
            aria-activedescendant={filtered[highlight] ? `${listId}-${highlight}` : undefined}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlight(0);
              if (onSearchChange) onSearchChange(event.target.value);
            }}
          />
          <div className={s.list} id={listId} role="listbox" ref={listRef}>
            {filtered.length === 0 ? (
              <div className={s.empty}>No results</div>
            ) : (
              filtered.map((item, idx) => (
                <button
                  key={item.id}
                  id={`${listId}-${idx}`}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={item.id === value}
                  className={`${s.option} ${item.id === value ? s.optionActive : ''} ${idx === highlight ? s.optionHighlight : ''}`}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => handleSelect(item.id)}
                >
                  {item.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
