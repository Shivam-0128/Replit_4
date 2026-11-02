import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetMe, getGetMeQueryKey, type User } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import AuthPage from '@/pages/auth';
import MyHabits from '@/pages/my-habits';
import Community from '@/pages/community';
import HabitPage from '@/pages/habit';
import { Shell, Mark } from '@/components/shell';
import { isUnauthorized } from '@/lib/habit-utils';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => !isUnauthorized(err) && count < 2,
      staleTime: 10_000,
    },
  },
});

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => setLocation(to, { replace: true }), [to, setLocation]);
  return null;
}

function Loading() {
  return (
    <div className="min-h-[100dvh] grid place-items-center text-primary">
      <Mark className="w-10 h-10 animate-pulse" />
    </div>
  );
}

function Router() {
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 60_000 } });
  const [loc] = useLocation();
  useEffect(() => {
    const page = loc === '/sign-up' ? 'Sign up' : loc === '/community' ? 'Community' : loc === '/my-habits' ? 'My habits' : loc.startsWith('/habits/') ? 'Habit progress' : 'Sign in';
    document.title = `${page} · Habit Circle`;
  }, [loc]);

  if (me.isLoading) return <Loading />;
  if (me.isError && !isUnauthorized(me.error)) {
    return <div className="min-h-[100dvh] grid place-items-center"><div className="text-center">
      <p>Your account could not be loaded.</p>
      <button className="mt-4 text-primary underline" onClick={() => me.refetch()}>Try again</button>
    </div></div>;
  }
  const user: User | undefined = me.data;

  if (!user) {
    return (
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/sign-up">{() => <AuthPage mode="signup" />}</Route>
          <Route path="/sign-in">{() => <AuthPage mode="signin" />}</Route>
          <Route path="/">{() => <AuthPage mode="signin" />}</Route>
          <Route>{() => <Redirect to="/sign-in" />}</Route>
        </Switch>
      </RoutedErrorBoundary>
    );
  }

  if (loc === '/' || loc === '/sign-in' || loc === '/sign-up') return <Redirect to="/my-habits" />;

  return (
    <Shell user={user}>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/my-habits" component={MyHabits} />
          <Route path="/community" component={Community} />
          <Route path="/habits/:id">{() => <HabitPage user={user} />}</Route>
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
