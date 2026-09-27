import type { ReactNode } from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import clsx from 'clsx';
import s from './Tabs.module.css';

export type TabItem<T extends string = string> = {
  value: T;
  label: ReactNode;
  /** Small count shown after the label. */
  count?: number;
  disabled?: boolean;
};

type TabsProps<T extends string> = {
  /** NoInfer here and on onValueChange: T comes from `value`, so literal unions don't widen to string. */
  items: TabItem<NoInfer<T>>[];
  value: T;
  onValueChange: (value: NoInfer<T>) => void;
  /** underline = page sections; segmented = small in-card switches. */
  variant?: 'underline' | 'segmented';
  label: string;
  /** Panel content for the active tab. Omit when the page renders content itself. */
  children?: ReactNode;
};

/**
 * Controlled tabs (keep the value in the URL for page-level tabs). Arrow keys move between tabs.
 */
export function Tabs<T extends string>({ items, value, onValueChange, variant = 'underline', label, children }: TabsProps<T>) {
  return (
    <RadixTabs.Root value={value} onValueChange={(v) => onValueChange(v as T)} activationMode="manual">
      <RadixTabs.List className={clsx(s.list, s[variant])} aria-label={label}>
        {items.map((t) => (
          <RadixTabs.Trigger key={t.value} value={t.value} disabled={t.disabled} className={s.trigger}>
            {t.label}
            {t.count != null && <span className={s.count}>{t.count}</span>}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children != null && (
        <RadixTabs.Content value={value} className={s.panel}>
          {children}
        </RadixTabs.Content>
      )}
    </RadixTabs.Root>
  );
}
