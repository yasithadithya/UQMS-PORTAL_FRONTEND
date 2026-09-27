import { createContext, forwardRef, useContext, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';
import { ChevronDown, Search, X } from 'lucide-react';
import s from './Form.module.css';

type FieldCtx = { id: string; describedBy?: string; invalid: boolean; required?: boolean };
const FieldContext = createContext<FieldCtx | null>(null);

/** Controls inside a <Field> pick up its id, aria-describedby, aria-invalid and required automatically. */
const useFieldProps = (props: { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: unknown; required?: boolean }) => {
  const ctx = useContext(FieldContext);
  if (!ctx) return {};
  return {
    id: props.id ?? ctx.id,
    'aria-describedby': clsx(props['aria-describedby'], ctx.describedBy) || undefined,
    'aria-invalid': (props['aria-invalid'] as boolean | undefined) ?? (ctx.invalid || undefined),
    required: props.required ?? ctx.required,
  };
};

type FieldProps = {
  label: ReactNode;
  children: ReactNode;
  /** Helper text under the control. */
  hint?: ReactNode;
  /** Error message; turns the control red and is announced to screen readers. */
  error?: ReactNode;
  required?: boolean;
  /** Span every column of the surrounding FormGrid. */
  full?: boolean;
  /** Visually hide the label (it's still read out). */
  hideLabel?: boolean;
  className?: string;
  id?: string;
};

export function Field({ label, children, hint, error, required, full, hideLabel, className, id }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? `f${autoId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;

  return (
    <FieldContext.Provider value={{ id: controlId, describedBy: clsx(errorId, hintId) || undefined, invalid: !!error, required }}>
      <div className={clsx(s.field, full && s.full, className)} data-invalid={error ? '' : undefined}>
        <label htmlFor={controlId} className={clsx(s.label, hideLabel && 'sr-only')}>
          {label}
          {required && <span className={s.required} aria-hidden="true">*</span>}
        </label>
        {children}
        {error ? (
          <p id={errorId} className={s.error} role="alert">{error}</p>
        ) : hint ? (
          <p id={hintId} className={s.hint}>{hint}</p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  /** Text or icon inside the start of the field, e.g. "Rs." */
  prefix?: ReactNode;
  suffix?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, prefix, suffix, ...rest }, ref) {
  const field = useFieldProps(rest);
  const input = <input ref={ref} className={clsx(s.control, !prefix && !suffix && className)} {...rest} {...field} />;
  if (!prefix && !suffix) return input;
  return (
    <div className={clsx(s.affixWrap, className)}>
      {prefix && <span className={s.affix}>{prefix}</span>}
      {input}
      {suffix && <span className={s.affix}>{suffix}</span>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 3, ...rest }, ref) {
  const field = useFieldProps(rest);
  return <textarea ref={ref} rows={rows} className={clsx(s.control, s.textarea, className)} {...rest} {...field} />;
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { placeholder?: string };

/** Native select (best on phones). For long searchable lists use SearchableSelect. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, placeholder, children, ...rest }, ref) {
  const field = useFieldProps(rest);
  return (
    <div className={clsx(s.selectWrap, className)}>
      <select ref={ref} className={clsx(s.control, s.select)} {...rest} {...field}>
        {placeholder != null && <option value="" disabled={field.required}>{placeholder}</option>}
        {children}
      </select>
      <ChevronDown className={s.selectIcon} aria-hidden="true" />
    </div>
  );
});

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; description?: ReactNode };

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, description, className, id, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? `c${autoId}`;
  return (
    <label htmlFor={inputId} className={clsx(s.check, className)}>
      <input ref={ref} id={inputId} type="checkbox" className={s.checkInput} {...rest} />
      <span>
        <span className={s.checkLabel}>{label}</span>
        {description && <span className={s.checkDescription}>{description}</span>}
      </span>
    </label>
  );
});

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;
};

/** Search box with icon and clear button. Debounce in the caller if it triggers a request. */
export function SearchInput({ value, onChange, placeholder = 'Search…', className, ...rest }: SearchInputProps) {
  return (
    <div className={clsx(s.search, className)}>
      <Search className={s.searchIcon} aria-hidden="true" />
      <input
        type="search"
        className={clsx(s.control, s.searchControl)}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label={rest['aria-label'] ?? placeholder}
        enterKeyHint="search"
        {...rest}
      />
      {value && (
        <button type="button" className={s.searchClear} onClick={() => onChange('')} aria-label="Clear search">
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
