import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider, AdminLanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/hooks/useAuthSecure";
import { AdminNotificationProvider } from "@/context/AdminNotificationContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import Index from "./pages/Index";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import React, { lazy, Suspense } from "react";

const Boutique = lazy(() => import("./pages/Boutique"));
const ProduitDetail = lazy(() => import("./pages/ProduitDetail"));
const Commander = lazy(() => import("./pages/Commander"));
const Connexion = lazy(() => import("./pages/Connexion"));
const MonCompte = lazy(() => import("./pages/MonCompte"));
const APropos = lazy(() => import("./pages/APropos"));
const Contact = lazy(() => import("./pages/Contact"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProduits = lazy(() => import("./pages/admin/AdminProduits"));
const AdminClients = lazy(() => import("./pages/admin/AdminClients"));
const AdminDevis = lazy(() => import("./pages/admin/AdminDevis"));
const AdminCMS = lazy(() => import("./pages/admin/AdminCMS"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminShowrooms = lazy(() => import("./pages/admin/AdminShowrooms"));
const AdminAPropos = lazy(() => import("./pages/admin/AdminAPropos"));
const AdminCommandes = lazy(() => import("./pages/admin/AdminCommandes"));
const AdminHeroSlides = lazy(() => import("./pages/admin/AdminHeroSlides"));
const AdminGammes = lazy(() => import("./pages/admin/AdminGammes"));
const AdminBonLivraison = lazy(() => import("./pages/admin/AdminBonLivraison"));
const AdminLivreurs = lazy(() => import("./pages/admin/AdminLivreurs"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminNewsletter = lazy(() => import("./pages/admin/AdminNewsletter"));
const AdminAdministrateurs = lazy(() => import("./pages/admin/AdminAdministrateurs"));
const AdminProspects = lazy(() => import("./pages/admin/AdminProspects"));
const GammeDetail = lazy(() => import("./pages/GammeDetail"));
const Register = lazy(() => import("./pages/Register"));
const Showrooms = lazy(() => import("./pages/Showrooms"));
const SeoPanel = lazy(() => import("./pages/admin/SeoPanel"));

const queryClient = new QueryClient();

import { usePageViewTracking } from "@/hooks/usePageViewTracking";
import { initAdvancedMatching } from "@/services/metaPixel";
import { initAdsAttribution } from "@/services/adsAttribution";
import { useAuth } from "@/hooks/useAuthSecure";

function PageViewTracker() {
  usePageViewTracking();
  const { user } = useAuth();

  React.useEffect(() => {
    initAdsAttribution();
  }, []);

  React.useEffect(() => {
    if (user) {
      const nameParts = (user.name || "").split(" ");
      initAdvancedMatching({
        email: user.email,
        phone: user.profile?.phone,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" "),
      });
    }
  }, [user]);

  return null;
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (loc.hash) {
        document.getElementById(loc.hash.slice(1))?.scrollIntoView({ block: "start" });
        return;
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [loc.pathname, loc.hash]);

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
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <PageViewTracker />
            <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
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
              <Route path="/mentions-legales" element={<PublicLayout><MentionsLegales /></PublicLayout>} />
              <Route path="/blog" element={<PublicLayout><Blog /></PublicLayout>} />
              <Route path="/blog/:slug" element={<PublicLayout><BlogPost /></PublicLayout>} />
              <Route path="/showrooms" element={<PublicLayout><Showrooms /></PublicLayout>} />
              <Route path="/gamme/:slug" element={<PublicLayout><GammeDetail /></PublicLayout>} />

              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/*" element={
                <AdminLanguageProvider>
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
                        <Route path="/administrateurs" element={<AdminAdministrateurs />} />
                        <Route path="/prospects" element={<AdminProspects />} />
                        <Route path="/Seo" element={<SeoPanel />} />

                      </Routes>
                    </AdminNotificationProvider>
                  </ProtectedRoute>
                </AdminLanguageProvider>
              } />

              <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  </TooltipProvider>
</QueryClientProvider>
);

export default App;
