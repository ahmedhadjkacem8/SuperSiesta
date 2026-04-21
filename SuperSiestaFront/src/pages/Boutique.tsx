import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useOptimizedProducts } from "@/hooks/useOptimizedProducts";
import { useGammes } from "@/hooks/useGammes";
import ProductCard from "@/components/ProductCard";
import LoadMore from "@/components/LoadMore";
import { SlidersHorizontal, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

import { api } from "@/lib/apiClient";

export default function Boutique() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Build initial filters from URL params to avoid an extra unfiltered fetch
  const initialFilters: any = {};
  if (searchParams.get("categorie") && searchParams.get("categorie") !== "Tous") initialFilters.categorie = searchParams.get("categorie");
  if (searchParams.get("fermete") && searchParams.get("fermete") !== "Tous") initialFilters.fermete = searchParams.get("fermete");
  if (searchParams.get("gamme") && searchParams.get("gamme") !== "Tous") initialFilters.gamme = searchParams.get("gamme");
  if (searchParams.get("dimension") && searchParams.get("dimension") !== "Tous") initialFilters.dimension = searchParams.get("dimension");

  const { products, loading, hasMore, loadMore, search, filterClientSide } = useOptimizedProducts(initialFilters as any, { preloadAll: true, maxPerPage: 10000 });
  const { data: gammesData } = useGammes();
  const gammes = ["Tous", ...(gammesData || []).map((g) => g.name)];

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

  const [categorie, setCategorie] = useState(searchParams.get("categorie") || "Tous");
  const [fermete, setFermete] = useState(searchParams.get("fermete") || "Tous");
  const [gamme, setGamme] = useState(searchParams.get("gamme") || "Tous");
  const [dimension, setDimension] = useState(searchParams.get("dimension") || "Tous");
  const [priceMax, setPriceMax] = useState(3000);
  const [showFilters, setShowFilters] = useState(false);
  const [dimSearch, setDimSearch] = useState("");

  // Send filter changes to server (debounced) but apply client-side immediately
  const filterTimer = useRef<number | null>(null);
  const handleFilterChange = async () => {
    const filters: any = {};

    if (categorie !== "Tous") filters.categorie = categorie;
    if (fermete !== "Tous") filters.fermete = fermete;
    if (gamme !== "Tous") filters.gamme = gamme;
    if (dimension !== "Tous") filters.dimension = dimension;

    // Update URL params to reflect active filters
    const sp = new URLSearchParams();
    if (filters.categorie) sp.set('categorie', String(filters.categorie));
    if (filters.fermete) sp.set('fermete', String(filters.fermete));
    if (filters.gamme) sp.set('gamme', String(filters.gamme));
    if (filters.dimension) sp.set('dimension', String(filters.dimension));
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
  }, [categorie, fermete, gamme, dimension]);

  if (loading && products.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  const FilterButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`w-full text-left text-sm px-3 py-1.5 rounded-xl transition-colors capitalize ${
        active ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-foreground"
      }`}
    >
      {children}
    </button>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <span className="text-xs font-bold text-primary uppercase tracking-widest">Boutique</span>
        <h1 className="text-3xl font-black mt-1 mb-2">Tous nos matelas</h1>
        <p className="text-muted-foreground">
          {products.length} produit{products.length > 1 ? "s" : ""} chargé{products.length > 1 ? "s" : ""}
          {hasMore && " (+ de résultats disponibles)"}
        </p>
      </div>

      <div className="flex gap-6">
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="bg-card border border-border rounded-2xl p-5 sticky top-24 space-y-6">
            <div>
              <h3 className="text-sm font-bold mb-3">Catégorie</h3>
              <div className="space-y-2">
                {CATEGORIES.map((c) => (
                  <FilterButton key={c} active={categorie === c} onClick={() => setCategorie(c)}>{c}</FilterButton>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-3">Gamme</h3>
              <div className="space-y-2">
                {gammes.map((g) => (
                  <FilterButton key={g} active={gamme === g} onClick={() => setGamme(g)}>{g}</FilterButton>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-3">Fermeté</h3>
              <div className="space-y-2">
                {FERMETES.map((f) => (
                  <FilterButton key={f} active={fermete === f} onClick={() => setFermete(f)}>{f}</FilterButton>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">Dimensions</h3>
                {dimension !== "Tous" && (
                  <button 
                    onClick={() => setDimension("Tous")}
                    className="text-[10px] text-primary font-black uppercase tracking-widest hover:underline"
                  >
                    Effacer
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
                    onClick={() => setDimension(d)}
                    className={`text-[10px] py-2 px-2 rounded-lg border transition-all truncate font-bold uppercase tracking-tighter ${
                      dimension === d 
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
              <h3 className="text-sm font-bold mb-3">Prix max</h3>
              <input type="range" min={200} max={3000} step={50} value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="w-full accent-primary" />
              <p className="text-sm text-primary font-bold mt-1">{formatPrice(priceMax)}</p>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <button className="lg:hidden flex items-center gap-2 mb-4 bg-muted px-4 py-2 rounded-xl text-sm font-medium" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="w-4 h-4" /> Filtres
          </button>

          {showFilters && (
            <div className="lg:hidden bg-card border border-border rounded-2xl p-4 mb-4 grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-bold mb-2">Catégorie</h3>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((c) => (
                    <button key={c} onClick={() => setCategorie(c)} className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${categorie === c ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold mb-2">Fermeté</h3>
                <div className="flex flex-wrap gap-1">
                  {FERMETES.map((f) => (
                    <button key={f} onClick={() => setFermete(f)} className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${fermete === f ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-2">
                   <h3 className="text-xs font-bold">Dimensions</h3>
                   {dimension !== "Tous" && (
                     <button onClick={() => setDimension("Tous")} className="text-[10px] text-primary font-black uppercase">Effacer</button>
                   )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 bg-muted/30 rounded-xl">
                  {DIMENSIONS.map((d) => (
                    <button 
                      key={d} 
                      onClick={() => setDimension(d)} 
                      className={`text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase transition-all ${
                        dimension === d ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {products.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg font-medium">Aucun produit ne correspond à vos filtres.</p>
              <button onClick={() => { setCategorie("Tous"); setFermete("Tous"); setGamme("Tous"); setDimension("Tous"); }} className="mt-4 text-primary hover:underline text-sm">Réinitialiser les filtres</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} selectedDimension={dimension} />
                ))}
              </div>
              <LoadMore hasMore={hasMore} isLoading={loading} onLoadMore={loadMore} className="mt-10" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
