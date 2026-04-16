import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthSecure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, isAdmin, isLoading, login, register } = useAuth();
  const navigate = useNavigate();

  // Redirect when authenticated admin
  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [user, isAdmin, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignUp) {
        const result = await register(email, password, fullName, "", "btoc");
        if (!result.success) {
          throw new Error(result.error?.message || "Erreur d'inscription");
        }
        toast.success("Compte créé ! Contactez l'admin pour obtenir l'accès.");
      } else {
        const result = await login(email, password);
        if (!result.success) {
          throw new Error(result.error?.message || "Erreur de connexion");
        }
        toast.success("Connexion réussie !");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isSignUp ? "Créer un compte" : "Administration"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Inscrivez-vous pour demander l'accès" : "Connectez-vous au back-office"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <Input
                placeholder="Nom complet"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "..." : isSignUp ? "S'inscrire" : "Se connecter"}
            </Button>
          </form>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-4 text-sm text-primary hover:underline w-full text-center block"
          >
            {isSignUp ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
