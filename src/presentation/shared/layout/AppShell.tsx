import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Plus,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';

const navItems = [
  {
    label: 'Dashboard',
    to: routes.dashboard,
    icon: LayoutDashboard,
  },
  {
    label: 'Skjemaer',
    to: routes.surveys,
    icon: ClipboardList,
  },
  {
    label: 'Profil',
    to: routes.profile,
    icon: UserRound,
  },
];

export function AppShell() {
  const auth = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const userEmail = auth.user?.email ?? 'Innlogget admin';

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await auth.signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to={routes.home} aria-label="Gå til forsiden">
          <div className="brand__mark">S</div>
          <div>
            <strong>Svario</strong>
            <span>Spørsmål og innsikt</span>
          </div>
        </Link>

        <nav className="sidebar__nav" aria-label="Hovedmeny">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className="nav-link">
                <Icon size={20} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <NavLink to={routes.newSurvey} className="sidebar__cta">
          <Plus size={18} aria-hidden="true" />
          Nytt skjema
        </NavLink>

        <div className="sidebar-account">
          <div>
            <span>Admin</span>
            <strong>{userEmail}</strong>
          </div>
          <button
            aria-label="Logg ut"
            className="icon-button"
            disabled={isSigningOut}
            onClick={handleSignOut}
            type="button"
          >
            <LogOut size={19} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Hovedmeny">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className="bottom-nav__item">
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <NavLink to={routes.results('demo')} className="bottom-nav__item">
          <BarChart3 size={20} aria-hidden="true" />
          <span>Resultater</span>
        </NavLink>
      </nav>
    </div>
  );
}
