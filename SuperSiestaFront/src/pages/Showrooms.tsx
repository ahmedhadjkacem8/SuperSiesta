import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { MapPin, Loader2, LayoutGrid, List, Map as MapIcon, Info } from 'lucide-react';
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

  useEffect(() => {
    fetchShowrooms();
  }, []);

  const extractCoords = (url: string | null): { lat: number, lng: number } | null => {
    if (!url) return null;
    
    // Pattern 1: @lat,lng
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

    // Pattern 2: q=lat,lng
    const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

    // Pattern 3: !3dlat!4dlng (used in embed URLs)
    const bangMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (bangMatch) return { lat: parseFloat(bangMatch[1]), lng: parseFloat(bangMatch[2]) };

    return null;
  };

  const TUNISIA_BOUNDS = {
    minLat: 33.0,
    maxLat: 37.2,
    minLng: 8.0,
    maxLng: 11.0
  };

  const CITY_COORDS: Record<string, { lat: number, lng: number }> = {
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
    'tunisie': { lat: 33.8869, lng: 9.5375 }
  };

  const generateFallbackCoords = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; 
    }
    const seed1 = Math.abs(Math.sin(hash)) * 10000;
    const seed2 = Math.abs(Math.cos(hash)) * 10000;
    
    // Distribute deterministically within Tunisia
    const lat = TUNISIA_BOUNDS.minLat + (seed1 - Math.floor(seed1)) * (TUNISIA_BOUNDS.maxLat - TUNISIA_BOUNDS.minLat);
    const lng = TUNISIA_BOUNDS.minLng + (seed2 - Math.floor(seed2)) * (TUNISIA_BOUNDS.maxLng - TUNISIA_BOUNDS.minLng);
    
    return { lat, lng };
  };

  const fetchShowrooms = async () => {
    try {
      setLoading(true);
      const resp = await api.get<any>(`/showrooms?t=${Date.now()}`);

      let items: any[] = [];
      if (resp && resp.data && Array.isArray(resp.data)) {
        items = resp.data;
      } else if (resp && Array.isArray(resp)) {
        items = resp;
      } else if (resp && resp.success && resp.data && Array.isArray(resp.data.data)) {
        items = resp.data.data;
      }

      // Process coordinates
      const processed = items.map((item: any, index: number) => {
        if (!item.lat || !item.lng) {
          const coords = extractCoords(item.google_maps_url);
          if (coords) {
            return { ...item, lat: coords.lat, lng: coords.lng };
          }
          
          // Fallback to city
          const cityLower = (item.city || '').toLowerCase().trim();
          if (CITY_COORDS[cityLower]) {
             // Add a tiny random offset so markers don't overlap exactly if they are in the same city
             const offsetLat = (Math.random() - 0.5) * 0.05;
             const offsetLng = (Math.random() - 0.5) * 0.05;
             return { ...item, lat: CITY_COORDS[cityLower].lat + offsetLat, lng: CITY_COORDS[cityLower].lng + offsetLng };
          }

          // Fallback to deterministic pseudo-random location in Tunisia
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
    // Smooth scroll to top to see the map
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Split showrooms for left and right columns in map view
  const leftShowrooms = showrooms.filter((_, i) => i % 2 === 0);
  const rightShowrooms = showrooms.filter((_, i) => i % 2 !== 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pt-24 pb-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-black text-foreground mb-4 tracking-tighter uppercase">
              Nos <span className="text-primary">Espaces</span> d'Exposition
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
              Découvrez nos {showrooms.length} showroom{showrooms.length > 1 ? 's' : ''} à travers la Tunisie. 
              Venez tester le confort de nos matelas et recevez des conseils personnalisés de nos experts.
            </p>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center bg-card border border-border rounded-2xl p-1.5 shadow-sm shrink-0">
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'map' 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Carte</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'list' 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Liste</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'grid' 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grille</span>
            </button>
          </div>
        </div>

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
          <div className="relative">
            {viewMode === 'map' ? (
              <div className="flex flex-row gap-8 items-start h-[550px] animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Left Column */}
                <div className="hidden lg:flex w-[28%] h-full flex-col gap-5 overflow-y-auto custom-scrollbar pr-3 pb-4 pt-4 z-20 pl-2">
                  {leftShowrooms.map((showroom) => (
                    <div 
                      key={showroom.id}
                      onClick={() => setActiveShowroom(activeShowroom === showroom.id ? null : showroom.id)}
                      className="relative shrink-0 flex items-center pr-2 group cursor-pointer"
                    >
                      <div className="flex-1 w-full relative z-10 transition-transform duration-300 group-hover:translate-x-1">
                        <ShowroomCard 
                          showroom={showroom} 
                          viewMode="compact" 
                          isActive={activeShowroom === showroom.id}
                          onViewOnMap={handleViewOnMap}
                        />
                      </div>
                      {/* Pointer line to map */}
                      <div className={`w-8 transition-all duration-300 pointer-events-none flex items-center justify-start z-50 ${
                        activeShowroom === showroom.id ? 'opacity-100 scale-110 ml-2' : 'opacity-30 scale-100 ml-2 grayscale'
                      }`}>
                        <div className="h-2 w-full bg-primary shadow-lg" />
                        <div className="w-0 h-0 border-y-[8px] border-y-transparent border-l-[12px] border-l-primary drop-shadow-md" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Center Map */}
                <div className="w-full lg:w-[44%] h-full relative group z-10">
                  <ShowroomsMap 
                    showrooms={showrooms} 
                    activeShowroomId={activeShowroom} 
                    onActiveItemChange={setActiveShowroom}
                  />
                  
                  {/* Floating Hint */}
                  <div className="absolute top-6 right-6 z-20 bg-background/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-border shadow-2xl flex items-center gap-2 pointer-events-none">
                  </div>
                </div>

                {/* Right Column */}
                <div className="hidden lg:flex w-[28%] h-full flex-col gap-5 overflow-y-auto custom-scrollbar pl-3 pb-4 pt-4 z-20 pr-2">
                  {rightShowrooms.map((showroom) => (
                    <div 
                      key={showroom.id}
                      onClick={() => setActiveShowroom(activeShowroom === showroom.id ? null : showroom.id)}
                      className="relative shrink-0 flex items-center pl-2 group cursor-pointer"
                    >
                      {/* Pointer line to map */}
                      <div className={`w-8 transition-all duration-300 pointer-events-none flex items-center justify-end z-50 ${
                        activeShowroom === showroom.id ? 'opacity-100 scale-110 mr-2' : 'opacity-30 scale-100 mr-2 grayscale'
                      }`}>
                        <div className="w-0 h-0 border-y-[8px] border-y-transparent border-r-[12px] border-r-primary drop-shadow-md" />
                        <div className="h-2 w-full bg-primary shadow-lg" />
                      </div>
                      <div className="flex-1 w-full relative z-10 transition-transform duration-300 group-hover:-translate-x-1">
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

                {/* Mobile Fallback or Hint */}
                <div className="lg:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-max max-w-[90vw]">
                  <div className="bg-background/90 backdrop-blur-md px-6 py-3 rounded-full border border-border shadow-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">Utilisez la grille sur mobile</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-700"
                  : "flex flex-col gap-8 animate-in fade-in duration-700 max-w-5xl mx-auto"
              }>
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
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--primary), 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--primary), 0.3);
        }
        .leaflet-container {
          background: transparent !important;
        }
        .leaflet-control-attribution {
          display: none !important;
        }
        .marker-pulse {
          animation: marker-glow 2s infinite;
        }
        @keyframes marker-glow {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(241, 90, 36, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(241, 90, 36, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(241, 90, 36, 0); }
        }
        .custom-showroom-popup .leaflet-popup-content-wrapper {
          background: transparent;
          box-shadow: none;
          padding: 0;
        }
        .custom-showroom-popup .leaflet-popup-content {
          margin: 0;
          width: 300px !important;
        }
        .custom-showroom-popup .leaflet-popup-tip-container {
          display: none;
        }
      `}} />
    </div>
  );
}
