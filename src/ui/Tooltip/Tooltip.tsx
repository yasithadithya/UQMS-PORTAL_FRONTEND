import type { ReactElement, ReactNode } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import s from './Tooltip.module.css';

type TooltipProps = {
  content: ReactNode;
  /** A single focusable element (it receives the trigger props). */
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
};

/** Wrap the app once so tooltips share open/close delays. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <RadixTooltip.Provider delayDuration={400} skipDelayDuration={200}>{children}</RadixTooltip.Provider>;
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  if (!content) return children;
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content className={s.content} side={side} sideOffset={6} collisionPadding={8}>
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
