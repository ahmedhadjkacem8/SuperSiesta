import React, { useState, useEffect, useMemo, useCallback } from "react";
import api from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, Trash2, Save, X, BarChart3, RefreshCw,
  Globe, Eye, EyeOff, FileText,
  TrendingUp, AlertTriangle, CheckCircle, Tag, Image as ImageIcon,
  Share2, MessageSquare, Code, Settings, ArrowLeft, Zap, ExternalLink,
  ChevronUp, ChevronDown, Info, Clock, Link, Bot, Layers
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import SeoImageUploader from "@/components/admin/SeoImageUploader";

const API_ROOT = (import.meta.env.VITE_API_ROOT || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "") : "")).replace(/\/+$/, "");

const getPagePath = (identifier: string): string => {
  if (!identifier) return "/";
  if (identifier === "home") return "/";
  if (identifier === "global") return "/";
  if (identifier === "boutique") return "/boutique";
  if (identifier === "showrooms") return "/showrooms";
  if (identifier === "blog") return "/blog";
  if (identifier === "a-propos") return "/a-propos";
  if (identifier === "contact") return "/contact";
  if (identifier === "faq") return "/faq";

  if (identifier.startsWith("product_")) {
    return `/produit/${identifier.replace("product_", "")}`;
  }
  if (identifier.startsWith("categorie_")) {
    return `/boutique?categorie=${identifier.replace("categorie_", "")}`;
  }
  if (identifier.startsWith("blog_")) {
    return `/blog/${identifier.replace("blog_", "")}`;
  }
  if (identifier.startsWith("showroom_")) {
    return `/showrooms?showroom=${identifier}`;
  }

  return `/${identifier}`;
};

const getTargetUrl = (identifier: string): string => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = getPagePath(identifier);
  return `${origin}${path}`;
};

// ─── Types ───
interface SeoEntry {
  id?: number;
  page_identifier: string;
  page_label: string;
  seoable_type: string | null;
  seoable_id: number | null;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  meta_robots: string;
  og_title: string;
  og_description: string;
  og_image: string;
  og_type: string;
  og_locale: string;
  twitter_card: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image: string;
  json_ld_type: string;
  json_ld_data: any;
  priority: number;
  changefreq: string;
  seo_score: number;
  is_active: boolean;
  notes: string;
  last_analyzed_at: string | null;
  recommendations?: Recommendation[];
  created_at?: string;
  updated_at?: string;
}

// An entry is "auto-managed" when it is tied to an entity via the observer system
const isAutoManaged = (entry: SeoEntry): boolean =>
  !!(entry.seoable_type && entry.seoable_id);

// Human-readable entity type label from fully-qualified class name
const entityTypeLabel = (entry: SeoEntry): string => {
  if (!entry.seoable_type) return '';
  const parts = entry.seoable_type.split('\\');
  const cls = parts[parts.length - 1];
  const map: Record<string, string> = {
    Product:   'Produit',
    Categorie: 'Catégorie',
    Showroom:  'Showroom',
    BlogPost:  'Article',
  };
  return map[cls] ?? cls;
};

// Color coding for entity type pills
const entityTypeColor = (entry: SeoEntry): string => {
  const cls = (entry.seoable_type ?? '').split('\\').pop() ?? '';
  const map: Record<string, string> = {
    Product:   'bg-violet-500/15 text-violet-400 border-violet-500/30',
    Categorie: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    Showroom:  'bg-orange-500/15 text-orange-400 border-orange-500/30',
    BlogPost:  'bg-pink-500/15 text-pink-400 border-pink-500/30',
  };
  return map[cls] ?? 'bg-muted text-muted-foreground border-border';
};

interface Recommendation {
  priority: "high" | "medium" | "low";
  field: string;
  message: string;
}

interface ScoreHistoryEntry {
  score: number;
  created_at: string;
}

interface SeoStats {
  total: number;
  active: number;
  avg_score: number;
  missing: { title: number; description: number; keywords: number; og_image: number };
  score_distribution: { excellent: number; good: number; poor: number };
  top_pages: SeoEntry[];
  worst_pages: SeoEntry[];
}

interface BulkAnalyzeResult {
  analyzed: number;
  results: Array<{ id: number; seo_score: number; last_analyzed_at: string; recommendations: Recommendation[] }>;
}

const EMPTY_SEO: SeoEntry = {
  page_identifier: "", page_label: "", seoable_type: null, seoable_id: null,
  meta_title: "", meta_description: "", meta_keywords: "", meta_robots: "index,follow",
  og_title: "", og_description: "", og_image: "", og_type: "website", og_locale: "fr_FR",
  twitter_card: "summary_large_image", twitter_title: "", twitter_description: "", twitter_image: "",
  json_ld_type: "", json_ld_data: null, priority: 0.5, changefreq: "weekly",
  seo_score: 0, is_active: true, notes: "", last_analyzed_at: null,
};

const ROBOTS_OPTIONS = ["index,follow", "index,nofollow", "noindex,follow", "noindex,nofollow"];
const CHANGEFREQ_OPTIONS = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];
const OG_TYPES = ["website", "product", "article", "profile"];
const TWITTER_CARDS = ["summary", "summary_large_image"];
const JSON_LD_TYPES = ["WebPage", "Product", "Organization", "LocalBusiness", "CollectionPage", "ContactPage", "FAQPage"];

const PAGE_TEMPLATES = [
  { value: "home", label: "Page d'Accueil (/)" },
  { value: "boutique", label: "Boutique / Catalogue (/boutique)" },
  { value: "showrooms", label: "Showrooms (/showrooms)" },
  { value: "blog", label: "Blog (/blog)" },
  { value: "a-propos", label: "À Propos (/a-propos)" },
  { value: "contact", label: "Contact (/contact)" },
  { value: "faq", label: "FAQ (/faq)" },
  { value: "global", label: "Paramètres Globaux (Fallback)" },
];

