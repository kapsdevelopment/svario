import type { ReactNode } from 'react';

type WebsiteFooterProps = {
  children?: ReactNode;
};

export function WebsiteFooter({ children }: WebsiteFooterProps) {
  return (
    <footer className="website-footer">
      {children ? <div className="website-footer__links">{children}</div> : null}
      <p className="website-footer__copyright">
        <span>© 2026 Kapsdevelopment AS · Org.nr. 937 284 624</span>
        <span>Alle rettigheter reservert.</span>
      </p>
    </footer>
  );
}
