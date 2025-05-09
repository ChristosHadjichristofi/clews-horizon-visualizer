import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Index from "./pages/Index";
import Energy from "./pages/Energy";
import Transport from "./pages/Transport";
import Buildings from "./pages/Buildings";
import Industry from "./pages/Industry";
import Overarching from "./pages/Overarching";
import Land from "./pages/Land";
import Water from "./pages/Water";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/energy" element={<Energy />} />
            <Route path="/transport" element={<Transport />} />
            <Route path="/buildings" element={<Buildings />} />
            <Route path="/industry" element={<Industry />} />
            <Route path="/overarching" element={<Overarching />} />
            <Route path="/land" element={<Land />} />
            <Route path="/water" element={<Water />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
