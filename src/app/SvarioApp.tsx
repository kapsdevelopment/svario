import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from '../application/auth/AuthProvider';
import { WorkspaceScopeProvider } from '../application/workspaces/WorkspaceScopeProvider';
import { router } from './router';

const queryClient = new QueryClient();

export function SvarioApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceScopeProvider>
          <RouterProvider router={router} />
        </WorkspaceScopeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
