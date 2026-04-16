import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Upload, Copy, Image, Film } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { confirmDelete } from "@/lib/swal";

interface MediaFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any> | null;
  public_url: string;
}

export default function AdminMedias() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [folder, setFolder] = useState("");

  const load = async () => {
    try {
      const data = await api.get<MediaFile[]>(`/media?folder=${folder || ""}`);
      setFiles(data || []);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des fichiers");
    }
  };

  useEffect(() => { load(); }, [folder]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);
        await api.post("/media/upload", formData);
      }
      toast.success("Upload terminé");
      load();
    } catch (err: any) {
      toast.error("Erreur durant l'upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (name: string) => {
    if (!(await confirmDelete(`Supprimer ${name} ?`, "Le fichier sera définitivement supprimé du serveur."))) return;
    try {
      const path = folder ? `${folder}/${name}` : name;
      await api.delete(`/media?path=${encodeURIComponent(path)}`);
      toast.success("Fichier supprimé");
      load();
    } catch (err: any) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiée !");
  };

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
  const isVideo = (name: string) => /\.(mp4|webm|mov)$/i.test(name);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestionnaire Médias</h1>
        <label className="cursor-pointer">
          <input type="file" multiple accept="image/*,video/*" onChange={handleUpload} className="hidden" />
          <Button size="sm" asChild disabled={uploading}>
            <span><Upload className="w-4 h-4 mr-1" /> {uploading ? "Upload..." : "Uploader"}</span>
          </Button>
        </label>
      </div>

      <div className="flex gap-2 mb-4 items-center">
        <span className="text-sm text-muted-foreground">Dossier :</span>
        <button
          onClick={() => setFolder("")}
          className={`px-3 py-1 rounded text-xs font-medium ${!folder ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
        >/ (racine)</button>
        {["produits", "banners", "logos"].map((f) => (
          <button
            key={f}
            onClick={() => setFolder(f)}
            className={`px-3 py-1 rounded text-xs font-medium capitalize ${folder === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
          >{f}</button>
        ))}
        <Input
          placeholder="Autre dossier..."
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          className="w-32 h-7 text-xs"
        />
      </div>

      {files.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun fichier dans ce dossier</p>
          <p className="text-xs mt-1">Uploadez des images ou vidéos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.filter((f) => f.name !== ".emptyFolderPlaceholder").map((file) => (
            <div key={file.name} className="bg-card rounded-lg border border-border overflow-hidden group">
              <div className="aspect-square relative bg-muted flex items-center justify-center">
                {isImage(file.name) ? (
                  <img src={file.public_url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                ) : isVideo(file.name) ? (
                  <Film className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <Image className="w-8 h-8 text-muted-foreground" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => copyUrl(file.public_url)} title="Copier URL">
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDelete(file.name)} title="Supprimer">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {file.metadata?.size ? formatSize(file.metadata.size) : "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
