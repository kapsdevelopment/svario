import type { ReactNode } from 'react';

type PanelProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
};

export function Panel({ title, subtitle, action, children }: PanelProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action ? <div className="panel__action">{action}</div> : null}
      </div>
      {children ? <div className="panel__body">{children}</div> : null}
    </section>
  );
}