// ─── Score Badge ───
const ScoreBadge = ({ score }: { score: number }) => {
  let color = "bg-red-500/15 text-red-400 border-red-500/30";
  let label = "Faible";
  if (score >= 80) { color = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"; label = "Excellent"; }
  else if (score >= 50) { color = "bg-amber-500/15 text-amber-400 border-amber-500/30"; label = "Moyen"; }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
      <div className="relative w-5 h-5">
        <svg className="w-5 h-5 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3"
            strokeDasharray={`${score * 0.88} 88`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold">{score}</span>
      </div>
      {label}
    </div>
  );
};

// ─── Character Counter ───
const CharCounter = ({ value, max, optimal }: { value: string; max: number; optimal?: [number, number] }) => {
  const len = (value || "").length;
  let color = "text-muted-foreground";
  if (optimal && len >= optimal[0] && len <= optimal[1]) color = "text-emerald-400";
  else if (len > max) color = "text-red-400";
  else if (len > 0) color = "text-amber-400";

  return <span className={`text-xs ${color}`}>{len}/{max}</span>;
};

// ─── SERP Preview ───
const SerpPreview = ({ title, description, url }: { title: string; description: string; url?: string }) => {
  const displayUrl = url ? url.replace(/^https?:\/\//, "") : "SiestaOfficiel - page";
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-border">
      <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center justify-between">
        <span>Aperçu Google SERP</span>
        {url && <span className="text-[10px] font-mono text-emerald-500 truncate max-w-[150px]">{url}</span>}
      </p>
      <div className="space-y-0.5">
        <p className="text-[#1a0dab] dark:text-[#8ab4f8] text-base font-medium truncate cursor-pointer hover:underline">
          {title || "Titre de la page — Super Siesta"}
        </p>
        <p className="text-[#006621] dark:text-[#bdc1c6] text-xs font-mono truncate">{displayUrl}</p>
        <p className="text-[#545454] dark:text-[#bdc1c6] text-sm leading-relaxed line-clamp-2">
          {description || "La description de votre page apparaîtra ici dans les résultats de recherche Google..."}
        </p>
      </div>
    </div>
  );
};

// ─── Social Preview ───
const SocialPreview = ({ title, description, image, url, type }: { title: string; description: string; image?: string; url?: string; type: "og" | "twitter" }) => {
  const domain = url ? url.replace(/^https?:\/\//, "").split('/')[0].toUpperCase() : "SIESTAOFFICIEL.COM";
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-border overflow-hidden">
      <p className="text-xs text-muted-foreground px-3 pt-3 pb-1 font-medium flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          {type === "og" ? <><Share2 className="w-3 h-3" /> Aperçu Facebook/LinkedIn</> : <><MessageSquare className="w-3 h-3" /> Aperçu Twitter</>}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">{domain}</span>
      </p>
      {image && (
        <div className="mx-3 mt-1 h-32 rounded-lg overflow-hidden bg-muted">
          <img src={api.getFileUrl(image)} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{domain}</p>
        <p className="font-semibold text-sm text-foreground truncate">{title || "Titre"}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description || "Description..."}</p>
      </div>
    </div>
  );
};

// ─── Recommendation Badge ───
const PriorityBadge = ({ priority }: { priority: "high" | "medium" | "low" }) => {
  const map = {
    high:   { cls: "bg-red-500/15 text-red-400 border-red-500/30",     label: "Urgent" },
    medium: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "À améliorer" },
    low:    { cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",   label: "Optionnel" },
  };
  const { cls, label } = map[priority] ?? map.low;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>{label}</span>;
};

// ─── Mini Sparkline for score history ───
const ScoreSparkline = ({ history }: { history: ScoreHistoryEntry[] }) => {
  if (!history || history.length < 2) return <span className="text-xs text-muted-foreground">Pas assez de données</span>;

  const scores = [...history].reverse().map(h => h.score);
  const max    = Math.max(...scores, 1);
  const min    = Math.min(...scores);
  const range  = max - min || 1;
  const w      = 120;
  const h      = 32;
  const points = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * w;
    const y = h - ((s - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  const last  = scores[scores.length - 1];
  const first = scores[0];
  const diff  = last - first;
  const color = diff > 0 ? "#34d399" : diff < 0 ? "#f87171" : "#94a3b8";

  return (
    <div className="flex items-center gap-2">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`text-xs font-semibold ${diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-muted-foreground"}`}>
        {diff > 0 ? "+" : ""}{diff}
      </span>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const SeoPanel = () => {
  const [subTab, setSubTab] = useState<"list" | "stats" | "sitemap">("list");
  const [entries, setEntries] = useState<SeoEntry[]>([]);
  const [stats, setStats] = useState<SeoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SeoEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState<"meta" | "social" | "structured" | "advanced">("meta");
  const { toast } = useToast();
  const [ogFocused, setOgFocused] = useState(false);       // kept for SocialPreview (no longer used for upload)
  const [twitterFocused, setTwitterFocused] = useState(false); // idem

  // Bulk analyze
  const [analyzingAll, setAnalyzingAll] = useState(false);

  // Auto-sync
  const [resyncing, setResyncing] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncType, setSyncType] = useState<'all' | 'products' | 'categories' | 'showrooms' | 'blog'>('all');
  const [syncForce, setSyncForce] = useState(false);
  const [syncLog, setSyncLog] = useState<string | null>(null);

  // Sitemap
  const [sitemapXml, setSitemapXml] = useState<string | null>(null);
  const [sitemapLoading, setSitemapLoading] = useState(false);

  // Robots
  const [robotsTxt, setRobotsTxt] = useState<string | null>(null);
  const [robotsLoading, setRobotsLoading] = useState(false);

  // Score history for stats tab (id → history)
  const [scoreHistories, setScoreHistories] = useState<Record<number, ScoreHistoryEntry[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const getFileName = (path: string | null | undefined) => {
    if (!path) return "";
    return path.substring(path.lastIndexOf('/') + 1);
  };

  useEffect(() => { loadEntries(); loadStats(); }, []);

  // Load sitemap & robots when tab is switched to "sitemap"
  useEffect(() => {
    if (subTab === "sitemap") {
      if (sitemapXml === null) loadSitemap();
      if (robotsTxt === null) loadRobots();
    }
  }, [subTab]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const response = await api.getSeoMetas({ per_page: 100 });
      // Backend now returns a plain array; guard against old paginated shape
      const arr = Array.isArray(response) ? response : (response as any)?.data ?? [];
      setEntries(arr as SeoEntry[]);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données SEO",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.getSeoStats() as SeoStats | null;
      if (data) setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSitemap = async () => {
    setSitemapLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/sitemap.xml`, { headers: { Accept: "application/xml" } });
      const text = await res.text();
      setSitemapXml(text);
    } catch {
      setSitemapXml("<!-- Impossible de charger le sitemap -->");
    } finally {
      setSitemapLoading(false);
    }
  };

  const loadRobots = async () => {
    setRobotsLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/robots.txt`);
      const text = await res.text();
      setRobotsTxt(text);
    } catch {
      setRobotsTxt("# Impossible de charger le fichier robots.txt");
    } finally {
      setRobotsLoading(false);
    }
  };

  // Load score histories for the top+worst pages shown in stats tab
  const loadScoreHistories = useCallback(async (pages: SeoEntry[]) => {
    if (!pages.length) return;
    setHistoryLoading(true);
    const results: Record<number, ScoreHistoryEntry[]> = {};
    await Promise.all(
      pages.map(async (page) => {
        if (!page.id) return;
        try {
          const res = await api.getSeoScoreHistory(page.id) as { history: ScoreHistoryEntry[] };
          results[page.id] = res?.history ?? [];
        } catch { /* skip */ }
      })
    );
    setScoreHistories(prev => ({ ...prev, ...results }));
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    if (subTab === "stats" && stats) {
      const pages = [...(stats.top_pages ?? []), ...(stats.worst_pages ?? [])];
      loadScoreHistories(pages);
    }
  }, [subTab, stats]);

  // ── Re-sync auto-managed JSON-LD from backend observers ─────────────────
  const handleResync = async () => {
    setResyncing(true);
    setSyncLog("Initialisation de la synchronisation...\n");
    try {
      const result = await api.resyncSeoEntities({
        type: syncType === 'all' ? undefined : syncType,
        force: syncForce
      }) as { success: boolean; synced: number; output?: string };

      if (result.success) {
        setSyncLog(prev => (prev || "") + `\n[OK] Synchronisation complétée.\n\nJournal serveur:\n----------------------------------------\n${result.output || `Succès : ${result.synced} entrée(s) synchronisée(s).`}`);
        toast({ title: '✅ Synchronisation réussie', description: `${result.synced} entrée(s) SEO synchronisée(s).` });
        await loadEntries();
        await loadStats();
      } else {
        setSyncLog(prev => (prev || "") + `\n[ERREUR] Échec de la synchronisation.\n`);
      }
    } catch (err: any) {
      setSyncLog(prev => (prev || "") + `\n[ERREUR] ${err?.message || "Erreur de communication avec l'API."}`);
      toast({ title: 'Erreur', description: 'Erreur lors de la re-synchronisation.', variant: 'destructive' });
    } finally {
      setResyncing(false);
    }
  };

  // ── Bulk analyze via single backend call ──────────────────────────────────
  const handleAnalyzeAll = async () => {
    if (!entries.length) return;
    setAnalyzingAll(true);
    try {
      const ids = entries.filter(e => e.id).map(e => e.id!);
      const result = await api.analyzeSeoMetaBulk(ids) as BulkAnalyzeResult;

      // Merge updated scores back into state
      const resultMap = new Map(result.results.map(r => [r.id, r]));
      setEntries(prev => prev.map(e => {
        if (!e.id) return e;
        const updated = resultMap.get(e.id);
        if (!updated) return e;
        return {
          ...e,
          seo_score: updated.seo_score,
          last_analyzed_at: updated.last_analyzed_at,
          recommendations: updated.recommendations,
        };
      }));

      toast({ title: "Analyse complète", description: `${result.analyzed} page(s) analysée(s) avec succès.` });
      loadStats();
    } catch (err) {
      toast({ title: "Erreur", description: "Erreur lors de l'analyse en masse.", variant: "destructive" });
    } finally {
      setAnalyzingAll(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        const updated = await api.updateSeoMeta(editing.id, editing) as SeoEntry;
        setEntries(entries.map(e => e.id === editing.id ? updated : e));
        toast({ title: "Succès", description: "Entrée SEO mise à jour" });
      } else {
        const created = await api.createSeoMeta(editing) as SeoEntry;
        setEntries([...entries, created]);
        toast({ title: "Succès", description: "Entrée SEO créée" });
      }
      setEditing(null);
      setCreating(false);
      loadStats();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erreur", description: "Erreur lors de la sauvegarde", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette entrée SEO ?")) return;
    try {
      await api.deleteSeoMeta(id);
      setEntries(entries.filter(e => e.id !== id));
      toast({ title: "Succès", description: "Entrée supprimée" });
      loadStats();
    } catch (err) {
      toast({ title: "Erreur", description: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const handleAnalyze = async (id: number) => {
    try {
      const result = await api.analyzeSeoMeta(id) as { seo_score: number; last_analyzed_at: string; recommendations: Recommendation[] };
      setEntries(entries.map(e => e.id === id ? {
        ...e,
        seo_score: result.seo_score,
        last_analyzed_at: result.last_analyzed_at,
        recommendations: result.recommendations,
      } : e));
      // If the editor is open for this entry, refresh its recommendations
      if (editing?.id === id) {
        setEditing(prev => prev ? { ...prev, seo_score: result.seo_score, recommendations: result.recommendations } : prev);
      }
      toast({ title: "Analyse terminée", description: `Score SEO : ${result.seo_score}/100` });
      loadStats();
    } catch (err) {
      toast({ title: "Erreur", description: "Erreur lors de l'analyse", variant: "destructive" });
    }
  };

  const filteredEntries = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      (e.page_identifier?.toLowerCase().includes(q)) ||
      (e.page_label?.toLowerCase().includes(q)) ||
      (e.meta_title?.toLowerCase().includes(q)) ||
      (e.meta_keywords?.toLowerCase().includes(q))
    );
  }, [entries, search]);

  // ─── Sub Tabs ───
  const subTabs = [
    { id: "list" as const, label: "Pages & Meta", icon: FileText },
    { id: "stats" as const, label: "Analyse & Scores", icon: BarChart3 },
    { id: "sitemap" as const, label: "Sitemap & Robots", icon: Globe },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  // ═══ EDITING FORM ═══
  if (editing) {
    const recs = editing.recommendations ?? [];
    const highRecs   = recs.filter(r => r.priority === "high");
    const mediumRecs = recs.filter(r => r.priority === "medium");
    const lowRecs    = recs.filter(r => r.priority === "low");

    return (
      <AdminLayout>
      <div className="space-y-4">

        {/* ── Sticky Save Bar ──────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border border-border rounded-xl px-5 py-3 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => { setEditing(null); setCreating(false); }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <span className="text-border">|</span>
            <h3 className="font-semibold text-sm text-foreground truncate">
              {creating ? "Nouvelle entrée SEO" : `✏️ ${editing.page_label || editing.page_identifier}`}
            </h3>
            {editing.id && <ScoreBadge score={editing.seo_score} />}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editing.id && (
              <button
                onClick={() => handleAnalyze(editing.id!)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors border border-border hover:bg-muted"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-analyser
              </button>
            )}
            <button onClick={() => { setEditing(null); setCreating(false); }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors">
              <X className="w-4 h-4" /> Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editing.page_identifier}
              className="flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm">
              {saving
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enregistrement…</>
                : <><Save className="w-4 h-4" /> Enregistrer</>}
            </button>
          </div>
        </div>

        {/* Recommendations Alert (shown when recs exist) */}
        {recs.length > 0 && (
          <div className="bg-background rounded-xl border border-border p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Recommandations SEO
              <span className="text-xs text-muted-foreground font-normal">({recs.length} point{recs.length > 1 ? "s" : ""})</span>
            </h4>
            <div className="space-y-2">
              {[...highRecs, ...mediumRecs, ...lowRecs].map((rec, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-lg p-3 text-sm ${
                  rec.priority === "high"   ? "bg-red-500/8 border border-red-500/20" :
                  rec.priority === "medium" ? "bg-amber-500/8 border border-amber-500/20" :
                                             "bg-blue-500/8 border border-blue-500/20"
                }`}>
                  <PriorityBadge priority={rec.priority} />
                  <span className="text-muted-foreground flex-1">{rec.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {(["meta", "social", "structured", "advanced"] as const).map(tab => (
            <button key={tab} onClick={() => setFormTab(tab)}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                formTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {tab === "meta" && "🏷️ Meta Tags"}
              {tab === "social" && "📱 Open Graph & Twitter"}
              {tab === "structured" && "📊 Données Structurées"}
              {tab === "advanced" && "⚙️ Avancé"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Form */}
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-background rounded-xl border border-border p-6 space-y-5">

              {/* === META TAB === */}
              {formTab === "meta" && (
                <>
                  {/* Page Identifier */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Identifiant de page *</label>
                      {creating ? (
                        <div className="space-y-2">
                          <select value={PAGE_TEMPLATES.find(t => t.value === editing.page_identifier) ? editing.page_identifier : "__custom__"}
                            onChange={e => {
                              const v = e.target.value;
                              if (v === "__custom__") {
                                setEditing({ ...editing, page_identifier: "", page_label: "" });
                              } else {
                                const tpl = PAGE_TEMPLATES.find(t => t.value === v);
                                setEditing({ ...editing, page_identifier: v, page_label: tpl?.label || "" });
                              }
                            }}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none">
                            {PAGE_TEMPLATES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                            <option value="__custom__">— Personnalisé —</option>
                          </select>
                          {!PAGE_TEMPLATES.find(t => t.value === editing.page_identifier) && (
                            <input type="text" placeholder="ex: product_42, category_5"
                              value={editing.page_identifier}
                              onChange={e => setEditing({ ...editing, page_identifier: e.target.value })}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none" />
                          )}
                        </div>
                      ) : (
                        <input type="text" value={editing.page_identifier} disabled
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Libellé (admin)</label>
                      <input type="text" placeholder="Nom affiché dans la liste" value={editing.page_label || ""}
                        onChange={e => setEditing({ ...editing, page_label: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none" />
                    </div>
                  </div>

                  {/* Targeted URL Banner */}
                  {editing.page_identifier && (
                    <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                        <span className="font-medium text-foreground flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-accent" /> URL ciblée par le SEO :
                        </span>
                        <a
                          href={getTargetUrl(editing.page_identifier)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent hover:underline font-mono text-xs flex items-center gap-1 font-semibold bg-accent/10 px-2 py-0.5 rounded border border-accent/20"
                        >
                          {getTargetUrl(editing.page_identifier)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      {editing.page_identifier.startsWith("showroom_") && (
                        <p className="text-[11px] text-muted-foreground pt-0.5">
                          📍 Ce showroom est structuré en données <strong>LocalBusiness</strong> sur la page unique <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">/showrooms</code>.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Meta Title */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-foreground">Titre SEO (meta title)</label>
                      <CharCounter value={editing.meta_title} max={70} optimal={[30, 60]} />
                    </div>
                    <input type="text" placeholder="Titre optimisé pour les moteurs de recherche"
                      value={editing.meta_title || ""}
                      onChange={e => setEditing({ ...editing, meta_title: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none" />
                    <p className="text-xs text-muted-foreground mt-1">Optimal : 30–60 caractères. Inclure les mots-clés principaux.</p>
                  </div>

                  {/* Meta Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-foreground">Description SEO (meta description)</label>
                      <CharCounter value={editing.meta_description} max={160} optimal={[120, 155]} />
                    </div>
                    <textarea rows={3} placeholder="Description optimisée pour les résultats de recherche"
                      value={editing.meta_description || ""}
                      onChange={e => setEditing({ ...editing, meta_description: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none resize-none" />
                    <p className="text-xs text-muted-foreground mt-1">Optimal : 120–155 caractères. Doit inciter au clic.</p>
                  </div>

                  {/* Meta Keywords */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">
                      <Tag className="w-3 h-3 inline mr-1" />Mots-clés (séparés par des virgules)
                    </label>
                    <textarea rows={2} placeholder="matelas, literie, sommier, matelas orthopédique, ..."
                      value={editing.meta_keywords || ""}
                      onChange={e => setEditing({ ...editing, meta_keywords: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none resize-none" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {(editing.meta_keywords || "").split(",").filter(k => k.trim()).length} mot(s)-clé(s).
                      Recommandé : 3–10 mots-clés pertinents.
                    </p>
                  </div>

                  {/* Robots */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">Directives Robots</label>
                    <select value={editing.meta_robots || "index,follow"}
                      onChange={e => setEditing({ ...editing, meta_robots: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none">
                      {ROBOTS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {(editing.meta_robots || "").includes("noindex") && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Cette page sera exclue des résultats de recherche.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* === SOCIAL TAB === */}
              {formTab === "social" && (
                <>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Share2 className="w-4 h-4" /> Open Graph (Facebook / LinkedIn)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-foreground">OG Titre</label>
                        <CharCounter value={editing.og_title} max={95} />
                      </div>
                      <input type="text" placeholder="Laisser vide = titre SEO" value={editing.og_title || ""}
                        onChange={e => setEditing({ ...editing, og_title: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">OG Type</label>
                      <select value={editing.og_type || "website"}
                        onChange={e => setEditing({ ...editing, og_type: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none">
                        {OG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-foreground">OG Description</label>
                      <CharCounter value={editing.og_description} max={200} />
                    </div>
                    <textarea rows={2} placeholder="Laisser vide = description SEO" value={editing.og_description || ""}
                      onChange={e => setEditing({ ...editing, og_description: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none resize-none" />
                  </div>

                  <SeoImageUploader
                    label="OG Image (Open Graph)"
                    hint="Utilisée par Facebook, LinkedIn et WhatsApp lors du partage. Format idéal : JPEG ou WebP."
                    recommendedSize={[1200, 630]}
                    folder="seo"
                    value={editing.og_image}
                    onChange={(path) => setEditing({ ...editing, og_image: path ?? "" })}
                  />

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">Locale</label>
                    <input type="text" value={editing.og_locale || "fr_FR"}
                      onChange={e => setEditing({ ...editing, og_locale: e.target.value })}
                      className="w-48 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none" />
                  </div>

                  <hr className="border-border" />

                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Twitter Cards
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Card Type</label>
                      <select value={editing.twitter_card || "summary_large_image"}
                        onChange={e => setEditing({ ...editing, twitter_card: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none">
                        {TWITTER_CARDS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-foreground">Twitter Titre</label>
                        <CharCounter value={editing.twitter_title} max={70} />
                      </div>
                      <input type="text" placeholder="Laisser vide = OG titre" value={editing.twitter_title || ""}
                        onChange={e => setEditing({ ...editing, twitter_title: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-foreground">Twitter Description</label>
                      <CharCounter value={editing.twitter_description} max={200} />
                    </div>
                    <textarea rows={2} placeholder="Laisser vide = OG description" value={editing.twitter_description || ""}
                      onChange={e => setEditing({ ...editing, twitter_description: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none resize-none" />
                  </div>

                  <SeoImageUploader
                    label="Twitter / X Image (optionnel)"
                    hint="Laisser vide pour réutiliser l'image OG. Taille recommandée : 1200×628px pour summary_large_image."
                    recommendedSize={[1200, 628]}
                    folder="seo"
                    value={editing.twitter_image}
                    onChange={(path) => setEditing({ ...editing, twitter_image: path ?? "" })}
                  />
                </>
              )}

              {/* === STRUCTURED DATA TAB === */}
              {formTab === "structured" && (
                <>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Code className="w-4 h-4" /> Données Structurées (JSON-LD / Schema.org)
                  </h4>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">Type Schema.org</label>
                    <select value={editing.json_ld_type || ""}
                      onChange={e => {
                        const type = e.target.value;
                        let defaultData: any = null;
                        if (type === "Product") {
                          defaultData = { "@context": "https://schema.org", "@type": "Product", name: "", description: "", image: "" };
                        } else if (type === "Organization") {
                          defaultData = { "@context": "https://schema.org", "@type": "Organization", name: "SiestaOfficiel", url: "", description: "" };
                        } else if (type === "LocalBusiness") {
                          defaultData = { "@context": "https://schema.org", "@type": "LocalBusiness", name: "SiestaOfficiel", address: {} };
                        } else if (type) {
                          defaultData = { "@context": "https://schema.org", "@type": type, name: "" };
                        }
                        setEditing({ ...editing, json_ld_type: type, json_ld_data: editing.json_ld_data || defaultData });
                      }}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none">
                      <option value="">— Aucun —</option>
                      {JSON_LD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {editing.json_ld_type && (
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Données JSON-LD</label>
                      <textarea rows={10}
                        value={editing.json_ld_data ? JSON.stringify(editing.json_ld_data, null, 2) : ""}
                        onChange={e => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setEditing({ ...editing, json_ld_data: parsed });
                          } catch {
                            // Invalid JSON, keep raw text for editing
                          }
                        }}
                        className="w-full px-3 py-2.5 bg-zinc-950 text-emerald-400 border border-border rounded-lg text-xs font-mono focus:ring-1 focus:ring-accent focus:outline-none resize-none" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Éditez le JSON ci-dessus. Les données seront injectées comme <code>&lt;script type="application/ld+json"&gt;</code>.
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-xs text-blue-400">
                      💡 <strong>Conseil :</strong> Les données structurées aident Google à comprendre votre contenu.
                      Utilisez "Product" pour les fiches produit, "Organization" pour la page d'accueil,
                      "LocalBusiness" pour les showrooms.
                    </p>
                  </div>
                </>
              )}

              {/* === ADVANCED TAB === */}
              {formTab === "advanced" && (
                <>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Paramètres Avancés
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Priorité Sitemap</label>
                      <input type="number" step="0.1" min="0" max="1"
                        value={editing.priority ?? 0.5}
                        onChange={e => setEditing({ ...editing, priority: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none" />
                      <p className="text-xs text-muted-foreground mt-1">0.0 (basse) à 1.0 (haute)</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Fréquence de changement</label>
                      <select value={editing.changefreq || "weekly"}
                        onChange={e => setEditing({ ...editing, changefreq: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none">
                        {CHANGEFREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Statut</label>
                      <div className="flex items-center gap-3 mt-1">
                        <button onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editing.is_active ? "bg-emerald-500" : "bg-zinc-600"}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editing.is_active ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                        <span className="text-sm text-foreground">{editing.is_active ? "Actif" : "Inactif"}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">Notes internes</label>
                    <textarea rows={3} placeholder="Notes pour l'équipe (non visibles publiquement)"
                      value={editing.notes || ""}
                      onChange={e => setEditing({ ...editing, notes: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none resize-none" />
                  </div>

                  {editing.last_analyzed_at && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                      <Clock className="w-3.5 h-3.5" />
                      Dernière analyse : {new Date(editing.last_analyzed_at).toLocaleString("fr-FR")}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Save Button — bas du formulaire (doublon accessible) */}
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <button
                onClick={handleSave}
                disabled={saving || !editing.page_identifier}
                className="flex items-center gap-2 bg-accent text-accent-foreground px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enregistrement…</>
                  : <><Save className="w-4 h-4" /> Enregistrer les modifications</>}
              </button>
              <button
                onClick={() => { setEditing(null); setCreating(false); }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground px-4 py-2.5 rounded-lg text-sm transition-colors">
                <X className="w-4 h-4" /> Annuler
              </button>
            </div>
          </div>

          {/* Previews Sidebar */}
          <div className="space-y-4">
            {/* Auto-managed JSON-LD notice */}
            {isAutoManaged(editing) && (
              <div className="bg-violet-500/8 border border-violet-500/25 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-violet-400" />
                  <p className="text-xs font-semibold text-violet-400">Données structurées auto-gérées</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Le JSON-LD de cette entrée est régénéré automatiquement par le système d'Observers
                  à chaque modification de l'entité source (<strong>{entityTypeLabel(editing)}</strong>).
                  Toute modification manuelle sera écrasée lors de la prochaine synchronisation.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-violet-400">
                  <Link className="w-3 h-3" />
                  Entité liée : <code className="bg-violet-500/10 px-1.5 py-0.5 rounded font-mono">{editing.seoable_type?.split('\\').pop()} #{String(editing.seoable_id).slice(0,8)}…</code>
                </div>
              </div>
            )}
            <SerpPreview title={editing.meta_title} description={editing.meta_description} url={getTargetUrl(editing.page_identifier)} />
            <SocialPreview
              title={editing.og_title || editing.meta_title}
              description={editing.og_description || editing.meta_description}
              image={editing.og_image}
              url={getTargetUrl(editing.page_identifier)}
              type="og"
            />
            <SocialPreview
              title={editing.twitter_title || editing.og_title || editing.meta_title}
              description={editing.twitter_description || editing.og_description || editing.meta_description}
              image={editing.twitter_image || editing.og_image}
              url={getTargetUrl(editing.page_identifier)}
              type="twitter"
            />

            {/* Keywords Chips */}
            {editing.meta_keywords && (
              <div className="bg-background rounded-xl border border-border p-4">
                <p className="text-xs font-medium text-foreground mb-2">Mots-clés</p>
                <div className="flex flex-wrap gap-1.5">
                  {editing.meta_keywords.split(",").filter(k => k.trim()).map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full border border-accent/20">
                      <Tag className="w-2.5 h-2.5" /> {kw.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Score breakdown legend */}
            <div className="bg-background rounded-xl border border-border p-4">
              <p className="text-xs font-medium text-foreground mb-3 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-muted-foreground" /> Barème de score
              </p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {[
                  { label: "Titre SEO", pts: "22 pts" },
                  { label: "Description SEO", pts: "22 pts" },
                  { label: "Mots-clés + cohérence", pts: "14 pts" },
                  { label: "Image OG (existence disque)", pts: "10 pts" },
                  { label: "OG titre + description", pts: "8 pts" },
                  { label: "JSON-LD + validation schéma", pts: "12 pts" },
                  { label: "Robots (pas noindex)", pts: "5 pts" },
                  { label: "Pénalités doublons / noindex", pts: "−5 à −12" },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.label}</span>
                    <span className="font-mono text-foreground">{item.pts}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
    <h1 className="text-2xl font-black mb-6">SEO</h1>
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {subTabs.map(tab => (
          <button key={tab.id} onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-2 flex-1 justify-center px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
              subTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ LIST TAB ═══ */}
      {subTab === "list" && (
        <>
          {/* Actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Rechercher page, titre, mot-clé..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-accent focus:outline-none" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Re-sync auto-managed entries from observer data */}
              <button
                onClick={() => { setIsSyncModalOpen(true); setSyncLog(null); }}
                title="Re-générer JSON-LD depuis les données sources (produits, catégories, showrooms, articles)"
                className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 text-violet-400 px-4 py-2 rounded-lg text-xs font-medium hover:bg-violet-500/20 transition-colors">
                <Bot className="w-3.5 h-3.5" /> Re-sync Auto
              </button>
              {/* Bulk analyze button — single API call */}
              <button
                onClick={handleAnalyzeAll}
                disabled={analyzingAll || entries.length === 0}
                title="Analyser toutes les pages en une seule requête"
                className="flex items-center gap-2 bg-muted border border-border text-foreground px-4 py-2 rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors disabled:opacity-50">
                {analyzingAll ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyse en cours…</>
                ) : (
                  <><Zap className="w-3.5 h-3.5 text-amber-400" /> Analyser tout</>
                )}
              </button>
              <button onClick={() => { setEditing({ ...EMPTY_SEO }); setCreating(true); setFormTab("meta"); }}
                className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-xs font-medium hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /> Nouvelle entrée
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Page</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Titre SEO</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Mots-clés</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Score</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Statut</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Aucune entrée SEO trouvée</p>
                        <p className="text-xs mt-1">Créez votre première entrée pour optimiser votre référencement</p>
                      </td>
                    </tr>
                  ) : filteredEntries.map(entry => (
                    <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground text-sm">{entry.page_label || entry.page_identifier}</p>
                            {isAutoManaged(entry) && (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${entityTypeColor(entry)}`}>
                                <Bot className="w-2.5 h-2.5" /> {entityTypeLabel(entry)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/40 text-[11px]">
                              {entry.page_identifier}
                            </span>
                            <a
                              href={getTargetUrl(entry.page_identifier)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-accent hover:underline font-mono text-[11px] bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20 font-medium"
                              title="Ouvrir l'URL ciblée par le SEO dans un nouvel onglet"
                            >
                              <Globe className="w-3 h-3" />
                              {getPagePath(entry.page_identifier)}
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground truncate max-w-[200px]">{entry.meta_title || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{entry.meta_description || "Pas de description"}</p>
                        {/* Show high-priority recommendation count if any */}
                        {(entry.recommendations ?? []).filter(r => r.priority === "high").length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-red-400 mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {(entry.recommendations ?? []).filter(r => r.priority === "high").length} problème(s) urgent(s)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {(entry.meta_keywords || "").split(",").filter(k => k.trim()).slice(0, 3).map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">{kw.trim()}</span>
                          ))}
                          {(entry.meta_keywords || "").split(",").filter(k => k.trim()).length > 3 && (
                            <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                              +{(entry.meta_keywords || "").split(",").filter(k => k.trim()).length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ScoreBadge score={entry.seo_score} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.is_active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs"><Eye className="w-3 h-3" /> Actif</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-zinc-500 text-xs"><EyeOff className="w-3 h-3" /> Inactif</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAnalyze(entry.id!)}
                            title="Recalculer le score SEO"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setEditing({ ...entry }); setFormTab("meta"); }}
                            className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-accent/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                            <Save className="w-3 h-3" /> Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id!)}
                            title="Supprimer"
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══ STATS TAB ═══ */}
      {subTab === "stats" && stats && (
        <div className="space-y-6">
          {/* Score Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-xs text-muted-foreground">Score Moyen</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.avg_score}<span className="text-base text-muted-foreground">/100</span></p>
              <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${stats.avg_score >= 80 ? "bg-emerald-500" : stats.avg_score >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${stats.avg_score}%` }} />
              </div>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-xs text-muted-foreground">Pages Actives</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.active}<span className="text-base text-muted-foreground">/{stats.total}</span></p>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400" /> Excellentes</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{stats.score_distribution.excellent}</p>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-400" /> À améliorer</p>
              <p className="text-3xl font-bold text-red-400 mt-1">{stats.score_distribution.poor}</p>
            </div>
          </div>

          {/* Missing Data Alert */}
          <div className="bg-background rounded-xl border border-border p-6">
            <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Éléments Manquants
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Sans titre SEO", count: stats.missing.title, icon: "🏷️" },
                { label: "Sans description", count: stats.missing.description, icon: "📝" },
                { label: "Sans mots-clés", count: stats.missing.keywords, icon: "🔑" },
                { label: "Sans image OG", count: stats.missing.og_image, icon: "🖼️" },
              ].map((item, i) => (
                <div key={i} className={`rounded-lg p-3 text-center ${item.count > 0 ? "bg-amber-500/10 border border-amber-500/30" : "bg-emerald-500/10 border border-emerald-500/30"}`}>
                  <p className="text-lg mb-1">{item.icon}</p>
                  <p className={`text-2xl font-bold ${item.count > 0 ? "text-amber-400" : "text-emerald-400"}`}>{item.count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top & Worst Pages with trend sparklines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-background rounded-xl border border-border p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Top 5 — Meilleures Pages
              </h4>
              <div className="space-y-2">
                {(stats.top_pages || []).map((page: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{page.page_label || page.page_identifier}</p>
                      <p className="text-xs text-muted-foreground truncate">{page.meta_title}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {page.id && scoreHistories[page.id] && (
                        <ScoreSparkline history={scoreHistories[page.id]} />
                      )}
                      <ScoreBadge score={page.seo_score} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-background rounded-xl border border-border p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" /> Pages à Améliorer
              </h4>
              <div className="space-y-2">
                {(stats.worst_pages || []).map((page: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{page.page_label || page.page_identifier}</p>
                      <p className="text-xs text-muted-foreground truncate">{page.meta_title || "Pas de titre"}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {page.id && scoreHistories[page.id] && (
                        <ScoreSparkline history={scoreHistories[page.id]} />
                      )}
                      <ScoreBadge score={page.seo_score} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Score Criteria Documentation for marketing team */}
          <div className="bg-background rounded-xl border border-border p-6">
            <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" /> Barème de Notation SEO — Référence pour l'équipe marketing
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Critère</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Poids</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Condition optimale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[
                    { label: "Titre SEO", weight: "22 pts", condition: "30–60 caractères, optimal = 22 pts | 20–70 = 13 pts | sinon 4 pts" },
                    { label: "Description SEO", weight: "22 pts", condition: "120–155 caractères = 22 pts | 80–160 = 13 pts | sinon 4 pts" },
                    { label: "Mots-clés (quantité)", weight: "8 pts", condition: "3 à 10 mots-clés = 8 pts | ≥ 1 = 4 pts" },
                    { label: "Cohérence sémantique", weight: "6 pts", condition: "≥ 50% des mots-clés dans le titre/description = 6 pts | > 0% = 3 pts" },
                    { label: "Image OG (sur disque)", weight: "10 pts", condition: "Fichier existant sur le serveur = 10 pts | chemin invalide = 2 pts" },
                    { label: "OG titre + description", weight: "8 pts", condition: "4 pts par champ (fallback meta accepté)" },
                    { label: "JSON-LD + schéma valide", weight: "12 pts", condition: "Type + données = 7 pts, champs requis présents = +5 pts" },
                    { label: "Robots indexable", weight: "5 pts", condition: "Pas de noindex = +5 pts | noindex = pénalité −5 pts" },
                    { label: "Pénalité titre dupliqué", weight: "−7 pts", condition: "Titre identique à une autre page active" },
                    { label: "Pénalité description dupliquée", weight: "−5 pts", condition: "Description identique à une autre page active" },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="py-2 px-3 text-foreground font-medium">{row.label}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`font-mono font-semibold ${row.weight.startsWith("−") ? "text-red-400" : "text-emerald-400"}`}>{row.weight}</span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{row.condition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4 italic">
              Score final = somme des points, écrêté entre 0 et 100. L'historique des scores est sauvegardé à chaque analyse pour visualiser les tendances.
            </p>
          </div>
        </div>
      )}

      {/* ═══ SITEMAP TAB ═══ */}
      {subTab === "sitemap" && (
        <div className="space-y-6">

          {/* Sitemap XML — real content from API */}
          <div className="bg-background rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4" /> Sitemap XML (live)
              </h4>
              <div className="flex items-center gap-2">
                <a
                  href={`${API_ROOT}/sitemap.xml`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-accent hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Ouvrir
                </a>
                <button
                  onClick={() => { setSitemapXml(null); loadSitemap(); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${sitemapLoading ? "animate-spin" : ""}`} /> Actualiser
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Généré dynamiquement depuis les entrées SEO actives, les produits et les catégories.
            </p>
            <div className="bg-zinc-950 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-80 overflow-y-auto">
              {sitemapLoading ? (
                <div className="flex items-center gap-2 text-zinc-500">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Chargement…
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-all">{sitemapXml || "<!-- Cliquez sur Actualiser -->"}</pre>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              📍 Accessible à : <code className="bg-muted px-1.5 py-0.5 rounded">{API_ROOT}/sitemap.xml</code>
            </p>
          </div>

          {/* Robots.txt */}
          <div className="bg-background rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" /> Robots.txt (live)
              </h4>
              <div className="flex items-center gap-2">
                <a
                  href={`${API_ROOT}/robots.txt`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-accent hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Ouvrir
                </a>
                <button
                  onClick={() => { setRobotsTxt(null); loadRobots(); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${robotsLoading ? "animate-spin" : ""}`} /> Actualiser
                </button>
              </div>
            </div>
            <div className="bg-zinc-950 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-80 overflow-y-auto">
              {robotsLoading ? (
                <div className="flex items-center gap-2 text-zinc-500">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Chargement…
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-all">{robotsTxt || "# Cliquez sur Actualiser"}</pre>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              📍 Accessible à : <code className="bg-muted px-1.5 py-0.5 rounded">{API_ROOT}/robots.txt</code>
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-xs text-blue-400">
              💡 <strong>Information :</strong> Le sitemap et robots.txt sont générés dynamiquement par le serveur.
              Ils s'actualisent automatiquement lorsque vous ajoutez des produits, catégories ou entrées SEO.
            </p>
          </div>
        </div>
      )}

      {/* ─── MODAL RE-SYNC AUTOMATIQUE ─── */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-100 flex items-center gap-2 text-sm">
                <Bot className="w-5 h-5 text-violet-400" />
                Synchronisation SEO Automatique
              </h3>
              <button
                onClick={() => setIsSyncModalOpen(false)}
                disabled={resyncing}
                className="text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <p className="text-xs text-zinc-400">
                Ce module permet de re-générer les données structurées JSON-LD et les métadonnées SEO de base (titres, descriptions, mots-clés, images OG) de manière synchronisée avec les modèles de la base de données.
              </p>

              {/* Type selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Type de contenu à synchroniser</label>
                <select
                  value={syncType}
                  onChange={(e) => setSyncType(e.target.value as any)}
                  disabled={resyncing}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="all">Tout synchroniser</option>
                  <option value="products">Produits uniquement</option>
                  <option value="categories">Catégories uniquement</option>
                  <option value="showrooms">Showrooms uniquement</option>
                  <option value="blog">Articles de blog uniquement</option>
                </select>
              </div>

              {/* Force Option */}
              <div className="flex items-start gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <input
                  type="checkbox"
                  id="syncForce"
                  checked={syncForce}
                  onChange={(e) => setSyncForce(e.target.checked)}
                  disabled={resyncing}
                  className="mt-0.5 rounded border-zinc-800 bg-zinc-950 text-violet-600 focus:ring-violet-500 focus:ring-offset-zinc-950"
                />
                <div className="space-y-1">
                  <label htmlFor="syncForce" className="text-xs font-semibold text-zinc-200 cursor-pointer select-none">
                    Forcer la réécriture des méta personnalisées
                  </label>
                  <p className="text-[10px] text-zinc-400">
                    Si activé, les titres, descriptions et mots-clés de base que vous avez saisis manuellement seront remplacés par les données générées à partir du contenu en direct.
                  </p>
                </div>
              </div>

              {/* Log / Progress output */}
              {syncLog && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    Journal d'exécution
                  </label>
                  <div className="bg-black border border-zinc-800 rounded-lg p-3 font-mono text-[10px] text-zinc-300 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {syncLog}
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                disabled={resyncing}
                className="px-4 py-2 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleResync}
                disabled={resyncing}
                className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {resyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    Lancer la synchronisation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
};

export default SeoPanel;