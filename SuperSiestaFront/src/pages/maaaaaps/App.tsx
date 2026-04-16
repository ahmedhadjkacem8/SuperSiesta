import { useState } from 'react';
import { Building2, LayoutGrid, List, Map as MapIcon } from 'lucide-react';
import { mockShowrooms } from './data';
import { ShowroomCard } from './components/ShowroomCard';
import { ShowroomsMap } from './components/ShowroomsMap';

type ViewMode = 'list' | 'grid' | 'map';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [activeShowroom, setActiveShowroom] = useState<string | null>(null);

  // Split showrooms for left and right columns
  const leftShowrooms = mockShowrooms.filter((_, i) => i % 2 === 0);
  const rightShowrooms = mockShowrooms.filter((_, i) => i % 2 !== 0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-900 p-2 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
              Nos Showrooms en Tunisie
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
              Trouvez un showroom près de chez vous
            </h2>
            <p className="text-gray-500 max-w-2xl text-lg">
              Découvrez nos espaces d'exposition à travers la Tunisie, rencontrez nos experts et trouvez l'inspiration pour vos projets.
            </p>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
                viewMode === 'map' 
                  ? 'bg-gray-100 text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Carte</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-gray-100 text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Liste</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-gray-100 text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grille</span>
            </button>
          </div>
        </div>

        {/* Content Container based on ViewMode */}
        {viewMode === 'map' ? (
          <div className="flex flex-row gap-6 items-start h-[650px] animate-in fade-in duration-500">
            {/* Left Column */}
            <div className="hidden md:flex w-1/4 h-full flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {leftShowrooms.map((showroom) => (
                <div 
                  key={showroom.id}
                  onMouseEnter={() => setActiveShowroom(showroom.id)}
                  onMouseLeave={() => setActiveShowroom(null)}
                  className="relative shrink-0"
                >
                  <ShowroomCard 
                    showroom={showroom} 
                    viewMode="compact" 
                    isActive={activeShowroom === showroom.id} 
                  />
                  {/* Decorative connector hint */}
                  <div className={`absolute top-1/2 -right-6 w-6 h-[2px] -translate-y-1/2 transition-colors duration-300 ${activeShowroom === showroom.id ? 'bg-blue-600' : 'bg-gray-200'}`} />
                </div>
              ))}
            </div>

            {/* Center Map */}
            <div className="w-full md:w-2/4 h-full">
              <ShowroomsMap showrooms={mockShowrooms} activeShowroomId={activeShowroom} />
            </div>

            {/* Right Column */}
            <div className="hidden md:flex w-1/4 h-full flex-col gap-4 overflow-y-auto custom-scrollbar pl-2 pb-4">
              {rightShowrooms.map((showroom) => (
                <div 
                  key={showroom.id}
                  onMouseEnter={() => setActiveShowroom(showroom.id)}
                  onMouseLeave={() => setActiveShowroom(null)}
                  className="relative shrink-0"
                >
                  {/* Decorative connector hint */}
                  <div className={`absolute top-1/2 -left-6 w-6 h-[2px] -translate-y-1/2 transition-colors duration-300 ${activeShowroom === showroom.id ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <ShowroomCard 
                    showroom={showroom} 
                    viewMode="compact" 
                    isActive={activeShowroom === showroom.id} 
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500"
              : "flex flex-col gap-6 animate-in fade-in duration-500"
          }>
            {mockShowrooms.map((showroom) => (
              <ShowroomCard key={showroom.id} showroom={showroom} viewMode={viewMode} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


