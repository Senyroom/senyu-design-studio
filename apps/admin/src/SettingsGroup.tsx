import type { ReactNode } from 'react';

export default function SettingsGroup({
  title,
  description,
  number,
  children,
  action,
}: {
  title: string;
  description?: string;
  number?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="settings-group">
      <div className="settings-group-heading">
        {number && <span className="group-number">{number}</span>}
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {action && <div className="group-action">{action}</div>}
      </div>
      {children}
    </section>
  );
}
