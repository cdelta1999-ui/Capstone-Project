import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import InsightReport from "@/pages/InsightReport";
import Nav from "@/components/Nav";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <div className="relative min-h-[100dvh] text-slate-900 font-sans flex flex-col overflow-x-hidden">
      <div className="app-aurora" aria-hidden="true">
        <span className="aurora-blob blob-a" />
        <span className="aurora-blob blob-b" />
        <span className="aurora-blob blob-c" />
        <span className="aurora-blob blob-d" />
      </div>
      <Nav />
      <main className="relative z-10 flex-1">
        <Switch>
          <Route path="/" component={() => <Redirect to="/dashboard" />} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/insights" component={InsightReport} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
