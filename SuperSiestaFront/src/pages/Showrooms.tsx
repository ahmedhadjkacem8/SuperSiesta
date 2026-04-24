import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import { MapPin, Loader2, LayoutGrid, List, Map as MapIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { ShowroomCard } from '@/components/showrooms/ShowroomCard';
import { ShowroomsMap } from '@/components/showrooms/ShowroomsMap';

interface Showroom {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string | null;
  email?: string | null;
  opening_hours_from?: string | null;
  opening_hours_until?: string | null;
  opening_days?: Record<string, boolean> | string | null;
  contact_person_name?: string | null;
  contact_person_phone?: string | null;
  contact_person_email?: string | null;
  google_maps_url?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  lat?: number | string;
  lng?: number | string;
}

type ViewMode = 'list' | 'grid' | 'map';

export default function Showrooms() {
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [activeShowroom, setActiveShowroom] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchShowrooms();
  }, []);

  // Sync carousel index when activeShowroom changes (from map marker click)
  useEffect(() => {
    if (activeShowroom) {
      const idx = showrooms.findIndex(s => s.id === activeShowroom);
      if (idx !== -1) {
        setCarouselIndex(idx);
        scrollCarouselTo(idx);
      }
    }
  }, [activeShowroom, showrooms]);

  const scrollCarouselTo = (idx: number) => {
    const container = carouselRef.current;
    if (!container) return;
    const child = container.children[idx] as HTMLElement;
    if (child) {
      child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const goCarousel = (dir: 'prev' | 'next') => {
    const next = dir === 'prev'
      ? Math.max(0, carouselIndex - 1)
      : Math.min(showrooms.length - 1, carouselIndex + 1);
    setCarouselIndex(next);
    setActiveShowroom(showrooms[next]?.id ?? null);
    scrollCarouselTo(next);
  };

  const extractCoords = (url: string | null): { lat: number; lng: number } | null => {
    if (!url) return null;
    const bangMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (bangMatch) return { lat: parseFloat(bangMatch[1]), lng: parseFloat(bangMatch[2]) };
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
    const placeMatch = url.match(/\/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    const dirMatch = url.match(/\/dir\/[^/]*\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (dirMatch) return { lat: parseFloat(dirMatch[1]), lng: parseFloat(dirMatch[2]) };
    return null;
  };

  const TUNISIA_BOUNDS = { minLat: 33.0, maxLat: 37.2, minLng: 8.0, maxLng: 11.0 };

  const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
    'tunis': { lat: 36.8065, lng: 10.1815 },
    'ariana': { lat: 36.8625, lng: 10.1956 },
    'ben arous': { lat: 36.7531, lng: 10.2189 },
    'manouba': { lat: 36.8080, lng: 10.1010 },
    'nabeul': { lat: 36.4561, lng: 10.7376 },
    'zaghouan': { lat: 36.4011, lng: 10.1436 },
    'bizerte': { lat: 37.2744, lng: 9.8739 },
    'beja': { lat: 36.7256, lng: 9.1817 },
    'jendouba': { lat: 36.5011, lng: 8.7802 },
    'le kef': { lat: 36.1822, lng: 8.7149 },
    'siliana': { lat: 36.0844, lng: 9.3708 },
    'sousse': { lat: 35.8256, lng: 10.6369 },
    'monastir': { lat: 35.7818, lng: 10.8262 },
    'mahdia': { lat: 35.5047, lng: 11.0622 },
    'sfax': { lat: 34.7406, lng: 10.7603 },
    'kairouan': { lat: 35.6781, lng: 10.0963 },
    'kasserine': { lat: 35.1676, lng: 8.8365 },
    'sidi bouzid': { lat: 35.0382, lng: 9.4849 },
    'gabes': { lat: 33.8815, lng: 10.0982 },
    'medenine': { lat: 33.3550, lng: 10.5055 },
    'tataouine': { lat: 32.9297, lng: 10.4518 },
    'gafsa': { lat: 34.4250, lng: 8.7842 },
    'tozeur': { lat: 33.9197, lng: 8.1336 },
    'kebili': { lat: 33.7044, lng: 8.9690 },
    'tunisie': { lat: 33.8869, lng: 9.5375 },
  };

  const generateFallbackCoords = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const seed1 = Math.abs(Math.sin(hash)) * 10000;
    const seed2 = Math.abs(Math.cos(hash)) * 10000;
    const lat = TUNISIA_BOUNDS.minLat + (seed1 - Math.floor(seed1)) * (TUNISIA_BOUNDS.maxLat - TUNISIA_BOUNDS.minLat);
    const lng = TUNISIA_BOUNDS.minLng + (seed2 - Math.floor(seed2)) * (TUNISIA_BOUNDS.maxLng - TUNISIA_BOUNDS.minLng);
    return { lat, lng };
  };

  const fetchShowrooms = async () => {
    try {
      setLoading(true);
      const resp = await api.get<any>(`/showrooms?t=${Date.now()}`);
      let items: any[] = [];
      if (resp?.data && Array.isArray(resp.data)) items = resp.data;
      else if (resp && Array.isArray(resp)) items = resp;
      else if (resp?.success && Array.isArray(resp.data?.data)) items = resp.data.data;

      const processed = items.map((item: any, index: number) => {
        if (!item.lat || !item.lng) {
          const coords = extractCoords(item.google_maps_url);
          if (coords) return { ...item, lat: coords.lat, lng: coords.lng };
          const cityLower = (item.city || '').toLowerCase().trim();
          if (CITY_COORDS[cityLower]) {
            return {
              ...item,
              lat: CITY_COORDS[cityLower].lat + (Math.random() - 0.5) * 0.05,
              lng: CITY_COORDS[cityLower].lng + (Math.random() - 0.5) * 0.05,
            };
          }
          const fallback = generateFallbackCoords(item.id || item.name || String(index));
          return { ...item, lat: fallback.lat, lng: fallback.lng };
        }
        return item;
      });

      setShowrooms(processed);
    } catch (err: any) {
      toast.error('Erreur lors du chargement des showrooms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOnMap = (id: string) => {
    setViewMode('map');
    setActiveShowroom(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkerClick = (id: string | null) => {
    setActiveShowroom(id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-12 px-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground font-black uppercase tracking-widest animate-pulse">
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  const leftShowrooms = showrooms.filter((_, i) => i % 2 === 0);
  const rightShowrooms = showrooms.filter((_, i) => i % 2 !== 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pt-24 pb-12">
      <div className="w-full max-w-[1600px] mx-auto" style={{ paddingLeft: 'clamp(16px, 4vw, 32px)', paddingRight: 'clamp(16px, 4vw, 32px)' }}>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-foreground mb-2 sm:mb-4 tracking-tighter uppercase leading-none">
              Nos <span className="text-primary">Espaces</span> d'Exposition
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
              Découvrez nos {showrooms.length} showroom{showrooms.length > 1 ? 's' : ''} à travers la Tunisie.{' '}
              <span className="hidden sm:inline">Venez tester le confort de nos matelas et recevez des conseils personnalisés de nos experts.</span>
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-card border border-border rounded-2xl p-1.5 shadow-sm shrink-0 self-start sm:self-auto">
            {([
              { mode: 'map' as ViewMode, icon: <MapIcon className="w-4 h-4" />, label: 'Carte' },
              { mode: 'list' as ViewMode, icon: <List className="w-4 h-4" />, label: 'Liste' },
              { mode: 'grid' as ViewMode, icon: <LayoutGrid className="w-4 h-4" />, label: 'Grille' },
            ]).map(({ mode, icon, label }) => (
              <button
                key={mode}
                id={`view-toggle-${mode}`}
                onClick={() => setViewMode(mode)}
                className={`px-3 sm:px-4 py-2.5 rounded-xl flex items-center gap-1.5 sm:gap-2 text-xs font-black uppercase tracking-widest transition-all ${
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Empty state ── */}
        {showrooms.length === 0 ? (
          <div className="text-center py-24 bg-card border border-border rounded-3xl shadow-sm">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-black mb-2">Bientôt disponibles</h3>
            <p className="text-muted-foreground font-medium">
              Nous préparons de nouveaux espaces pour vous accueillir.
            </p>
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════
                MAP VIEW
            ══════════════════════════════════════════ */}
            {viewMode === 'map' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* ── DESKTOP: 3-column layout ── */}
                <div className="hidden lg:grid lg:grid-cols-[1fr_minmax(0,34%)_1fr] gap-6 items-start">
                  {/* Left column */}
                  <div className="flex flex-col gap-3 py-2">
                    {leftShowrooms.map((showroom) => (
                      <div
                        key={showroom.id}
                        onClick={() => setActiveShowroom(activeShowroom === showroom.id ? null : showroom.id)}
                        className="flex items-center gap-2 group cursor-pointer"
                      >
                        <div className="flex-1 min-w-0 transition-transform duration-300 group-hover:translate-x-1">
                          <ShowroomCard
                            showroom={showroom}
                            viewMode="compact"
                            isActive={activeShowroom === showroom.id}
                            onViewOnMap={handleViewOnMap}
                          />
                        </div>
                        <div className={`flex items-center shrink-0 transition-all duration-300 ${activeShowroom === showroom.id ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                          <div className="h-2 w-6 bg-primary shadow-lg" />
                          <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-primary" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Center: sticky map */}
                  <div className="sticky top-24 h-[520px]">
                    <ShowroomsMap
                      showrooms={showrooms}
                      activeShowroomId={activeShowroom}
                      onActiveItemChange={handleMarkerClick}
                    />
                  </div>

                  {/* Right column */}
                  <div className="flex flex-col gap-3 py-2">
                    {rightShowrooms.map((showroom) => (
                      <div
                        key={showroom.id}
                        onClick={() => setActiveShowroom(activeShowroom === showroom.id ? null : showroom.id)}
                        className="flex items-center gap-2 group cursor-pointer"
                      >
                        <div className={`flex items-center shrink-0 transition-all duration-300 ${activeShowroom === showroom.id ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                          <div className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[10px] border-r-primary" />
                          <div className="h-2 w-6 bg-primary shadow-lg" />
                        </div>
                        <div className="flex-1 min-w-0 transition-transform duration-300 group-hover:-translate-x-1">
                          <ShowroomCard
                            showroom={showroom}
                            viewMode="compact"
                            isActive={activeShowroom === showroom.id}
                            onViewOnMap={handleViewOnMap}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── MOBILE: map + carousel ── */}
                <div className="lg:hidden flex flex-col gap-5">
                  {/* Map */}
                  <div className="w-full h-[300px] sm:h-[380px] rounded-3xl overflow-hidden" style={{ maxWidth: '100%', flexShrink: 0 }}>
                    <ShowroomsMap
                      showrooms={showrooms}
                      activeShowroomId={activeShowroom}
                      onActiveItemChange={handleMarkerClick}
                    />
                  </div>

                  {/* Carousel header */}
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <List className="w-3.5 h-3.5" />
                      Nos showrooms
                      <span className="text-primary/70">({carouselIndex + 1}/{showrooms.length})</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        id="carousel-prev"
                        onClick={() => goCarousel('prev')}
                        disabled={carouselIndex === 0}
                        className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center disabled:opacity-30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        id="carousel-next"
                        onClick={() => goCarousel('next')}
                        disabled={carouselIndex === showrooms.length - 1}
                        className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center disabled:opacity-30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable carousel */}
                  <div
                    ref={carouselRef}
                    className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {showrooms.map((showroom, idx) => (
                      <div
                        key={showroom.id}
                        id={`showroom-mobile-${showroom.id}`}
                        onClick={() => {
                          setCarouselIndex(idx);
                          setActiveShowroom(activeShowroom === showroom.id ? null : showroom.id);
                        }}
                        className="snap-center shrink-0"
                        style={{ width: 'min(300px, calc(100vw - 48px))' }}
                      >
                        <ShowroomCard
                          showroom={showroom}
                          viewMode="compact"
                          isActive={activeShowroom === showroom.id}
                          onViewOnMap={handleViewOnMap}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Dot indicators */}
                  {showrooms.length > 1 && (
                    <div className="flex justify-center gap-1.5">
                      {showrooms.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setCarouselIndex(idx);
                            setActiveShowroom(showrooms[idx].id);
                            scrollCarouselTo(idx);
                          }}
                          className={`rounded-full transition-all duration-300 ${
                            idx === carouselIndex
                              ? 'w-5 h-2 bg-primary'
                              : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════
                GRID / LIST VIEWS
            ══════════════════════════════════════════ */}
            {viewMode !== 'map' && (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-700'
                    : 'flex flex-col gap-6 animate-in fade-in duration-700 max-w-5xl mx-auto'
                }
              >
                {showrooms.map((showroom) => (
                  <ShowroomCard
                    key={showroom.id}
                    showroom={showroom}
                    viewMode={viewMode}
                    onViewOnMap={handleViewOnMap}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* Prevent Leaflet from causing horizontal scroll */
        .leaflet-container { background: transparent !important; max-width: 100% !important; }
        .leaflet-pane, .leaflet-map-pane { max-width: none; }
        .leaflet-control-attribution { display: none !important; }
        .custom-showroom-popup .leaflet-popup-content-wrapper {
          background: transparent; box-shadow: none; padding: 0;
        }
        .custom-showroom-popup .leaflet-popup-content {
          margin: 0; width: 280px !important;
        }
        .custom-showroom-popup .leaflet-popup-tip-container { display: none; }
        @keyframes marker-glow {
          0%   { transform: scale(1);   box-shadow: 0 0 0 0   rgba(241,90,36,.7); }
          70%  { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(241,90,36,0); }
          100% { transform: scale(1);   box-shadow: 0 0 0 0   rgba(241,90,36,0); }
        }
      `}} />
    </div>
  );
}
