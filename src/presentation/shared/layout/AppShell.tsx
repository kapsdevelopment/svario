import {
  BarChart3,
  BriefcaseBusiness,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Plus,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import {
  type WorkspaceScope,
  useWorkspaceScope,
} from '../../../application/workspaces/WorkspaceScopeProvider';

const primaryNavItems = [
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
];

const mobileNavItems = [
  ...primaryNavItems,
  {
    label: 'Profil',
    to: routes.profile,
    icon: UserRound,
  },
];

export function AppShell() {
  const auth = useAuth();
  const workspaceScope = useWorkspaceScope();
  const location = useLocation();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isResultsRoute =
    location.pathname === routes.resultsHome ||
    /^\/surveys\/[^/]+\/results$/.test(location.pathname);

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

        {workspaceScope.hasWorkspaceChoices ? (
          <WorkspaceScopeSwitcher />
        ) : null}

        <nav className="sidebar__nav" aria-label="Hovedmeny">
          {primaryNavItems.map((item) => {
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
          <NavLink to={routes.profile} className="sidebar-profile-link">
            <UserRound size={18} aria-hidden="true" />
            <span>Profil</span>
          </NavLink>
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
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className="bottom-nav__item">
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <NavLink
          to={routes.resultsHome}
          className={({ isActive }) =>
            isActive || isResultsRoute
              ? 'bottom-nav__item active'
              : 'bottom-nav__item'
          }
        >
          <BarChart3 size={20} aria-hidden="true" />
          <span>Resultater</span>
        </NavLink>
      </nav>
    </div>
  );
}

function WorkspaceScopeSwitcher() {
  const { scope, setScope, workspaces, isLoading } = useWorkspaceScope();
  const selectedValue =
    scope.type === 'workspace' ? scope.workspaceId : personalWorkspaceValue;

  function handleScopeChange(value: string) {
    const nextScope: WorkspaceScope =
      value === personalWorkspaceValue
        ? { type: 'personal' }
        : { type: 'workspace', workspaceId: value };

    setScope(nextScope);
  }

  return (
    <label className="workspace-switcher">
      <span>Arbeidsflate</span>
      <span className="workspace-switcher__control">
        <BriefcaseBusiness size={17} aria-hidden="true" />
        <select
          aria-label="Velg arbeidsflate"
          disabled={isLoading}
          value={selectedValue}
          onChange={(event) => handleScopeChange(event.target.value)}
        >
          <option value={personalWorkspaceValue}>Personlig</option>
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </span>
    </label>
  );
}

const personalWorkspaceValue = 'personal';
