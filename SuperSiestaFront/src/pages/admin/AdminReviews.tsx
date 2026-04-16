import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, Trash2, Eye, EyeOff, User, UserCheck } from "lucide-react";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";
import { confirmDelete } from "@/lib/swal";

interface Review {
  id: number;
  user_id: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  message: string;
  rating: number;
  is_published: boolean;
  created_at: string;
  user?: {
    id: number;
    name: string;
    role: string;
  };
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const data = await api.get<Review[]>("/reviews");
      setReviews(data || []);
    } catch (err) {
      toast.error("Erreur lors du chargement des avis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleTogglePublish = async (id: number) => {
    // Mise à jour locale immédiate pour fluidité visuelle
    setReviews(prev => prev.map(r => r.id === id ? { ...r, is_published: !r.is_published } : r));
    
    try {
      await api.put(`/reviews/${id}/publish`, {});
      toast.success("Statut de publication mis à jour");
      fetchReviews(); // Recharge réelle pour confirmer avec le serveur
    } catch {
      toast.error("Erreur technique lors de la mise à jour");
      fetchReviews(); // Revenir à l'état réel si erreur
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDelete("Supprimer ce message ?", "Cette action est irréversible."))) return;
    try {
      await api.delete(`/reviews/${id}`);
      toast.success("Supprimé");
      fetchReviews();
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Avis & Messages Clients</h1>
          <p className="text-sm text-muted-foreground">Gérez les témoignages et les contacts depuis le site</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Auteur</TableHead>
              <TableHead>Détails</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((r) => (
              <TableRow key={r.id} className={r.is_published ? "bg-blue-50/20" : ""}>
                <TableCell className="text-xs">
                  {new Date(r.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 font-bold">
                      {r.user_id ? (
                        <span className="flex items-center gap-1 text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full uppercase font-black tracking-tighter shadow-sm">
                          <UserCheck className="w-2.5 h-2.5" /> Client
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full uppercase font-black tracking-tighter">
                          <User className="w-2.5 h-2.5" /> Anonyme
                        </span>
                      )}
                      <span className="truncate max-w-[120px]">{r.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{r.email}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{r.phone}</span>
                    {r.city && <span className="text-[10px] font-bold text-primary">{r.city}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-xs italic text-foreground/80 line-clamp-3 max-w-[300px]">"{r.message}"</p>
                </TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400 font-bold' : 'text-gray-200'}`} />
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {r.is_published ? (
                    <div className="flex items-center gap-1 text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase shadow-sm">
                       <Eye className="w-2.5 h-2.5" /> Publié
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-black uppercase">
                       <EyeOff className="w-2.5 h-2.5" /> Privé
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button 
                      variant={r.is_published ? "default" : "outline"}
                      size="icon" 
                      className={`h-8 w-8 ${r.is_published ? 'bg-blue-600 hover:bg-blue-700' : 'hover:border-blue-400 hover:text-blue-500'}`}
                      onClick={() => handleTogglePublish(r.id)}
                      title={r.is_published ? "Masquer du site" : "Diffuser sur le site"}
                    >
                      {r.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && reviews.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Aucun message pour le moment</TableCell></TableRow>
            )}
            {loading && (
              <TableRow><TableCell colSpan={6} className="text-center py-12">Chargement...</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
