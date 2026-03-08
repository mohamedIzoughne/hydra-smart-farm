import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/smart/AppLayout";
import Dashboard from "./pages/Dashboard";
import AgriculteursList from "./pages/AgriculteursList";
import AgriculteurDetail from "./pages/AgriculteurDetail";
import CulturesList from "./pages/CulturesList";
import ParcellesList from "./pages/ParcellesList";
import ParcelleDetail from "./pages/ParcelleDetail";
import MesuresPage from "./pages/MesuresPage";
import AlertesPage from "./pages/AlertesPage";
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/agriculteurs" element={<AgriculteursList />} />
            <Route path="/agriculteurs/:id" element={<AgriculteurDetail />} />
            <Route path="/cultures" element={<CulturesList />} />
            <Route path="/parcelles" element={<ParcellesList />} />
            <Route path="/parcelles/:id" element={<ParcelleDetail />} />
            <Route path="/mesures" element={<MesuresPage />} />
            <Route path="/alertes" element={<AlertesPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
