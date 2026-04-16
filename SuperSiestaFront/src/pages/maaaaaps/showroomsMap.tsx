import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Showroom } from '../types';

const createIcon = (isActive: boolean) => L.divIcon({
  className: 'custom-leaflet-icon',
  html: `
    <div style="
      width: ${isActive ? '20px' : '14px'}; 
      height: ${isActive ? '20px' : '14px'}; 
      background-color: ${isActive ? '#2563eb' : '#111827'}; 
      border-radius: 50%; 
      border: 2px solid white;
      box-shadow: 0 0 0 ${isActive ? '4px' : '2px'} rgba(${isActive ? '37, 99, 235' : '17, 24, 39'}, 0.2);
      transition: all 0.3s ease;
    "></div>
  `,
  iconSize: isActive ? [20, 20] : [14, 14],
  iconAnchor: isActive ? [10, 10] : [7, 7],
});

interface ShowroomsMapProps {
  showrooms: Showroom[];
  activeShowroomId?: string | null;
}

export function ShowroomsMap({ showrooms, activeShowroomId }: ShowroomsMapProps) {
  // Center of Tunisia approximately
  const tunisiaCenter: [number, number] = [34.8, 9.5];
  
  // Bounding box for Tunisia [SouthWest, NorthEast]
  const tunisiaBounds: L.LatLngBoundsLiteral = [
    [29.5, 6.5], // South West corner
    [38.5, 12.5] // North East corner
  ];

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative z-0 bg-[#f8f9fa]">
      <MapContainer 
        center={tunisiaCenter} 
        zoom={6} 
        minZoom={6}
        maxBounds={tunisiaBounds}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        {/* Using a "nolabels" tile layer to remove other country names */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />
        
        {showrooms.map((showroom) => (
          <Marker 
            key={showroom.id} 
            position={[showroom.lat, showroom.lng]}
            icon={createIcon(activeShowroomId === showroom.id)}
            zIndexOffset={activeShowroomId === showroom.id ? 1000 : 0}
          />
        ))}
      </MapContainer>
    </div>
  );
}


