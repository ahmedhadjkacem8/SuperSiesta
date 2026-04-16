import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  folder?: string;
  label?: string;
  placeholder?: string;
  preview?: string;
}

export default function ImageUpload({
  value,
  onChange,
  folder = "",
  label = "Image",
  placeholder = "Cliquez pour uploader une image",
  preview = "",
}: ImageUploadProps) {
  const [previewError, setPreviewError] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file is image
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    onChange(file);
    setPreviewError(false);
  };

  const handleClear = () => {
    onChange(null);
    setPreviewError(false);
  };

  // Create object URL for preview from File object
  const previewUrl = value ? URL.createObjectURL(value) : preview;

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      
      <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
        <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground text-center">{placeholder}</span>
            {value && <span className="text-xs text-primary font-medium">{value.name}</span>}
          </div>
        </label>
      </div>

      {/* Current image preview */}
      {previewUrl && !previewError && (
        <div className="relative rounded-lg overflow-hidden bg-muted">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-40 object-cover"
            onError={() => setPreviewError(true)}
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
            {value?.name || "Image actuelle"}
          </div>
        </div>
      )}

      {previewUrl && previewError && (
        <div className="bg-destructive/10 border border-destructive text-destructive text-sm p-3 rounded-lg flex justify-between items-center">
          <span>Impossible de charger l'image</span>
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
