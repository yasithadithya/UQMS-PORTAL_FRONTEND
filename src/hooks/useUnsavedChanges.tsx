import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import ConfirmModal from '@/components/ConfirmModal';

/**
 * Warns before leaving a form with unsaved edits, both for in-app navigation and tab close/reload.
 *
 * Usage:
 *   const unsaved = useUnsavedChanges();
 *   <form onChangeCapture={unsaved.markDirty}> ... </form>
 *   // before navigating away after a successful save:
 *   unsaved.allowNavigation(); navigate(...);
 *   // render once in the page:
 *   {unsaved.dialog}
 */
export function useUnsavedChanges() {
  const [dirty, setDirty] = useState(false);
  // Read by the blocker at navigation time, so a save can clear it and navigate in the same tick.
  const bypassRef = useRef(false);

  const markDirty = useCallback(() => {
    bypassRef.current = false;
    setDirty(true);
  }, []);

  const allowNavigation = useCallback(() => {
    bypassRef.current = true;
    setDirty(false);
  }, []);

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && !bypassRef.current && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (bypassRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const dialog = (
    <ConfirmModal
      isOpen={blocker.state === 'blocked'}
      title="Discard unsaved changes?"
      message="You have changes on this page that haven't been saved. If you leave now they will be lost."
      confirmText="Leave page"
      cancelText="Keep editing"
      isDestructive
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  );

  return { dirty, markDirty, allowNavigation, dialog };
}
