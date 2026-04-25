import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Trash2, Edit, MapPin, Loader2, GripVertical, Clock, Calendar, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { confirmDelete } from "@/lib/swal";

interface Showroom {
  id: string;
  name: string;
  contact_person_name: string | null;
  contact_person_phone: string | null;
  contact_person_email: string | null;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  opening_hours: string | null;
  opening_hours_from: string | null;
  opening_hours_until: string | null;
  opening_days: Record<string, boolean> | null;
  google_maps_url: string | null;
  image_url: string | null;
  images: string[] | null;
  lat: number | null;
  lng: number | null;
  sort_order: number;
}

const villes = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan",
  "Bizerte", "Béja", "Jendouba", "Le Kef", "Siliana", "Sousse",
  "Monastir", "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid",
  "Gabès", "Médenine", "Tataouine", "Gafsa", "Tozeur", "Kébili",
];

const DAYS_FR: Record<string, string> = {
  mon: "Lundi",
  tue: "Mardi",
  wed: "Mercredi",
  thu: "Jeudi",
  fri: "Vendredi",
  sat: "Samedi",
  sun: "Dimanche"
};

export default function AdminShowrooms() {
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Showroom | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [removed_images, setRemovedImages] = useState<string[]>([]);
  
  const [form, setForm] = useState({
    name: "",
    contact_person_name: "",
    contact_person_phone: "",
    contact_person_email: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    opening_hours_from: "08:00",
    opening_hours_until: "19:00",
    opening_days: {
      mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false
    } as Record<string, boolean>,
    google_maps_url: "",
    lat: "" as string | number,
    lng: "" as string | number,
    responsible_name: "",
    responsible_phone: "",
    responsible_email: "",
    image_file: null as File | null,
    images_files: [] as File[],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Adding a timestamp prevent browser caching issues
      const resp = await api.get<any>(`/showrooms?t=${Date.now()}`);
      
      // Handle both direct arrays and paginated responses (data.data)
      let items = resp.data || resp;
      if (resp && resp.data && Array.isArray(resp.data)) {
        items = resp.data;
      } else if (resp && Array.isArray(resp)) {
        items = resp;
      } else if (resp && resp.success && resp.data && Array.isArray(resp.data.data)) {
        // If it comes from BaseController/sendResponse with pagination
        items = resp.data.data;
      }
      
      setShowrooms(Array.isArray(items) ? items : []);
      setLoading(false);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des données");
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setForm({
      name: "",
      contact_person_name: "",
      contact_person_phone: "",
      contact_person_email: "",
      address: "",
      city: "",
      phone: "",
      email: "",
      opening_hours_from: "08:00",
      opening_hours_until: "19:00",
      opening_days: {
        mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false
      },
      google_maps_url: "",
      lat: "",
      lng: "",
      responsible_name: "",
      responsible_phone: "",
      responsible_email: "",
      image_file: null,
      images_files: [],
    });
    setEditing(null);
    setRemovedImages([]);
  };

  const handleEdit = (s: Showroom) => {
    let days = s.opening_days;
    if (typeof days === 'string') {
      try { days = JSON.parse(days); } catch (e) { days = null; }
    }

    setEditing(s);
    setRemovedImages([]);
    setForm({
      name: s.name,
      contact_person_name: s.contact_person_name || "",
      contact_person_phone: s.contact_person_phone || "",
      responsible_name: (s as any).responsible_name || "",
      responsible_phone: (s as any).responsible_phone || "",
      responsible_email: (s as any).responsible_email || "",
      contact_person_email: s.contact_person_email || "",
      address: s.address,
      city: s.city,
      phone: s.phone || "",
      email: s.email || "",
      opening_hours_from: s.opening_hours_from || "08:00",
      opening_hours_until: s.opening_hours_until || "19:00",
      opening_days: days || {
        mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false
      },
      google_maps_url: s.google_maps_url || "",
      lat: s.lat || "",
      lng: s.lng || "",
      image_file: null,
      images_files: [],
    });
  };
  const handleSave = async () => {
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("address", form.address);
    formData.append("city", form.city);
    formData.append("opening_hours_from", form.opening_hours_from);
    formData.append("opening_hours_until", form.opening_hours_until);
    formData.append("opening_days", JSON.stringify(form.opening_days));
    
    // Always send contact fields (even empty) so clearing them during edit is persisted to the server
    formData.append("contact_person_name", form.contact_person_name || "");
    formData.append("contact_person_phone", form.contact_person_phone || "");
    if (form.contact_person_email) formData.append("contact_person_email", form.contact_person_email);
    formData.append("responsible_name", form.responsible_name || "");
    formData.append("responsible_phone", form.responsible_phone || "");
    if (form.responsible_email) formData.append("responsible_email", form.responsible_email);
    if (form.phone) formData.append("phone", form.phone);
    if (form.email) formData.append("email", form.email);
    if (form.google_maps_url) formData.append("google_maps_url", form.google_maps_url);
    if (form.lat !== "") formData.append("lat", form.lat.toString());
    if (form.lng !== "") formData.append("lng", form.lng.toString());
    if (!editing) formData.append("sort_order", showrooms.length.toString());

    if (form.image_file) {
      formData.append("image_url", form.image_file);
    }
    
    if (form.images_files.length > 0) {
      form.images_files.forEach((file) => {
        formData.append("images[]", file);
      });
    }

    if (removed_images.length > 0) {
      removed_images.forEach((url) => {
        formData.append("remove_images[]", url);
      });
    }

    try {
      if (editing) {
        // Use POST with _method=PUT to support multipart/form-data with PUT in Laravel
        formData.append("_method", "PUT");
        await api.post(`/showrooms/${editing.id}`, formData);
        toast.success("Showroom mis à jour");
      } else {
        await api.post("/showrooms", formData);
        toast.success("Showroom ajouté");
      }
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer ce showroom ?", "L'adresse et les horaires seront perdus."))) return;
    try {
      await api.delete(`/showrooms/${id}`);
      toast.success("Supprimé");
      fetchData();
    } catch (err: any) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getEmbedUrl = (url: string | null, address: string, city: string) => {
    // CASE 1: No URL provided -> fallback to address/city
    if (!url) {
      const fallback = `${address}, ${city}`;
      return `https://maps.google.com/maps?q=${encodeURIComponent(fallback)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }

    // CASE 2: URL is provided -> IGNORE address, only use the URL/CID
    // Extract src if it's an iframe code
    const srcMatch = url.match(/src="([^"]+)"/);
    const cleanUrl = srcMatch ? srcMatch[1] : url.trim();

    // 1. CID format (like the user's example) - prioritize this as it's the most accurate
    const cidMatch = cleanUrl.match(/cid=(\d+)/);
    if (cidMatch) return `https://maps.google.com/maps?cid=${cidMatch[1]}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    // 2. If it's already a Google Embed URL or has pre-formatted parameters
    if (cleanUrl.includes('/maps/embed') || cleanUrl.includes('pb=')) {
      return cleanUrl;
    }

    // 3. Extract place name (common in full URLs)
    const placeMatch = cleanUrl.match(/\/maps\/place\/([^/@?&]+)/);
    if (placeMatch) return `https://maps.google.com/maps?q=${placeMatch[1]}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    // 4. Coordinates format @lat,lng
    const coordMatch = cleanUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) return `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    // 5. Shortened Shared Links (maps.app.goo.gl) or any other format
    // Use the URL itself as the query. We don't fallback to address anymore
    // to respect the user's choice of specific location.
    return `https://maps.google.com/maps?q=${encodeURIComponent(cleanUrl)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  };

  // DRAG AND DROP LOGIC
  const onDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newItems = [...showrooms];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setShowrooms(newItems);
  };

  const onDragEnd = async () => {
    setDraggedIndex(null);
    // Persist new order
    try {
      const updates = showrooms.map((s, idx) => api.put(`/showrooms/${s.id}`, { sort_order: idx }));
      await Promise.all(updates);
      toast.success("Ordre mis à jour");
    } catch (err) {
      toast.error("Erreur lors de la mise à jour de l'ordre");
    }
  };

  const toggleDay = (day: string) => {
    setForm(prev => {
      let days = prev.opening_days;
      if (typeof days === 'string') {
        try { days = JSON.parse(days); } catch (e) { days = null; }
      }
      
      const currentDays = days || {
        mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false
      };

      return {
        ...prev,
        opening_days: {
          ...currentDays,
          [day]: !currentDays[day]
        }
      };
    });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Gestion des Showrooms</h1>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-sm">
        <h2 className="font-bold mb-6 flex items-center gap-2">
          <div className="w-2 h-6 bg-primary rounded-full"></div>
          {editing ? "Modifier le showroom" : "Ajouter un nouveau showroom"}
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Informations de base */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Informations Générales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du showroom" className="px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                <input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Adresse complète" className="px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                <select value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                  <option value="">Sélectionner une ville...</option>
                  {villes.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Téléphone" className="px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                <input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all md:col-span-2" />
                <div className="md:col-span-2">
                  <input value={form.google_maps_url ?? ""} onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })} placeholder="Lien Google Maps (URL ou CID)" className="w-full px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
                <input type="number" step="any" value={form.lat ?? ""} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="Latitude (ex: 36.8065)" className="px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                <input type="number" step="any" value={form.lng ?? ""} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="Longitude (ex: 10.1815)" className="px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
              </div>
            </section>

            {/* Contact Responsable */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Responsable du Showroom</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={form.contact_person_name ?? ""} onChange={(e) => setForm({ ...form, contact_person_name: e.target.value })} placeholder="Nom complet" className="px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                <input value={form.contact_person_phone ?? ""} onChange={(e) => setForm({ ...form, contact_person_phone: e.target.value })} placeholder="Téléphone" className="px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  <input value={form.responsible_name ?? ""} onChange={(e) => setForm({ ...form, responsible_name: e.target.value })} placeholder="Nom du responsable (optionnel)" className="px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  <input value={form.responsible_phone ?? ""} onChange={(e) => setForm({ ...form, responsible_phone: e.target.value })} placeholder="Téléphone du responsable (optionnel)" className="px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                <input value={form.responsible_email ?? ""} onChange={(e) => setForm({ ...form, responsible_email: e.target.value })} placeholder="Email du responsable (optionnel)" className="px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all md:col-span-2" />
              </div>
            </section>

            {/* Images */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Images du Showroom</h3>
              <div className="space-y-6">
                {/* Main Image */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block ml-1">Image principale</label>
                  <div className="flex flex-col gap-2">
                    {/* Preview existing or new main image */}
                    {(form.image_file || editing?.image_url) && (
                      <div className="w-full h-32 rounded-xl overflow-hidden border border-border group relative bg-muted animate-in fade-in duration-500">
                         <img 
                            src={form.image_file ? URL.createObjectURL(form.image_file) : editing?.image_url || ""} 
                            alt="Preview" 
                            className="w-full h-full object-cover" 
                          />
                          {form.image_file && (
                            <button 
                              type="button" 
                              onClick={() => setForm({ ...form, image_file: null })}
                              className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <div className="absolute top-2 left-2 px-2 py-1 bg-background/80 backdrop-blur-sm rounded text-[10px] font-bold z-10 border border-border/50">
                            {form.image_file ? "Nouvelle sélection" : "Image actuelle"}
                          </div>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setForm({ ...form, image_file: e.target.files?.[0] || null })}
                      className="flex-1 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer transition-all"
                    />
                  </div>
                </div>

                {/* Gallery Images */}
                <div>
                  <div className="flex items-center justify-between mb-1 ml-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Galerie d'images</label>
                    {form.images_files.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => setForm({ ...form, images_files: [] })} 
                        className="text-[10px] font-black text-destructive hover:underline flex items-center gap-1 bg-destructive/10 px-2 py-0.5 rounded-full"
                      >
                        <X className="w-2.5 h-2.5" /> Réinitialiser la sélection
                      </button>
                    )}
                  </div>
                  
                  {/* Gallery Previews */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {/* New Selection Previews */}
                    {form.images_files.map((file, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden border border-primary/30 bg-muted relative group animate-in zoom-in-95 duration-300">
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button" 
                            onClick={() => setForm(prev => ({ ...prev, images_files: prev.images_files.filter((_, idx) => idx !== i) }))}
                            className="bg-destructive text-white p-1 rounded-full shadow-lg"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <div className="absolute bottom-1 left-1 px-1 bg-primary text-primary-foreground rounded text-[7px] font-black shadow-sm">NEUF</div>
                      </div>
                    ))}

                    {/* Existing Database Images */}
                    {editing?.images && editing.images.length > 0 && editing.images.filter(img => !removed_images.includes(img)).map((img, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border bg-muted relative group">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button" 
                            onClick={() => setRemovedImages(prev => [...prev, img])}
                            className="bg-destructive text-white p-1 rounded-full shadow-lg"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                          <span className="text-[8px] text-white font-black uppercase tracking-tight">Actuel</span>
                        </div>
                      </div>
                    ))}

                    {/* Pending removals (optional visual feedback) */}
                    {removed_images.map((img, i) => (
                      <div key={`rem-${i}`} className="aspect-square rounded-lg overflow-hidden border border-destructive/30 bg-destructive/10 relative group">
                        <img src={img} alt="" className="w-full h-full object-cover grayscale opacity-30" />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <button 
                            type="button" 
                            onClick={() => setRemovedImages(prev => prev.filter(r => r !== img))}
                            className="text-[8px] bg-background text-foreground px-2 py-1 rounded-full font-black uppercase shadow-xl"
                          >
                            Restaurer
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Placeholder */}
                    {(!editing?.images || editing.images.length === 0) && form.images_files.length === 0 && (
                      <div className="aspect-square rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30">
                        <ImageIcon className="w-5 h-5 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>

                  <input 
                    type="file" 
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setForm(prev => ({ 
                        ...prev, 
                        images_files: [...prev.images_files, ...files] 
                      }));
                    }}
                    className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                  {form.images_files.length > 0 && (
                    <p className="text-[10px] text-primary font-bold mt-2 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> {form.images_files.length} image{form.images_files.length > 1 ? 's' : ''} prête{form.images_files.length > 1 ? 's' : ''} à l'envoi
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            {/* Horaires et Jours */}
            <section className="bg-muted/30 p-5 rounded-2xl border border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Horaires d'ouverture
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block ml-1">Ouverture</label>
                  <input type="time" value={form.opening_hours_from ?? ""} onChange={(e) => setForm({ ...form, opening_hours_from: e.target.value })} className="w-full px-4 py-3 border border-border rounded-xl bg-background text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block ml-1">Fermeture</label>
                  <input type="time" value={form.opening_hours_until ?? ""} onChange={(e) => setForm({ ...form, opening_hours_until: e.target.value })} className="w-full px-4 py-3 border border-border rounded-xl bg-background text-sm font-bold" />
                </div>
              </div>

              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 ml-1">Jours d'ouverture</h3>
              <div className="flex flex-wrap gap-2">
                {Object.keys(DAYS_FR).map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      form.opening_days?.[day] 
                        ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {DAYS_FR[day]}
                  </button>
                ))}
              </div>
            </section>

            {/* Aperçu Map */}
            {(form.address || form.city || form.google_maps_url) && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Aperçu Localisation</h3>
                <a 
                  href={form.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.address + ', ' + form.city)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="block rounded-2xl overflow-hidden border border-border bg-muted aspect-video group relative cursor-pointer"
                >
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors z-10 flex items-center justify-center">
                    <span className="bg-background shadow-xl text-foreground px-4 py-2 rounded-xl text-xs font-bold opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">Voir sur Maps</span>
                  </div>
                  <iframe
                    width="100%" height="100%" frameBorder="0" scrolling="no"
                    src={getEmbedUrl(form.google_maps_url, form.address, form.city)}
                    className="filter contrast-125 pointer-events-none"
                  ></iframe>
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-border">
          <button onClick={handleSave} className="bg-primary text-primary-foreground font-black px-8 py-3 rounded-xl text-sm hover:scale-105 active:scale-95 transition-transform flex items-center gap-2">
            <Plus className="w-5 h-5" /> {editing ? "Mettre à jour" : "Créer le Showroom"}
          </button>
          {editing && <button onClick={resetForm} className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">Annuler les modifications</button>}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
          <p className="text-muted-foreground font-medium animate-pulse">Chargement des showrooms...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{showrooms.length} Showrooms enregistrés</p>
            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1"><GripVertical className="w-3 h-3" /> Glissez pour réorganiser</p>
          </div>
          
          {showrooms.map((s, index) => (
            <div 
              key={s.id} 
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragEnd={onDragEnd}
              className={`bg-card border border-border rounded-2xl p-4 md:p-6 transition-all group ${
                draggedIndex === index ? "opacity-30 scale-95 ring-2 ring-primary" : "hover:shadow-lg hover:border-primary/30"
              }`}
            >
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-stretch">
                {/* Drag Handle */}
                <div className="hidden md:flex items-center text-muted-foreground/30 group-hover:text-primary/40 cursor-grab active:cursor-grabbing px-1 transition-colors">
                  <GripVertical className="w-6 h-6" />
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center flex-shrink-0 border border-primary/10 overflow-hidden select-none">
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <MapPin className="w-7 h-7 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-xl leading-tight text-foreground line-clamp-1">{s.name}</p>
                          <span className="bg-muted text-[10px] font-black px-2 py-0.5 rounded-full text-muted-foreground tracking-tighter uppercase">ID: {s.id.split('-')[0]}</span>
                        </div>
                        <p className="text-sm text-foreground/70 flex items-center gap-1.5 focus:outline-none line-clamp-2 whitespace-normal"><MapPin className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" /> {s.address}, {s.city}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleEdit(s)} title="Modifier" className="p-3 rounded-xl bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-all duration-300"><Edit className="w-5 h-5" /></button>
                      <button onClick={() => handleDelete(s.id)} title="Supprimer" className="p-3 rounded-xl bg-muted/50 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 text-[13px]">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Contact Direct</p>
                      <p className="font-semibold text-foreground/80">{s.phone || "—"}</p>
                      <p className="text-xs text-muted-foreground">{s.email || "—"}</p>
                    </div>

                    <div className="space-y-1 border-l border-border/50 pl-6">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest font-sans">Horaires & Jours</p>
                      <div className="flex items-center gap-2 font-bold text-primary mb-2">
                        <Clock className="w-4 h-4" /> {s.opening_hours_from} - {s.opening_hours_until}
                      </div>

                      {s.images && s.images.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {s.images.map((img, i) => (
                            <img key={i} src={img} alt="" className="w-8 h-8 rounded-md object-cover border border-border/50 shadow-sm" />
                          ))}
                        </div>
                      )}

                      <div className="flex gap-1 mt-1">
                        {Object.keys(DAYS_FR).map(day => {
                          let days = s.opening_days;
                          if (typeof days === 'string') {
                            try { days = JSON.parse(days); } catch (e) { days = null; }
                          }
                          const isActive = days && (days as any)[day] === true;
                          
                          return (
                            <span key={day} className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${isActive ? "bg-primary/20 text-primary border border-primary/20" : "bg-muted text-muted-foreground/30"}`}>
                              {DAYS_FR[day][0]}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1 border-l border-border/50 pl-6 hidden lg:block">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Responsable</p>
                      <p className="font-bold text-foreground/80">{s.contact_person_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{s.contact_person_phone || "—"}</p>
                    </div>
                  </div>

                  {s.google_maps_url && (
                    <div className="mt-5 pt-4 border-t border-border/30">
                      <a href={s.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-primary font-black text-xs hover:underline flex items-center gap-2 uppercase tracking-wide">
                        <MapPin className="w-3.5 h-3.5" /> Ouvrir l'itinéraire précis sur Google Maps →
                      </a>
                    </div>
                  )}
                </div>

                {/* Map Preview in list */}
                <a 
                  href={s.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address + ', ' + s.city)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full md:w-80 h-40 md:h-auto rounded-2xl overflow-hidden border border-border shrink-0 bg-muted group relative cursor-pointer"
                >
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-all z-10 flex items-center justify-center">
                     <div className="bg-primary text-primary-foreground p-3 rounded-full opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all shadow-xl">
                        <MapPin className="w-5 h-5" />
                     </div>
                  </div>
                  <iframe
                    width="100%" height="100%" frameBorder="0"
                    src={getEmbedUrl(s.google_maps_url, s.address, s.city)}
                    className="opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none"
                  ></iframe>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
