import {
  BarChart3,
  Building2,
  BriefcaseBusiness,
  ChevronDown,
  ClipboardList,
  Compass,
  Landmark,
  Layers2,
  LayoutDashboard,
  LogOut,
  Mountain,
  Network,
  Plus,
  TreePine,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useRef,
  useState,
} from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import {
  type WorkspaceScope,
  useWorkspaceScope,
} from '../../../application/workspaces/WorkspaceScopeProvider';
import workspaceSliderMountains from '../../../assets/images/workspace-slider-mountains.png';
import workspaceSliderStone from '../../../assets/images/workspace-slider-stone.png';

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
  const shouldShowWorkspaceSwitcher = workspaceScope.hasWorkspaceChoices;

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

        {shouldShowWorkspaceSwitcher ? <WorkspaceScopeSwitcher /> : null}

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

      {shouldShowWorkspaceSwitcher ? (
        <div className="mobile-workspace-scope">
          <WorkspaceScopeSwitcher />
        </div>
      ) : null}

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
  const options: WorkspaceScopeOption[] = [
    {
      value: personalWorkspaceValue,
      label: 'Personlig',
      scope: { type: 'personal' },
      Icon: UserRound,
    },
    ...workspaces.map((workspace) => ({
      value: workspace.id,
      label: workspace.name,
      scope: { type: 'workspace', workspaceId: workspace.id } as WorkspaceScope,
      Icon: getWorkspaceIcon(workspace.id),
    })),
  ];
  const selectedValue =
    scope.type === 'workspace' ? scope.workspaceId : personalWorkspaceValue;

  function handleScopeChange(value: string) {
    const nextScope = options.find((option) => option.value === value)?.scope;

    if (nextScope) {
      setScope(nextScope);
    }
  }

  if (options.length <= maxSliderWorkspaceOptions) {
    return (
      <WorkspaceScopeSlider
        disabled={isLoading}
        options={options}
        selectedValue={selectedValue}
        onChange={handleScopeChange}
      />
    );
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
const maxSliderWorkspaceOptions = 5;
const workspaceIconOptions = [
  UsersRound,
  Building2,
  BriefcaseBusiness,
  Landmark,
  TreePine,
  Mountain,
  Layers2,
  Network,
  Compass,
] satisfies LucideIcon[];

type WorkspaceScopeOption = {
  value: string;
  label: string;
  scope: WorkspaceScope;
  Icon: LucideIcon;
};

type WorkspaceScopeSliderProps = {
  disabled: boolean;
  options: WorkspaceScopeOption[];
  selectedValue: string;
  onChange: (value: string) => void;
};

function WorkspaceScopeSlider({
  disabled,
  options,
  selectedValue,
  onChange,
}: WorkspaceScopeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selectedValue),
  );
  const selectedOption = options[selectedIndex] ?? options[0];
  const SelectedIcon = selectedOption.Icon;
  const selectedPoint = getSliderPoint(selectedIndex, options.length);
  const sliderStyle = {
    '--workspace-slider-position': `${selectedPoint.x}%`,
    '--workspace-slider-stone-top': `${selectedPoint.stoneY}%`,
  } as CSSProperties;

  function handleTrackPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    updateSelectionFromClientX(event.clientX);
  }

  function handleTrackPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (disabled || event.buttons !== 1) {
      return;
    }

    updateSelectionFromClientX(event.clientX);
  }

  function updateSelectionFromClientX(clientX: number) {
    const track = trackRef.current;

    if (!track || options.length === 0) {
      return;
    }

    const rect = track.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const pointerPosition = ratio * 100;
    const nextIndex = getNearestSliderPointIndex(pointerPosition, options.length);
    const nextOption = options[nextIndex];

    if (nextOption && nextOption.value !== selectedValue) {
      onChange(nextOption.value);
    }
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    optionIndex: number,
  ) {
    const keyDirection = getWorkspaceSliderKeyDirection(event.key);

    if (keyDirection === null) {
      return;
    }

    event.preventDefault();

    const nextIndex =
      keyDirection === 'first'
        ? 0
        : keyDirection === 'last'
          ? options.length - 1
          : clamp(optionIndex + keyDirection, 0, options.length - 1);
    const nextOption = options[nextIndex];

    if (nextOption) {
      onChange(nextOption.value);
    }
  }

  return (
    <div className="workspace-scope-slider">
      <span className="workspace-scope-slider__eyebrow">Arbeidsflate</span>
      <strong className="workspace-scope-slider__name" title={selectedOption.label}>
        {selectedOption.label}
      </strong>

      <div
        className="workspace-scope-slider__track"
        ref={trackRef}
        role="radiogroup"
        aria-label="Velg arbeidsflate"
        aria-disabled={disabled}
        style={sliderStyle}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
      >
        <img
          className="workspace-scope-slider__mountains"
          src={workspaceSliderMountains}
          alt=""
          aria-hidden="true"
          draggable={false}
        />

        <div className="workspace-scope-slider__stone" aria-hidden="true">
          <img src={workspaceSliderStone} alt="" draggable={false} />
          <SelectedIcon
            className="workspace-scope-slider__stone-symbol"
            size={18}
            strokeWidth={2.15}
          />
        </div>

        {options.map((option, index) => {
          const point = getSliderPoint(index, options.length);

          return (
            <button
              className="workspace-scope-slider__option"
              type="button"
              role="radio"
              aria-checked={option.value === selectedValue}
              aria-label={option.label}
              disabled={disabled}
              key={option.value}
              tabIndex={option.value === selectedValue ? 0 : -1}
              title={option.label}
              style={
                {
                  '--workspace-option-position': `${point.x}%`,
                  '--workspace-option-top': `${point.y}%`,
                } as CSSProperties
              }
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
            />
          );
        })}
      </div>
    </div>
  );
}

function getWorkspaceIcon(workspaceId: string) {
  return workspaceIconOptions[
    hashWorkspaceId(workspaceId) % workspaceIconOptions.length
  ];
}

function hashWorkspaceId(workspaceId: string) {
  let hash = 0;

  for (let index = 0; index < workspaceId.length; index += 1) {
    hash = (hash * 31 + workspaceId.charCodeAt(index)) >>> 0;
  }

  return hash;
}

type WorkspaceSliderPoint = {
  x: number;
  y: number;
  stoneY: number;
};

const workspaceSliderPeaks: WorkspaceSliderPoint[] = [
  { x: 15.2, y: 52.7, stoneY: 45.5 },
  { x: 31.6, y: 36.5, stoneY: 31 },
  { x: 50.9, y: 27.3, stoneY: 23 },
  { x: 69.5, y: 48.9, stoneY: 42 },
  { x: 86, y: 54.6, stoneY: 47 },
];

function getSliderPoint(index: number, optionCount: number) {
  const points = getSliderPoints(optionCount);

  return points[clamp(index, 0, points.length - 1)] ?? points[0];
}

function getNearestSliderPointIndex(pointerPosition: number, optionCount: number) {
  const points = getSliderPoints(optionCount);
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  points.forEach((point, index) => {
    const distance = Math.abs(point.x - pointerPosition);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function getSliderPoints(optionCount: number) {
  const normalizedOptionCount = clamp(
    optionCount,
    1,
    maxSliderWorkspaceOptions,
  );

  return workspaceSliderPeaks.slice(0, normalizedOptionCount);
}

function getWorkspaceSliderKeyDirection(key: string) {
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return -1;
  }

  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return 1;
  }

  if (key === 'Home') {
    return 'first';
  }

  if (key === 'End') {
    return 'last';
  }

  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
