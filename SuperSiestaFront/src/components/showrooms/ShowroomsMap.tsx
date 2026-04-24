import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Bypass strict Leaflet prop typing issues in TS
const MapView = MapContainer as any;
const MarkerView = Marker as any;

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

const createIcon = (isActive: boolean, showroomName: string) => L.divIcon({
  className: 'custom-leaflet-icon',
  html: `
    <div class="relative flex flex-col items-center justify-center transition-all duration-300">
      <div style="
        width: ${isActive ? '26px' : '18px'}; 
        height: ${isActive ? '26px' : '18px'}; 
        background-color: ${isActive ? '#1f7813ff' : '#1e293b'}; 
        border-radius: 50%; 
        border: 3px solid white;
        box-shadow: 0 0 0 ${isActive ? '6px' : '3px'} rgba(${isActive ? '31, 120, 19' : '30, 41, 59'}, 0.1);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      "></div>

      <!-- Active Label Banner -->
      ${isActive ? `
        <div class="absolute top-[36px] left-1/2 -translate-x-1/2 bg-background border-2 border-primary text-foreground font-black px-4 py-1.5 rounded-full shadow-2xl text-xs whitespace-nowrap z-[1000] animate-in fade-in zoom-in duration-300 flex items-center gap-2">
          ${showroomName}
        </div>
      ` : ''}
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

interface ShowroomsMapProps {
  showrooms: Showroom[];
  activeShowroomId?: string | null;
  onActiveItemChange?: (id: string | null) => void;
}

const toNum = (v: number | string | undefined): number | null => {
  if (v === undefined || v === null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isFinite(n) ? n : null;
};

function MapUpdater({ showrooms, activeId }: { showrooms: Showroom[], activeId?: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (!activeId) return; // Map is already at northCenter via center prop — no flyTo needed

    const t = setTimeout(() => {
      const size = map.getSize();
      // Guard: only fly if the container has real dimensions
      if (!size || size.x === 0 || size.y === 0) return;

      const s = showrooms.find(s => s.id === activeId);
      if (s) {
        const lat = toNum(s.lat);
        const lng = toNum(s.lng);
        if (lat !== null && lng !== null) {
          map.flyTo([lat, lng], 14, { duration: 1.5, easeLinearity: 0.25 });
        }
      }
    }, 150);

    return () => clearTimeout(t);
  }, [activeId, showrooms, map]);

  return null;
}

export function ShowroomsMap({ showrooms, activeShowroomId, onActiveItemChange }: ShowroomsMapProps) {
  // Default center focused on North Tunisia (Tunis area)
  const northTunisiaCenter: [number, number] = [36.7, 10.2];
  const tunisiaCenter: [number, number] = [33.8869, 9.5375];

  // Bounding box for Tunisia [SouthWest, NorthEast]
  const tunisiaBounds: L.LatLngBoundsLiteral = [
    [30.2, 7.5], // South West corner
    [37.5, 11.6] // North East corner
  ];

  return (
    <div className="w-full h-full rounded-3xl overflow-hidden border border-border shadow-2xl relative z-0 bg-muted/20 box-border" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      <MapView
        center={northTunisiaCenter}
        zoom={8}
        minZoom={6}
        maxBounds={tunisiaBounds}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
        attributionControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
        />

        <MapUpdater showrooms={showrooms} activeId={activeShowroomId} />

        {showrooms.map((showroom) => {
          const lat = toNum(showroom.lat);
          const lng = toNum(showroom.lng);

          if (lat === null || lng === null) return null;

          return (
            <MarkerView
              key={showroom.id}
              position={[lat, lng]}
              icon={createIcon(activeShowroomId === showroom.id, showroom.name)}
              zIndexOffset={activeShowroomId === showroom.id ? 1000 : 0}
              eventHandlers={{
                click: () => onActiveItemChange?.(activeShowroomId === showroom.id ? null : showroom.id)
              }}
            />
          );
        })}
      </MapView>

      {/* Overlay to stylize map labels or give a premium feel */}
      <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/20 rounded-3xl z-10" />
    </div>
  );
}
