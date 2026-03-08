import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/smart/AppLayout";
import { RequireAuth, RedirectIfAuth } from "@/components/smart/RequireAuth";
import Dashboard from "./pages/Dashboard";
import CulturesList from "./pages/CulturesList";
import ParcellesList from "./pages/ParcellesList";
import ParcelleDetail from "./pages/ParcelleDetail";
import MesuresPage from "./pages/MesuresPage";
import AlertesPage from "./pages/AlertesPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
            <Route path="/signup" element={<RedirectIfAuth><SignupPage /></RedirectIfAuth>} />

            {/* Protected */}
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/cultures" element={<RequireAuth><CulturesList /></RequireAuth>} />
            <Route path="/parcelles" element={<RequireAuth><ParcellesList /></RequireAuth>} />
            <Route path="/parcelles/:id" element={<RequireAuth><ParcelleDetail /></RequireAuth>} />
            <Route path="/mesures" element={<RequireAuth><MesuresPage /></RequireAuth>} />
            <Route path="/alertes" element={<RequireAuth><AlertesPage /></RequireAuth>} />
            <Route path="/profil" element={<RequireAuth><ProfilePage /></RequireAuth>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
