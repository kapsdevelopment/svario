import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Plus,
  UserRound,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

import { routes } from '../../../app/routes';

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
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand__mark">S</div>
          <div>
            <strong>Svario</strong>
            <span>Spørsmål og innsikt</span>
          </div>
        </div>

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
