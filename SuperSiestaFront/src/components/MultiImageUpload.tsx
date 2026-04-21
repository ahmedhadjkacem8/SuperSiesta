import { useState } from "react";

// Allow JSX intrinsic element for model-viewer in this file
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface MultiImageUploadProps {
  value: File[];
  onChange: (files: File[]) => void;
  onRemoveExisting?: (index: number) => void;
  folder?: string;
  label?: string;
  placeholder?: string;
  preview?: string[];
  accept?: string;
}

export default function MultiImageUpload({
  value,
  onChange,
  onRemoveExisting,
  folder = "",
  label = "Images",
  placeholder = "Cliquez pour uploader des images",
  preview = [],
  accept = "image/*",
}: MultiImageUploadProps) {
  const [previewErrors, setPreviewErrors] = useState<Set<number>>(new Set());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newFiles: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

        // Validate file is image or 3D model (.glb/.gltf)
        const isImage = file.type.startsWith("image/");
        const isModel = file.type.startsWith("model/") || file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf');
        if (!isImage && !isModel) {
          toast.error(`${file.name} n'est pas un format supporté`);
          continue;
        }

      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      onChange([...value, ...newFiles]);
      toast.success(`${newFiles.length} image(s) sélectionnée(s)`);
    }

    e.target.value = "";
  };

  const handleRemove = (index: number) => {
    if (index < value.length) {
      // It's a file
      const newFiles = value.filter((_, i) => i !== index);
      onChange(newFiles);
    } else if (onRemoveExisting) {
      // It's an existing URL
      const existingIdx = index - value.length;
      onRemoveExisting(existingIdx);
    }
    
    const newErrors = new Set(previewErrors);
    newErrors.delete(index);
    setPreviewErrors(newErrors);
  };

  const handlePreviewError = (index: number) => {
    setPreviewErrors((prev) => new Set(prev).add(index));
  };

  // Get all images (Files and preview URLs)
  const allImages: Array<{ type: 'file' | 'url'; data: File | string; name: string; index: number }> = [
    ...value.map((file, i) => ({
      type: 'file' as const,
      data: file,
      name: file.name,
      index: i,
    })),
    ...preview.map((url, i) => ({
      type: 'url' as const,
      data: url,
      name: `Image ${value.length + i + 1}`,
      index: value.length + i,
    }))
  ];

  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-medium">{label}</label>}

      <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
        <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
          <input
            type="file"
            multiple
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground text-center">{placeholder}</span>
          </div>
        </label>
      </div>

      {/* Display uploaded and existing images */}
      {allImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {allImages.map((img) => {
                const hasError = previewErrors.has(img.index);
                const previewUrl = img.type === 'file' ? URL.createObjectURL(img.data as File) : (img.data as string);
                const name = img.type === 'file' ? (img.data as File).name : String(img.data);

                const isModel = (n: string) => n.toLowerCase().endsWith('.glb') || n.toLowerCase().endsWith('.gltf');

                return (
                  <div key={img.index} className="relative group rounded-lg overflow-hidden bg-muted">
                    {hasError ? (
                      <div className="w-full h-24 flex items-center justify-center bg-destructive/10 border border-destructive">
                        <span className="text-xs text-destructive text-center px-1">Aperçu impossible</span>
                      </div>
                    ) : isModel(name) ? (
                      <div className="w-full h-24">
                        <model-viewer src={previewUrl} alt={`Model ${img.index}`} style={{ width: '100%', height: '100%' }} camera-controls auto-rotate interaction-prompt="none" />
                      </div>
                    ) : (
                      <img
                        src={previewUrl}
                        alt={`Preview ${img.index}`}
                        className="w-full h-24 object-cover"
                        onError={() => handlePreviewError(img.index)}
                      />
                    )}
                <button
                  type="button"
                  onClick={() => handleRemove(img.index)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                  {img.index + 1}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {allImages.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">Aucune image pour le moment</p>
      )}
    </div>
  );
}
