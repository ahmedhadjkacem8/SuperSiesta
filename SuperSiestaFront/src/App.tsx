import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/hooks/useAuthSecure";
import { AdminNotificationProvider } from "@/context/AdminNotificationContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import Index from "./pages/Index";
import Boutique from "./pages/Boutique";
import ProduitDetail from "./pages/ProduitDetail";
import Commander from "./pages/Commander";
import Connexion from "./pages/Connexion";
import MonCompte from "./pages/MonCompte";
import APropos from "./pages/APropos";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProduits from "./pages/admin/AdminProduits";
import AdminClients from "./pages/admin/AdminClients";
import AdminDevis from "./pages/admin/AdminDevis";
// import AdminFactures from "./pages/admin/AdminFactures";
// import AdminTresorerie from "./pages/admin/AdminTresorerie";
import AdminCMS from "./pages/admin/AdminCMS";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminShowrooms from "./pages/admin/AdminShowrooms";
import AdminAPropos from "./pages/admin/AdminAPropos";
import AdminCommandes from "./pages/admin/AdminCommandes";
import AdminHeroSlides from "./pages/admin/AdminHeroSlides";
import AdminGammes from "./pages/admin/AdminGammes";
import AdminBonLivraison from "./pages/admin/AdminBonLivraison";
import AdminLivreurs from "./pages/admin/AdminLivreurs";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminNewsletter from "./pages/admin/AdminNewsletter";
import GammeDetail from "./pages/GammeDetail";
import Register from "./pages/Register";
import Showrooms from "./pages/Showrooms";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import React from "react";

const queryClient = new QueryClient();

function PublicLayout({ children }: { children: React.ReactNode }) {
  // Ensure we scroll to top on each navigation so the user doesn't stay stuck at footer
  const loc = useLocation();
  React.useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  }, [loc.pathname]);

  return (
    <>
      <Navbar />
      <CartDrawer />
      {children}
      <Footer />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<PublicLayout><Index /></PublicLayout>} />
              <Route path="/boutique" element={<PublicLayout><Boutique /></PublicLayout>} />
              <Route path="/produit/:slug" element={<PublicLayout><ProduitDetail /></PublicLayout>} />
              <Route path="/commander" element={<PublicLayout><Commander /></PublicLayout>} />
              <Route path="/connexion" element={<PublicLayout><Connexion /></PublicLayout>} />
              <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
              <Route path="/mon-compte" element={<PublicLayout><MonCompte /></PublicLayout>} />
              <Route path="/a-propos" element={<PublicLayout><APropos /></PublicLayout>} />
              <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
              <Route path="/blog" element={<PublicLayout><Blog /></PublicLayout>} />
              <Route path="/blog/:slug" element={<PublicLayout><BlogPost /></PublicLayout>} />
              <Route path="/showrooms" element={<PublicLayout><Showrooms /></PublicLayout>} />
              <Route path="/gamme/:slug" element={<PublicLayout><GammeDetail /></PublicLayout>} />

              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/*" element={
                <ProtectedRoute>
                  <AdminNotificationProvider>
                    <Routes>
                      <Route path="/" element={<AdminDashboard />} />
                      <Route path="/commandes" element={<AdminCommandes />} />
                      <Route path="/produits" element={<AdminProduits />} />
                      <Route path="/clients" element={<AdminClients />} />
                      <Route path="/devis" element={<AdminDevis />} />
                      <Route path="/cms" element={<AdminCMS />} />
                      <Route path="/blog" element={<AdminBlog />} />
                      <Route path="/showrooms" element={<AdminShowrooms />} />
                      <Route path="/hero-slides" element={<AdminHeroSlides />} />
                      <Route path="/gammes" element={<AdminGammes />} />
                      <Route path="/a-propos" element={<AdminAPropos />} />
                      <Route path="/bon-livraison" element={<AdminBonLivraison />} />
                      <Route path="/livreurs" element={<AdminLivreurs />} />
                      <Route path="/reviews" element={<AdminReviews />} />
                      <Route path="/settings" element={<AdminSettings />} />
                      <Route path="/newsletter" element={<AdminNewsletter />} />
                    </Routes>
                  </AdminNotificationProvider>
                </ProtectedRoute>
              } />

              <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
