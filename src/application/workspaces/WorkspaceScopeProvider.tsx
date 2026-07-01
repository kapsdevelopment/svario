import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '../auth/AuthProvider';
import type { WorkspaceWithMembership } from '../../domain/workspaces/workspace';
import { useWorkspaces } from './useWorkspaces';

export type WorkspaceScope =
  | { type: 'personal' }
  | { type: 'workspace'; workspaceId: string };

type WorkspaceScopeContextValue = {
  scope: WorkspaceScope;
  workspaceId: string | null;
  workspaceLabel: string;
  selectedWorkspace: WorkspaceWithMembership | null;
  workspaces: WorkspaceWithMembership[];
  hasWorkspaceChoices: boolean;
  isLoading: boolean;
  setScope: (scope: WorkspaceScope) => void;
};

const personalScope: WorkspaceScope = { type: 'personal' };
const workspaceScopeStoragePrefix = 'svario:workspace-scope';
const WorkspaceScopeContext = createContext<WorkspaceScopeContextValue | null>(
  null,
);

export function WorkspaceScopeProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const accountId = auth.account?.id ?? null;
  const workspacesQuery = useWorkspaces(accountId);
  const workspaces = workspacesQuery.data ?? [];
  const storageKey = accountId
    ? `${workspaceScopeStoragePrefix}:${accountId}`
    : null;
  const [scope, setScopeState] = useState<WorkspaceScope>(personalScope);

  useEffect(() => {
    if (!storageKey) {
      setScopeState(personalScope);
      return;
    }

    setScopeState(readStoredWorkspaceScope(storageKey) ?? personalScope);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || workspacesQuery.isLoading) {
      return;
    }

    setScopeState((currentScope) => {
      const normalizedScope = normalizeWorkspaceScope(currentScope, workspaces);

      if (!isSameWorkspaceScope(currentScope, normalizedScope)) {
        writeStoredWorkspaceScope(storageKey, normalizedScope);
      }

      return normalizedScope;
    });
  }, [storageKey, workspaces, workspacesQuery.isLoading]);

  const setScope = useCallback(
    (nextScope: WorkspaceScope) => {
      const normalizedScope = normalizeWorkspaceScope(nextScope, workspaces);
      setScopeState(normalizedScope);

      if (storageKey) {
        writeStoredWorkspaceScope(storageKey, normalizedScope);
      }
    },
    [storageKey, workspaces],
  );

  const selectedWorkspace = useMemo(
    () =>
      scope.type === 'workspace'
        ? workspaces.find((workspace) => workspace.id === scope.workspaceId) ??
          null
        : null,
    [scope, workspaces],
  );
  const value = useMemo<WorkspaceScopeContextValue>(() => {
    const workspaceId = scope.type === 'workspace' ? scope.workspaceId : null;

    return {
      scope,
      workspaceId,
      workspaceLabel: selectedWorkspace?.name ?? 'Personlig',
      selectedWorkspace,
      workspaces,
      hasWorkspaceChoices: workspaces.length > 0,
      isLoading: workspacesQuery.isLoading,
      setScope,
    };
  }, [scope, selectedWorkspace, setScope, workspaces, workspacesQuery.isLoading]);

  return (
    <WorkspaceScopeContext.Provider value={value}>
      {children}
    </WorkspaceScopeContext.Provider>
  );
}

export function useWorkspaceScope() {
  const value = useContext(WorkspaceScopeContext);

  if (!value) {
    throw new Error('useWorkspaceScope must be used within WorkspaceScopeProvider.');
  }

  return value;
}

function normalizeWorkspaceScope(
  scope: WorkspaceScope,
  workspaces: WorkspaceWithMembership[],
): WorkspaceScope {
  if (scope.type === 'personal') {
    return personalScope;
  }

  return workspaces.some((workspace) => workspace.id === scope.workspaceId)
    ? scope
    : personalScope;
}

function isSameWorkspaceScope(
  firstScope: WorkspaceScope,
  secondScope: WorkspaceScope,
) {
  if (firstScope.type !== secondScope.type) {
    return false;
  }

  if (firstScope.type === 'personal') {
    return true;
  }

  return (
    firstScope.type === 'workspace' &&
    secondScope.type === 'workspace' &&
    firstScope.workspaceId === secondScope.workspaceId
  );
}

function readStoredWorkspaceScope(storageKey: string): WorkspaceScope | null {
  try {
    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<WorkspaceScope>;

    if (parsedValue.type === 'personal') {
      return personalScope;
    }

    if (
      parsedValue.type === 'workspace' &&
      typeof parsedValue.workspaceId === 'string'
    ) {
      return {
        type: 'workspace',
        workspaceId: parsedValue.workspaceId,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function writeStoredWorkspaceScope(
  storageKey: string,
  scope: WorkspaceScope,
) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(scope));
  } catch {
    return;
  }
}
