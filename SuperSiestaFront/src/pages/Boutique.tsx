import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useOptimizedProducts } from "@/hooks/useOptimizedProducts";
import { useGammes } from "@/hooks/useGammes";
import ProductCard from "@/components/ProductCard";
import LoadMore from "@/components/LoadMore";
import { SlidersHorizontal, Loader2, ChevronDown, Check, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { api } from "@/lib/apiClient";
import { trackSearch } from "@/services/metaPixel";
import { useLanguage } from "@/context/LanguageContext";

// ------------------------------------------------------------------
// Composants définis EN DEHORS de Boutique() : leur identité ne change
// pas entre deux rendus, donc React ne les démonte/remonte jamais
// (c'est ce qui causait la réouverture des feuilles de filtres mobiles).
// ------------------------------------------------------------------

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-sm px-3 py-1.5 rounded-xl transition-colors capitalize ${
        active ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function MobileFilterTrigger({
  label,
  isActive,
  badge,
  isOpen,
  onClick,
}: {
  label: string;
  isActive: boolean;
  badge?: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
<button
  onClick={onClick}
  className={`w-full flex items-center justify-between px-3 py-2 rounded-full border text-xs font-semibold transition-all ${
    isActive
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-background text-foreground border-border hover:bg-muted"
  }`}
>
  <span className="truncate">
    {label}
  </span>

  <div className="flex items-center gap-1 shrink-0">
    {badge && (
      <span
        className={`flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
          isActive
            ? "bg-primary-foreground text-primary"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {badge}
      </span>
    )}

    <ChevronDown
      className={`w-3 h-3 transition-transform ${
        isOpen ? "rotate-180" : ""
      }`}
    />
  </div>
</button>
  );
}

// Panneau "bottom sheet" — s'ouvre depuis le bas, largeur pleine, ne dépasse jamais de l'écran
function MobileSheet({
  open,
  title,
  onClose,
  onClear,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl w-full max-h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center justify-center pt-2.5 pb-1 shrink-0">
        <div className="w-10 h-1 rounded-full bg-border" />
      </div>
      <div className="flex items-center justify-between px-4 pb-2 shrink-0">
        <h3 className="text-sm font-bold">{title}</h3>
        <div className="flex items-center gap-3">
          {onClear && (
            <button onClick={onClear} className="text-[10px] text-primary font-black uppercase tracking-widest hover:underline">
              Effacer
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="px-4 pb-6 overflow-y-auto">{children}</div>
    </div>
  );
}

export default function Boutique() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  // Build initial filters from URL params to avoid an extra unfiltered fetch
  const initialFilters: any = {};
  if (searchParams.get("categorie") && searchParams.get("categorie") !== "Tous") initialFilters.categorie = searchParams.get("categorie");
  if (searchParams.get("fermete") && searchParams.get("fermete") !== "Tous") initialFilters.fermete = searchParams.get("fermete");
  if (searchParams.get("gamme") && searchParams.get("gamme") !== "Tous") initialFilters.gamme = searchParams.get("gamme");
  if (searchParams.get("dimension") && searchParams.get("dimension") !== "Tous") initialFilters.dimension = searchParams.get("dimension");

  const { products, loading, hasMore, loadMore, search, filterClientSide } = useOptimizedProducts(initialFilters as any, { preloadAll: true, maxPerPage: 10000 });
  const { data: gammesData } = useGammes();
  const gammesList = ["Tous", ...(gammesData || []).map((g) => g.name)];

  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [dbFermetes, setDbFermetes] = useState<string[]>([]);
  const [dbDimensions, setDbDimensions] = useState<string[]>([]);

  useEffect(() => {
    const fetchSelects = async () => {
      try {
        const [cats, ferms, dims] = await Promise.all([
          api.get<{ label: string }[]>("/categories"),
          api.get<{ label: string }[]>("/fermetes"),
          api.get<{ label: string }[]>("/dimensions")
        ]);
        setDbCategories((cats || []).map(c => c.label));
        setDbFermetes((ferms || []).map(f => f.label));
        setDbDimensions((dims || []).map(d => d.label));
      } catch (err) {
        console.error("Error fetching filters:", err);
      }
    };
    fetchSelects();
  }, []);

  const CATEGORIES = ["Tous", ...dbCategories];
  const FERMETES = ["Tous", ...dbFermetes];
  const DIMENSIONS = ["Tous", ...dbDimensions];

  const getArrayParam = (name: string): string[] => {
    const val = searchParams.get(name);
    if (!val || val === "Tous") return ["Tous"];
    return val.split(",");
  };

  const [categories, setCategories] = useState<string[]>(getArrayParam("categorie"));
  const [fermetes, setFermetes] = useState<string[]>(getArrayParam("fermete"));
  const [gammes, setGammes] = useState<string[]>(getArrayParam("gamme"));
  // Dimensions : sélection UNIQUE uniquement (jamais de multi-select), sur mobile comme sur desktop
  const [dimensions, setDimensions] = useState<string[]>(() => {
    const arr = getArrayParam("dimension");
    return arr.length > 0 ? [arr[0]] : ["Tous"];
  });
  const [priceMax, setPriceMax] = useState(3000);
  const [showFilters, setShowFilters] = useState(false);
  const [dimSearch, setDimSearch] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Lock body scroll while a mobile bottom-sheet filter is open
  useEffect(() => {
    if (activeDropdown) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [activeDropdown]);

  // Multi-select (catégorie / gamme / fermeté)
  const toggleFilter = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (item === "Tous") {
      setList(["Tous"]);
      return;
    }
    const next = list.filter((x) => x !== "Tous");
    if (next.includes(item)) {
      const filtered = next.filter((x) => x !== item);
      setList(filtered.length === 0 ? ["Tous"] : filtered);
    } else {
      setList([...next, item]);
    }
  };

  // Dimensions : sélection UNIQUE — cliquer sur une dimension déjà active revient à "Tous"
  const selectDimension = (item: string) => {
    if (item === "Tous") {
      setDimensions(["Tous"]);
      return;
    }
    setDimensions((prev) => (prev.includes(item) ? ["Tous"] : [item]));
  };

  // Send filter changes to server (debounced) but apply client-side immediately
  const filterTimer = useRef<number | null>(null);
  const handleFilterChange = async () => {
    const filters: any = {};

    if (categories.length > 0 && !categories.includes("Tous")) filters.categorie = categories;
    if (fermetes.length > 0 && !fermetes.includes("Tous")) filters.fermete = fermetes;
    if (gammes.length > 0 && !gammes.includes("Tous")) filters.gamme = gammes;
    if (dimensions.length > 0 && !dimensions.includes("Tous")) filters.dimension = dimensions[0];

    // Track Meta Pixel Search
    const searchTerms = [
      filters.categorie ? `Catégorie: ${categories.join(",")}` : "",
      filters.gamme ? `Gamme: ${gammes.join(",")}` : "",
      filters.dimension ? `Dimension: ${dimensions[0]}` : "",
    ].filter(Boolean).join(" | ");

    if (searchTerms) {
      trackSearch(searchTerms);
    }

    // Update URL params to reflect active filters
    const sp = new URLSearchParams();
    if (filters.categorie) sp.set('categorie', categories.join(','));
    if (filters.fermete) sp.set('fermete', fermetes.join(','));
    if (filters.gamme) sp.set('gamme', gammes.join(','));
    if (filters.dimension) sp.set('dimension', dimensions[0]);
    setSearchParams(sp, { replace: true });

    // Immediate client-side filtering for snappy UI
    try {
      filterClientSide(filters);
    } catch (err) {
      // ignore, fallback to server search below
    }

    // Debounce server call: wait for user to finish changing filters
    if (filterTimer.current) {
      window.clearTimeout(filterTimer.current)
    }
    filterTimer.current = window.setTimeout(async () => {
      await search(filters);
      filterTimer.current = null
    }, 450)
  };

  // Re-run when filters change (skip initial mount because initialFilters already applied)
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    handleFilterChange();
  }, [categories, fermetes, gammes, dimensions]);

  if (loading && products.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <span className="text-xs font-bold text-primary uppercase tracking-widest">{t.shop.title}</span>
        <h1 className="text-2xl sm:text-3xl font-black mt-1 mb-2">{t.shop.allMattresses}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {products.length} {t.shop.productsFound}
          {hasMore && " (+ de résultats disponibles)"}
        </p>
      </div>

      <div className="flex gap-6">
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="bg-card border border-border rounded-2xl p-5 sticky top-24 space-y-6">
            <div>
              <h3 className="text-sm font-bold mb-3">{t.shop.category}</h3>
              <div className="space-y-2">
                {CATEGORIES.map((c) => (
                  <FilterButton
                    key={c}
                    active={categories.includes(c)}
                    onClick={() => toggleFilter(categories, setCategories, c)}
                  >
                    {c === "Tous" ? t.common.all : c}
                  </FilterButton>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-3">{t.shop.range}</h3>
              <div className="space-y-2">
                {gammesList.map((g) => (
                  <FilterButton
                    key={g}
                    active={gammes.includes(g)}
                    onClick={() => toggleFilter(gammes, setGammes, g)}
                  >
                    {g === "Tous" ? t.common.all : g}
                  </FilterButton>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-3">{t.shop.firmness}</h3>
              <div className="space-y-2">
                {FERMETES.map((f) => (
                  <FilterButton
                    key={f}
                    active={fermetes.includes(f)}
                    onClick={() => toggleFilter(fermetes, setFermetes, f)}
                  >
                    {f === "Tous" ? t.common.all : f}
                  </FilterButton>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">{t.shop.dimension}</h3>
                {!dimensions.includes("Tous") && (
                  <button
                    onClick={() => setDimensions(["Tous"])}
                    className="text-[10px] text-primary font-black uppercase tracking-widest hover:underline"
                  >
                    {t.common.cancel}
                  </button>
                )}
              </div>

              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Rechercher une taille..."
                  value={dimSearch}
                  onChange={(e) => setDimSearch(e.target.value)}
                  className="w-full bg-muted/50 border-none rounded-xl py-2 px-3 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {DIMENSIONS.filter(d => d === "Tous" || d.toLowerCase().includes(dimSearch.toLowerCase())).map((d) => (
                  <button
                    key={d}
                    onClick={() => selectDimension(d)}
                    className={`text-[10px] py-2 px-2 rounded-lg border transition-all truncate font-bold uppercase tracking-tighter ${
                      dimensions.includes(d)
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[0.98]"
                        : "bg-background border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-3">{t.shop.maxPrice}</h3>
              <input type="range" min={200} max={3000} step={50} value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="w-full accent-primary" />
              <p className="text-sm text-primary font-bold mt-1">{formatPrice(priceMax)}</p>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* Barre de filtres mobile */}
            <div
              ref={dropdownRef}
              className="lg:hidden grid grid-cols-2 gap-2 mb-6"
            >
            <MobileFilterTrigger
              label={t.shop.category}
              isActive={!categories.includes("Tous")}
              badge={!categories.includes("Tous") ? String(categories.length) : undefined}
              isOpen={activeDropdown === "category"}
              onClick={() => setActiveDropdown(activeDropdown === "category" ? null : "category")}
            />
            <MobileFilterTrigger
              label={t.shop.range}
              isActive={!gammes.includes("Tous")}
              badge={!gammes.includes("Tous") ? String(gammes.length) : undefined}
              isOpen={activeDropdown === "gamme"}
              onClick={() => setActiveDropdown(activeDropdown === "gamme" ? null : "gamme")}
            />
            <MobileFilterTrigger
              label={t.shop.firmness}
              isActive={!fermetes.includes("Tous")}
              badge={!fermetes.includes("Tous") ? String(fermetes.length) : undefined}
              isOpen={activeDropdown === "fermete"}
              onClick={() => setActiveDropdown(activeDropdown === "fermete" ? null : "fermete")}
            />
            <MobileFilterTrigger
              label={t.shop.dimension}
              isActive={!dimensions.includes("Tous")}
              badge={!dimensions.includes("Tous") ? dimensions[0] : undefined}
              isOpen={activeDropdown === "dimension"}
              onClick={() => setActiveDropdown(activeDropdown === "dimension" ? null : "dimension")}
            />

            {/* Overlay derrière la feuille mobile */}
            {activeDropdown && (
              <div
                className="fixed inset-0 bg-black/40 z-40"
                onClick={() => setActiveDropdown(null)}
              />
            )}

            <MobileSheet open={activeDropdown === "category"} title="Catégorie" onClose={() => setActiveDropdown(null)}>
              <div className="space-y-1">
                {CATEGORIES.map((c) => {
                  const active = categories.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => toggleFilter(categories, setCategories, c)}
                      className={`w-full text-left text-sm px-3 py-2.5 rounded-xl flex items-center justify-between font-semibold capitalize ${
                        active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <span>{c}</span>
                      {active && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </MobileSheet>

            <MobileSheet open={activeDropdown === "gamme"} title="Gamme" onClose={() => setActiveDropdown(null)}>
              <div className="space-y-1">
                {gammesList.map((g) => {
                  const active = gammes.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => toggleFilter(gammes, setGammes, g)}
                      className={`w-full text-left text-sm px-3 py-2.5 rounded-xl flex items-center justify-between font-semibold capitalize ${
                        active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <span>{g}</span>
                      {active && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </MobileSheet>

            <MobileSheet open={activeDropdown === "fermete"} title="Fermeté" onClose={() => setActiveDropdown(null)}>
              <div className="space-y-1">
                {FERMETES.map((f) => {
                  const active = fermetes.includes(f);
                  return (
                    <button
                      key={f}
                      onClick={() => toggleFilter(fermetes, setFermetes, f)}
                      className={`w-full text-left text-sm px-3 py-2.5 rounded-xl flex items-center justify-between font-semibold capitalize ${
                        active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <span>{f}</span>
                      {active && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </MobileSheet>

            {/* Dimensions — sélection UNIQUE, se ferme automatiquement après le choix */}
            <MobileSheet
              open={activeDropdown === "dimension"}
              title="Dimensions"
              onClose={() => setActiveDropdown(null)}
              onClear={!dimensions.includes("Tous") ? () => setDimensions(["Tous"]) : undefined}
            >
              <input
                type="text"
                placeholder="Rechercher une taille..."
                value={dimSearch}
                onChange={(e) => setDimSearch(e.target.value)}
                className="w-full bg-muted/50 border-none rounded-xl py-2.5 px-3 text-sm mb-3 focus:ring-1 focus:ring-primary outline-none transition-all"
              />
              <div className="grid grid-cols-3 gap-2">
                {DIMENSIONS.filter(d => d === "Tous" || d.toLowerCase().includes(dimSearch.toLowerCase())).map((d) => {
                  const active = dimensions.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => {
                        selectDimension(d);
                        setActiveDropdown(null);
                      }}
                      className={`text-xs py-2.5 px-2 rounded-lg font-black uppercase transition-all border ${
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </MobileSheet>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 sm:py-20 text-muted-foreground px-4">
              <p className="text-base sm:text-lg font-medium">{t.shop.noProducts}</p>
              <button onClick={() => { setCategories(["Tous"]); setFermetes(["Tous"]); setGammes(["Tous"]); setDimensions(["Tous"]); }} className="mt-4 text-primary hover:underline text-sm">{t.shop.resetFilters}</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
                {
                  // Sort products according to gammes order (if available)
                  (() => {
                    const order = (gammesData || []).map(g => g.name);
                    const idx = (g: string | undefined) => {
                      if (!g) return Number.MAX_SAFE_INTEGER;
                      const i = order.indexOf(g);
                      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
                    }
                    const sorted = [...products].sort((a, b) => idx(a.gamme) - idx(b.gamme));
                    return sorted.map((p) => (
                      <ProductCard
                  key={p.id}
                  product={p}
                  selectedDimension={dimensions[0]}
                  selectedCategorie={categories[0]}
                  selectedGamme={gammes[0]}
                  selectedFermete={fermetes[0]}
                />
                    ));
                  })()
                }
              </div>
              <LoadMore hasMore={hasMore} isLoading={loading} onLoadMore={loadMore} className="mt-10" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}