import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowRight, CalendarPlus, CornerDownLeft, FilePlus2, FileText, LogOut, Moon, Search, Ship, Sun, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import type { Navigation } from '@/navigation/useNavigation';
import { toggleTheme, useTheme } from './useTheme';
import s from './CommandPalette.module.css';

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  group: 'Actions' | 'Pages';
  run: () => void;
};

type Props = { open: boolean; onOpenChange: (open: boolean) => void; nav: Navigation };

/** Ctrl/⌘+K: jump to any page the user can open, or run a common action. */
export function CommandPalette({ open, onOpenChange, nav }: Props) {
  const navigate = useNavigate();
  const { can, logout } = useAuth();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) { setQuery(''); setIndex(0); } }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => navigate(to);
    const fe = nav.firstEntryPath;
    const actions: (Command | false)[] = [
      !!fe && can(MODULE_KEYS.marineEntries, 'create') && { id: 'a-fe', label: 'Create first entry', icon: <Ship />, group: 'Actions', run: go(`${fe}/create`) },
      !!fe && can(MODULE_KEYS.marineBookings, 'create') && { id: 'a-book', label: 'Book a survey', icon: <CalendarPlus />, group: 'Actions', run: go(`${fe}/survey-booking/create`) },
      !!fe && can(MODULE_KEYS.marineReports, 'create') && { id: 'a-report', label: 'Create survey report', icon: <FileText />, group: 'Actions', run: go(`${fe}/survey-report/create`) },
      can(MODULE_KEYS.newRequest, 'create') && { id: 'a-req', label: 'New survey request', icon: <FilePlus2 />, group: 'Actions', run: go('/new-request/create') },
      { id: 'a-theme', label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', icon: theme === 'dark' ? <Sun /> : <Moon />, group: 'Actions', run: toggleTheme },
      { id: 'a-profile', label: 'My profile', icon: <UserRound />, group: 'Actions', run: go('/profile') },
      { id: 'a-logout', label: 'Sign out', icon: <LogOut />, group: 'Actions', run: logout },
    ];
    const pages: Command[] = nav.links.map(l => ({
      id: `p-${l.id}`,
      label: l.label,
      hint: l.trail.join(' › ') || undefined,
      icon: <ArrowRight />,
      group: 'Pages',
      run: go(l.to),
    }));
    return [...(actions.filter(Boolean) as Command[]), ...pages];
  }, [nav, can, theme, navigate, logout]);

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return commands;
    return commands.filter(c => {
      const text = `${c.label} ${c.hint ?? ''}`.toLowerCase();
      return words.every(w => text.includes(w));
    });
  }, [commands, query]);

  useEffect(() => { setIndex(0); }, [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const runAt = (i: number) => {
    const cmd = results[i];
    if (!cmd) return;
    onOpenChange(false);
    cmd.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); runAt(index); }
  };

  let lastGroup: string | null = null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content className={s.palette} aria-label="Search and commands">
          <Dialog.Title className="sr-only">Search and commands</Dialog.Title>
          <Dialog.Description className="sr-only">Type to filter pages and actions, use the arrow keys to choose, Enter to open.</Dialog.Description>
          <div className={s.inputRow}>
            <Search className={s.inputIcon} aria-hidden="true" />
            <input
              className={s.input}
              placeholder="Search pages and actions…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls="cmdk-list"
              aria-activedescendant={results[index] ? `cmdk-${results[index].id}` : undefined}
              aria-autocomplete="list"
              autoFocus
              enterKeyHint="go"
            />
            <kbd className={s.kbd}>Esc</kbd>
          </div>

          <div className={s.list} id="cmdk-list" role="listbox" ref={listRef} aria-label="Results">
            {results.length === 0 && <p className={s.empty}>No pages or actions match “{query}”.</p>}
            {results.map((c, i) => {
              const header = c.group !== lastGroup ? <div className={s.groupLabel} role="presentation">{c.group}</div> : null;
              lastGroup = c.group;
              return (
                <div key={c.id} role="presentation">
                  {header}
                  <div
                    id={`cmdk-${c.id}`}
                    role="option"
                    aria-selected={i === index}
                    data-index={i}
                    className={clsx(s.item, i === index && s.itemActive)}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => runAt(i)}
                  >
                    <span className={s.itemIcon} aria-hidden="true">{c.icon}</span>
                    <span className={s.itemLabel}>{c.label}</span>
                    {c.hint && <span className={s.itemHint}>{c.hint}</span>}
                    {i === index && <CornerDownLeft className={s.enterIcon} aria-hidden="true" />}
                  </div>
                </div>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
