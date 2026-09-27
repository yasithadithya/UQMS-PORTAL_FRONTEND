import type { ReactElement, ReactNode } from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import clsx from 'clsx';
import { MoreHorizontal } from 'lucide-react';
import { IconButton } from '../Button/Button';
import s from './Menu.module.css';

export type MenuItem =
  | {
      label: string;
      onSelect: () => void;
      icon?: ReactNode;
      danger?: boolean;
      disabled?: boolean;
      /** Shown as a tooltip-like hint, e.g. why an item is disabled. */
      hint?: string;
    }
  | 'separator';

type MenuProps = {
  items: (MenuItem | false | null | undefined)[];
  /** The trigger; defaults to a "⋯" icon button. */
  trigger?: ReactElement;
  /** Accessible name for the default trigger. */
  label?: string;
  align?: 'start' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
};

/** Dropdown of actions — used for secondary row actions ("⋯") and overflow menus. */
export function Menu({ items, trigger, label = 'More actions', align = 'end', side = 'bottom' }: MenuProps) {
  const visible = items.filter(Boolean) as MenuItem[];
  if (visible.length === 0) return null;

  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger asChild>
        {trigger ?? <IconButton label={label} icon={<MoreHorizontal />} size="sm" noTooltip />}
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className={s.content} align={align} side={side} sideOffset={4} collisionPadding={8} onClick={(e) => e.stopPropagation()}>
          {visible.map((item, i) =>
            item === 'separator' ? (
              <Dropdown.Separator key={`sep-${i}`} className={s.separator} />
            ) : (
              <Dropdown.Item
                key={item.label}
                className={clsx(s.item, item.danger && s.danger)}
                disabled={item.disabled}
                onSelect={item.onSelect}
                title={item.hint}
              >
                {item.icon && <span className={s.icon} aria-hidden="true">{item.icon}</span>}
                {item.label}
              </Dropdown.Item>
            ),
          )}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
