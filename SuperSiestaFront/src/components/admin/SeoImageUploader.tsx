import React, { useRef, useState, useCallback } from "react";
import api from "@/lib/apiClient";
import { Upload, X, ImageIcon, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ImageDimensions {
  width: number;
  height: number;
}

interface SeoImageUploaderProps {
  /** Current stored path or URL (from DB) */
  value: string | null | undefined;
  /** Called when the value changes (pass the new storage path) */
  onChange: (path: string | null) => void;
  /** Label shown above the uploader */
  label: string;
  /** Sub-label shown below (recommendations, etc.) */
  hint?: string;
  /** Recommended width × height for SEO score (e.g. [1200, 630] for OG) */
  recommendedSize?: [number, number];
  /** Storage sub-folder on the backend (default: "seo") */
  folder?: string;
  /** Optional additional CSS classes on the root */
  className?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Probe the natural dimensions of an image by creating an off-screen <img>
 * element. Returns null if the image cannot be loaded.
 */
function probeDimensions(src: string): Promise<ImageDimensions | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Rate a set of dimensions against the recommended size.
 * Returns "optimal" | "acceptable" | "small"
 */
function rateSize(
  dims: ImageDimensions | null,
  recommended: [number, number]
): "optimal" | "acceptable" | "small" | null {
  if (!dims) return null;
  const [rw, rh] = recommended;
  const ratio = dims.width / (dims.height || 1);
  const refRatio = rw / rh;

  if (dims.width >= rw && Math.abs(ratio - refRatio) < 0.05) return "optimal";
  if (dims.width >= Math.round(rw * 0.6)) return "acceptable";
  return "small";
}

// ── Component ────────────────────────────────────────────────────────────────

export const SeoImageUploader: React.FC<SeoImageUploaderProps> = ({
  value,
  onChange,
  label,
  hint,
  recommendedSize,
  folder = "seo",
  className = "",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState<string | null>(null);
  const [dims, setDims]                 = useState<ImageDimensions | null>(null);
  const [dimsLoading, setDimsLoading]   = useState(false);

  // Resolved full URL for display
  const previewUrl = value ? api.getFileUrl(value) : null;

  // When the preview URL changes, probe its dimensions
  const probeCurrentImage = useCallback(async (url: string) => {
    setDimsLoading(true);
    const d = await probeDimensions(url);
    setDims(d);
    setDimsLoading(false);
  }, []);

  // Probe on first render if already has a value
  React.useEffect(() => {
    if (previewUrl) {
      probeCurrentImage(previewUrl);
    } else {
      setDims(null);
    }
  }, [previewUrl]);

  // ── Upload handler ──────────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError(null);

    // Client-side mime validation
    if (!file.type.startsWith("image/")) {
      setUploadError("Seules les images sont acceptées (JPEG, PNG, WebP, GIF).");
      return;
    }

    // Warn about oversized files but still allow (server enforces hard limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Attention : le fichier dépasse 5 Mo. Cela peut ralentir le crawl Google.");
    }

    setUploading(true);
    try {
      const result = await api.uploadFile(file, folder) as { path: string; url: string };
      const storagePath = result.path ?? result.url;
      onChange(storagePath);
      // Probe dimensions of the newly uploaded image
      await probeCurrentImage(api.getFileUrl(storagePath));
    } catch (err: any) {
      setUploadError(err?.message ?? "Erreur lors de l'upload.");
    } finally {
      setUploading(false);
    }
  }, [folder, onChange, probeCurrentImage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // ── Size rating ─────────────────────────────────────────────────────────

  const sizeRating = recommendedSize ? rateSize(dims, recommendedSize) : null;

  const sizeColors = {
    optimal:    "text-emerald-400",
    acceptable: "text-amber-400",
    small:      "text-red-400",
    null:       "text-muted-foreground",
  } as const;

  const sizeMessages = recommendedSize
    ? {
        optimal:    `✅ Dimensions optimales pour le SEO (${dims?.width}×${dims?.height}px)`,
        acceptable: `⚠️ Image acceptable mais plus petite que recommandé (${dims?.width}×${dims?.height}px — idéal : ${recommendedSize[0]}×${recommendedSize[1]}px)`,
        small:      `❌ Image trop petite (${dims?.width}×${dims?.height}px). Google peut l'ignorer. Cible : ${recommendedSize[0]}×${recommendedSize[1]}px`,
      }
    : {};

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3" />
          {label}
        </label>
        {previewUrl && (
          <button
            type="button"
            onClick={() => { onChange(null); setDims(null); }}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Supprimer
          </button>
        )}
      </div>

      {/* Drop zone / preview area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`
          relative rounded-xl border-2 border-dashed overflow-hidden transition-colors
          ${previewUrl
            ? "border-border"
            : "border-border hover:border-accent/60 cursor-pointer"}
        `}
        onClick={() => !previewUrl && inputRef.current?.click()}
      >
        {previewUrl ? (
          /* ── Image preview ── */
          <div className="relative group">
            <img
              src={previewUrl}
              alt={label}
              loading="lazy"
              decoding="async"
              className="w-full h-40 object-cover"
              /* Note: width/height attributes can't be set dynamically via JSX for intrinsic sizes,
                 but the <img> is visually constrained by the container. */
            />
            {/* Overlay with change button */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="flex items-center gap-1.5 bg-white/90 text-zinc-900 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Changer
              </button>
            </div>

            {/* Dimensions badge */}
            {dimsLoading ? (
              <div className="absolute bottom-2 right-2">
                <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
              </div>
            ) : dims && (
              <span className={`
                absolute bottom-2 right-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded
                bg-black/70 backdrop-blur-sm
                ${sizeColors[sizeRating ?? "null"]}
              `}>
                {dims.width}×{dims.height}
              </span>
            )}
          </div>
        ) : (
          /* ── Empty drop zone ── */
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground select-none">
            {uploading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-accent" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
            <p className="text-xs font-medium">
              {uploading ? "Upload en cours…" : "Glisser-déposer ou cliquer pour choisir"}
            </p>
            <p className="text-[10px]">JPEG · PNG · WebP · GIF</p>
            {recommendedSize && (
              <p className="text-[10px] text-accent/80 font-semibold">
                Recommandé : {recommendedSize[0]}×{recommendedSize[1]}px
              </p>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Change button when image is present */}
      {previewUrl && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg py-1.5 hover:bg-muted/40 transition-colors"
        >
          <Upload className="w-3 h-3" /> Remplacer l'image
        </button>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="flex items-center gap-2 text-xs text-accent">
          <RefreshCw className="w-3 h-3 animate-spin" /> Upload en cours…
        </div>
      )}

      {/* Size rating message */}
      {sizeRating && dims && (
        <p className={`text-[11px] ${sizeColors[sizeRating]}`}>
          {sizeMessages[sizeRating]}
        </p>
      )}

      {/* Error */}
      {uploadError && (
        <p className="text-[11px] text-amber-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0" /> {uploadError}
        </p>
      )}

      {/* Hint */}
      {hint && !uploadError && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
};

export default SeoImageUploader;
