import { lazy, type ComponentType } from 'react';

const reloadAttemptKey = 'svario:route-chunk-reload-attempted-at';
const reloadAttemptWindowMs = 60_000;

let isReloadingAfterRouteLoadError = false;

export function lazyRoute<TModule extends Record<string, unknown>>(
  importModule: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return lazy(async () => {
    try {
      const module = await importModule();
      clearRouteLoadReloadAttempt();

      return {
        default: module[exportName] as ComponentType,
      };
    } catch (error) {
      if (
        isRouteLoadError(error) &&
        !isReloadingAfterRouteLoadError &&
        markRouteLoadReloadAttempt()
      ) {
        isReloadingAfterRouteLoadError = true;
        window.location.reload();

        return new Promise<{ default: ComponentType }>(() => undefined);
      }

      throw error;
    }
  });
}

export function isRouteLoadError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('chunkloaderror') ||
    message.includes('loading chunk')
  );
}

function markRouteLoadReloadAttempt() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const lastAttempt = Number(
      window.sessionStorage.getItem(reloadAttemptKey) ?? 0,
    );

    if (Date.now() - lastAttempt < reloadAttemptWindowMs) {
      return false;
    }

    window.sessionStorage.setItem(reloadAttemptKey, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

function clearRouteLoadReloadAttempt() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(reloadAttemptKey);
  } catch {
    // The route error boundary still gives the user a manual reload path.
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
