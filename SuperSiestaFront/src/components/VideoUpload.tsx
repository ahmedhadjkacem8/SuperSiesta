import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Film, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VideoUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  label?: string;
  placeholder?: string;
  preview?: string;
}

export default function VideoUpload({
  value,
  onChange,
  label = "Vidéo",
  placeholder = "Cliquez pour uploader une vidéo (format Reel)",
  preview = "",
}: VideoUploadProps) {
  const [previewError, setPreviewError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file is video
    if (!file.type.startsWith("video/")) {
      toast.error("Veuillez sélectionner un fichier vidéo");
      return;
    }

    // Limit size to 50MB (adjust as needed)
    if (file.size > 51200 * 1024) {
      toast.error("La vidéo est trop lourde (max 50Mo)");
      return;
    }

    onChange(file);
    setPreviewError(false);
  };

  const handleClear = () => {
    onChange(null);
    setPreviewError(false);
  };

  const previewUrl = value ? URL.createObjectURL(value) : preview;

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      
      <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
        <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <Film className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground text-center">{placeholder}</span>
            {value && <span className="text-xs text-primary font-medium">{value.name}</span>}
          </div>
        </label>
      </div>

      {previewUrl && !previewError && (
        <div className="relative rounded-lg overflow-hidden bg-muted aspect-[9/16] max-h-60 mx-auto">
          <video
            ref={videoRef}
            src={previewUrl}
            className="w-full h-full object-cover"
            controls
            onError={() => setPreviewError(true)}
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {previewUrl && previewError && (
        <div className="bg-destructive/10 border border-destructive text-destructive text-sm p-3 rounded-lg flex justify-between items-center">
          <span>Impossible de lire la vidéo</span>
          <button
            type="button"
            onClick={handleClear}
            className="hover:underline text-xs font-medium"
          >
            Effacer
          </button>
        </div>
      )}
    </div>
  );
}
