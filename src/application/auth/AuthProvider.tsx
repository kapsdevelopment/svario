import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  bootstrapDomainAccount,
  getCurrentSession,
  hasAuthClient,
  signInWithMagicLink as signInWithMagicLinkRequest,
  signInWithPassword as signInWithPasswordRequest,
  signOut as signOutRequest,
  signUpWithPassword as signUpWithPasswordRequest,
  subscribeToAuthChanges,
  type DomainAccount,
  updatePassword as updatePasswordRequest,
} from '../../data/auth/authRepository';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'misconfigured';
type BootstrapStatus = 'idle' | 'loading' | 'ready' | 'error';

type AuthState = {
  status: AuthStatus;
  bootstrapStatus: BootstrapStatus;
  session: Session | null;
  user: User | null;
  account: DomainAccount | null;
  errorMessage: string | null;
};

type AuthContextValue = AuthState & {
  isAdminReady: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string,
    redirectTo: string,
  ) => Promise<void>;
  signInWithMagicLink: (email: string, redirectTo: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const initialAuthState: AuthState = {
  status: 'loading',
  bootstrapStatus: 'idle',
  session: null,
  user: null,
  account: null,
  errorMessage: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialAuthState);
  const bootstrapRunRef = useRef(0);

  const setSignedOut = useCallback(() => {
    bootstrapRunRef.current += 1;
    setState({
      status: 'unauthenticated',
      bootstrapStatus: 'idle',
      session: null,
      user: null,
      account: null,
      errorMessage: null,
    });
  }, []);

  const handleSession = useCallback(
    (session: Session | null) => {
      if (!session) {
        setSignedOut();
        return;
      }

      const runId = bootstrapRunRef.current + 1;
      bootstrapRunRef.current = runId;

      setState({
        status: 'authenticated',
        bootstrapStatus: 'loading',
        session,
        user: session.user,
        account: null,
        errorMessage: null,
      });

      void bootstrapDomainAccount(session.user)
        .then((account) => {
          if (bootstrapRunRef.current !== runId) {
            return;
          }

          setState({
            status: 'authenticated',
            bootstrapStatus: 'ready',
            session,
            user: session.user,
            account,
            errorMessage:
              account.status === 'active' ? null : 'Kontoen er ikke aktiv.',
          });
        })
        .catch((error: unknown) => {
          if (bootstrapRunRef.current !== runId) {
            return;
          }

          setState({
            status: 'authenticated',
            bootstrapStatus: 'error',
            session,
            user: session.user,
            account: null,
            errorMessage: getErrorMessage(error),
          });
        });
    },
    [setSignedOut],
  );

  useEffect(() => {
    if (!hasAuthClient()) {
      setState({
        status: 'misconfigured',
        bootstrapStatus: 'idle',
        session: null,
        user: null,
        account: null,
        errorMessage: 'Supabase-miljøvariabler mangler.',
      });
      return;
    }

    let isActive = true;
    getCurrentSession()
      .then((session) => {
        if (isActive) {
          handleSession(session);
        }
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setState({
          status: 'unauthenticated',
          bootstrapStatus: 'error',
          session: null,
          user: null,
          account: null,
          errorMessage: getErrorMessage(error),
        });
      });

    const unsubscribe = subscribeToAuthChanges((_event, session) => {
      handleSession(session);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [handleSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAdminReady:
        state.status === 'authenticated' &&
        state.bootstrapStatus === 'ready' &&
        state.account?.status === 'active',
      signInWithPassword: signInWithPasswordRequest,
      signUpWithPassword: signUpWithPasswordRequest,
      signInWithMagicLink: signInWithMagicLinkRequest,
      updatePassword: updatePasswordRequest,
      signOut: signOutRequest,
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth må brukes inni AuthProvider.');
  }

  return value;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Noe gikk galt med autentisering.';
}
