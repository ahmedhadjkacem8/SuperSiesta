import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Reorder, useDragControls } from "framer-motion";
import { Pencil, Trash2, GripVertical, Plus, Save, Image as ImageIcon, Layout, List, Columns } from "lucide-react";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";
import { confirmDelete } from "@/lib/swal";
import ImageUpload from "@/components/ImageUpload";

import { useAboutSections } from "@/hooks/useAboutSections";
import { useQueryClient } from "@tanstack/react-query";

interface AboutSection {
  id: number;
  type: 'standard' | 'cards' | 'stats';
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  items: any[] | null;
  sort_order: number;
  is_active: boolean;
}

export default function AdminAPropos() {
  const queryClient = useQueryClient();
  const { sections: sectionsFromQuery, isLoading, reorderMutation, deleteMutation } = useAboutSections();
  const [sections, setSections] = useState<AboutSection[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Partial<AboutSection> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // Synchroniser l'état local avec les données de React Query au chargement
  useEffect(() => {
    if (sectionsFromQuery.length > 0) {
      setSections(sectionsFromQuery);
    }
  }, [sectionsFromQuery]);

  const isInitialMount = useRef(true);

  const handleReorder = (newOrder: AboutSection[]) => {
    setSections(newOrder);
  };

  // Enregistrer l'ordre seulement quand il change
  useEffect(() => {
    if (isLoading || sections.length === 0) return;
    
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      reorderMutation.mutate(sections.map(s => s.id));
      console.log("[AdminAPropos] Synchro de l'ordre initiée", sections.map(s => s.id));
    }, 500);

    return () => clearTimeout(timer);
  }, [sections]);

  const handleOpenDialog = (section?: AboutSection) => {
    if (section) {
      setEditingSection(section);
      setImagePreview(section.image_url || "");
    } else {
      setEditingSection({
        type: 'standard', title: '', subtitle: '', description: '', items: [], is_active: true
      });
      setImagePreview("");
    }
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingSection) return;

    const formData = new FormData();
    formData.append('type', editingSection.type || 'standard');
    formData.append('title', editingSection.title || '');
    formData.append('subtitle', editingSection.subtitle || '');
    formData.append('description', editingSection.description || '');
    formData.append('is_active', String(editingSection.is_active));
    
    if (editingSection.items) formData.append('items', JSON.stringify(editingSection.items));
    if (imageFile) formData.append('image_url', imageFile);

    try {
      if (editingSection.id) {
        formData.append('_method', 'PUT');
        await api.post(`/about-sections/${editingSection.id}`, formData);
        toast.success("Section mise à jour");
      } else {
        await api.post("/about-sections", formData);
        toast.success("Section créée");
      }
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["about-sections"] });
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDelete("Supprimer cette section ?", "Cette action est irréversible."))) return;
    deleteMutation.mutate(id);
  };

  const addItem = () => {
    const newItem = editingSection?.type === 'stats' 
      ? { num: '', label: '' } 
      : { icon: 'Star', title: '', desc: '' };
    
    setEditingSection({
      ...editingSection,
      items: [...(editingSection?.items || []), newItem]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...(editingSection?.items || [])];
    newItems.splice(index, 1);
    setEditingSection({ ...editingSection, items: newItems });
  };

  const updateItem = (index: number, key: string, value: string) => {
    const newItems = [...(editingSection?.items || [])];
    newItems[index] = { ...newItems[index], [key]: value };
    setEditingSection({ ...editingSection, items: newItems });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Gestion Page À Propos</h1>
          <p className="text-muted-foreground mt-1 text-sm">Organisez les sections de votre page via glisser-déposer.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90 rounded-2xl px-6">
          <Plus className="w-5 h-5 mr-2" /> Ajouter une section
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">Chargement...</div>
      ) : (
        <Reorder.Group axis="y" values={sections} onReorder={handleReorder} className="space-y-4">
          {sections.map((section) => (
            <Reorder.Item 
              key={section.id} 
              value={section}
              className="bg-card border border-border rounded-3xl p-4 flex items-center gap-4 group hover:shadow-lg transition-all"
            >
              <div className="cursor-grab active:cursor-grabbing text-muted-foreground group-hover:text-primary transition-colors">
                <GripVertical className="w-6 h-6" />
              </div>
              
              <div className="w-16 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/50">
                {section.image_url ? (
                  <img src={section.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                    {section.type === 'standard' ? <ImageIcon className="w-6 h-6" /> : <List className="w-6 h-6" />}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {section.type}
                  </span>
                  {!section.is_active && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                      Inactif
                    </span>
                  )}
                </div>
                <h3 className="font-bold truncate mt-1">
                  {section.title || <span className="text-muted-foreground italic">Sans titre</span>}
                </h3>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(section)} className="rounded-xl">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(section.id)} className="rounded-xl text-destructive hover:text-destructive/80">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Reorder.Item>
          ))}
          {sections.length === 0 && (
            <div className="text-center py-20 bg-muted/20 border-2 border-dashed border-border rounded-[2rem] text-muted-foreground">
              Aucune section pour le moment.
            </div>
          )}
        </Reorder.Group>
      )}

      {/* Dialog Ajout/Edition */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {editingSection?.id ? "Modifier la section" : "Nouvelle section"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Type de section</label>
                <Select 
                  value={editingSection?.type} 
                  onValueChange={(val: any) => setEditingSection({ ...editingSection!, type: val, items: [] })}
                >
                  <SelectTrigger className="rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="standard">Standard (Texte + Image)</SelectItem>
                    <SelectItem value="cards">Grille de Cartes</SelectItem>
                    <SelectItem value="stats">Statistiques</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Statut</label>
                <Select 
                  value={editingSection?.is_active ? "active" : "inactive"} 
                  onValueChange={(val) => setEditingSection({ ...editingSection!, is_active: val === "active" })}
                >
                  <SelectTrigger className="rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Masqué</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">Titre principal</label>
              <Input 
                value={editingSection?.title || ""} 
                onChange={(e) => setEditingSection({ ...editingSection!, title: e.target.value })}
                className="rounded-xl border-2"
                placeholder="Ex: Notre Histoire"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">Sous-titre (Badge)</label>
              <Input 
                value={editingSection?.subtitle || ""} 
                onChange={(e) => setEditingSection({ ...editingSection!, subtitle: e.target.value })}
                className="rounded-xl border-2"
                placeholder="Ex: Excellence"
              />
            </div>

            {editingSection?.type === 'standard' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Description / Contenu</label>
                  <Textarea 
                    value={editingSection?.description || ""} 
                    onChange={(e) => setEditingSection({ ...editingSection!, description: e.target.value })}
                    className="rounded-xl border-2 min-h-[150px]"
                    placeholder="Le texte de votre section..."
                  />
                </div>
                <ImageUpload 
                  value={imageFile}
                  onChange={setImageFile}
                  preview={imagePreview}
                  label="Image d'illustration"
                  placeholder="Glissez ou cliquez pour changer l'image"
                />
              </>
            )}

            {(editingSection?.type === 'cards' || editingSection?.type === 'stats') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold">Items de la grille</label>
                  <Button type="button" size="sm" onClick={addItem} className="rounded-lg h-8">
                    <Plus className="w-4 h-4 mr-1" /> Ajouter item
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {editingSection.items?.map((item, idx) => (
                    <div key={idx} className="bg-muted/30 p-4 rounded-2xl border border-border relative group">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(idx)}
                        className="absolute -top-2 -right-2 bg-background border border-border rounded-full w-6 h-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>

                      <div className="grid grid-cols-2 gap-3">
                        {editingSection.type === 'stats' ? (
                          <>
                            <Input 
                              value={item.num} 
                              onChange={(e) => updateItem(idx, 'num', e.target.value)}
                              placeholder="Nombre (ex: 30+)"
                              className="rounded-lg h-9 border-2"
                            />
                            <Input 
                              value={item.label} 
                              onChange={(e) => updateItem(idx, 'label', e.target.value)}
                              placeholder="Libellé (ex: Années)"
                              className="rounded-lg h-9 border-2"
                            />
                          </>
                        ) : (
                          <>
                            <div className="col-span-2 grid grid-cols-2 gap-3">
                               <Input 
                                value={item.title} 
                                onChange={(e) => updateItem(idx, 'title', e.target.value)}
                                placeholder="Titre de la carte"
                                className="rounded-lg h-9 border-2"
                              />
                               <Input 
                                value={item.icon} 
                                onChange={(e) => updateItem(idx, 'icon', e.target.value)}
                                placeholder="Icône (ex: Heart, Shield)"
                                className="rounded-lg h-9 border-2"
                              />
                            </div>
                            <Textarea 
                              value={item.desc} 
                              onChange={(e) => updateItem(idx, 'desc', e.target.value)}
                              placeholder="Description courte..."
                              className="col-span-2 rounded-lg h-20 border-2"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!editingSection.items || editingSection.items.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-4 italic">Aucun item ajouté.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="sticky bottom-0 bg-background pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 rounded-xl px-8">
              <Save className="w-4 h-4 mr-2" /> Enregistrer la section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
