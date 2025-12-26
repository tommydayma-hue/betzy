import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";

// Lazy load all other pages for code splitting
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CoinFlip = lazy(() => import("./pages/CoinFlip"));
const Matches = lazy(() => import("./pages/Matches"));
const Deposit = lazy(() => import("./pages/Deposit"));
const Withdraw = lazy(() => import("./pages/Withdraw"));
const History = lazy(() => import("./pages/History"));
const BettingHistory = lazy(() => import("./pages/BettingHistory"));
const Rules = lazy(() => import("./pages/Rules"));
const Support = lazy(() => import("./pages/Support"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminDeposits = lazy(() => import("./pages/admin/AdminDeposits"));
const AdminWithdrawals = lazy(() => import("./pages/admin/AdminWithdrawals"));
const AdminMatches = lazy(() => import("./pages/admin/AdminMatches"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminTickets = lazy(() => import("./pages/admin/AdminTickets"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/coinflip" element={<CoinFlip />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/deposit" element={<Deposit />} />
              <Route path="/withdraw" element={<Withdraw />} />
              <Route path="/history" element={<History />} />
              <Route path="/betting-history" element={<BettingHistory />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/support" element={<Support />} />
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/deposits" element={<AdminDeposits />} />
              <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
              <Route path="/admin/matches" element={<AdminMatches />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/tickets" element={<AdminTickets />} />
              <Route path="/admin/notifications" element={<AdminNotifications />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
