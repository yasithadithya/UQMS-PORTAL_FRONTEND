import type { ReactNode } from 'react';
import { Compass, Lock } from 'lucide-react';
import { ButtonLink, Card, EmptyState } from '@/ui';
import s from './StatusPage.module.css';

type Props = {
  title: string;
  message: string;
  icon?: ReactNode;
};

/** Full-page message for "not found" / "access denied" states, with a way back. */
export default function StatusPage({ title, message, icon }: Props) {
  return (
    <div className={`animate-in ${s.wrap}`}>
      <Card padding="none">
        <EmptyState
          icon={icon}
          title={title}
          description={message}
          action={<ButtonLink to="/" variant="primary">Back to dashboard</ButtonLink>}
        />
      </Card>
    </div>
  );
}

export function AccessDenied() {
  return (
    <StatusPage
      icon={<Lock />}
      title="You don't have access to this page"
      message="Your role doesn't include this area. If you need it, ask an administrator to update your role."
    />
  );
}

export function NotFound() {
  return <StatusPage icon={<Compass />} title="Page not found" message="The page you're looking for doesn't exist or has moved." />;
}
