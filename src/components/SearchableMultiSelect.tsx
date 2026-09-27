import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import s from './SearchableSelect.module.css'; // shared look with SearchableSelect

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
  /** Shows the required marker next to the label. */
  required?: boolean;
  onChange: (value: string[]) => void;
};

export default function SearchableMultiSelect({
  label,
  value,
  options,
  placeholder = 'Select',
  searchPlaceholder = 'Search...',
  disabled,
  required,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selectedCount = value.length;
  const labelId = useId();
  // Selected options in the order they were picked, shown as removable chips under the control.
  const selectedOptions = useMemo(
    () => value.map((id) => options.find((o) => o.id === id)).filter(Boolean) as MultiSelectOption[],
    [value, options]
  );

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
    <div
      className={s.wrapper}
      ref={wrapperRef}
      onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); } }}
    >
      {label && <span id={labelId} className={s.label}>{label}{required && <span className={s.required} aria-hidden="true"> *</span>}</span>}
      <button
        type="button"
        className={`${s.control} ${disabled ? s.controlDisabled : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        aria-expanded={open}
        aria-labelledby={label ? labelId : undefined}
      >
        <span className={`${s.controlText} ${selectedCount === 0 ? s.placeholder : ''}`}>
          {selectedCount === 0 ? placeholder : `${selectedCount} selected`}
        </span>
        <ChevronDown className={`${s.caret} ${open ? s.caretOpen : ''}`} aria-hidden="true" />
      </button>

      {selectedOptions.length > 0 && (
        <ul className={s.chips} aria-label={label ? `Selected ${label.toLowerCase()}` : 'Selected'}>
          {selectedOptions.map((o) => (
            <li key={o.id} className={s.chip}>
              <span>{o.label}</span>
              {!disabled && (
                <button type="button" className={s.chipRemove} onClick={() => handleToggleOption(o.id)} aria-label={`Remove ${o.label}`}>
                  <X aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className={s.dropdown}>
          <input
            className={s.search}
            type="text"
            autoFocus
            aria-label={searchPlaceholder}
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
