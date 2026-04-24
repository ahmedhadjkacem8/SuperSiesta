import { MapPin, Phone, Mail, Clock, User, ExternalLink, Calendar } from 'lucide-react';

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

const DAYS_FR: Record<string, string> = {
  mon: 'Lundi',
  tue: 'Mardi',
  wed: 'Mercredi',
  thu: 'Jeudi',
  fri: 'Vendredi',
  sat: 'Samedi',
  sun: 'Dimanche',
};

interface ShowroomCardProps {
  showroom: Showroom;
  viewMode?: 'grid' | 'list' | 'compact';
  isActive?: boolean;
  onViewOnMap?: (id: string) => void;
}

export function ShowroomCard({ showroom, viewMode = 'grid', isActive = false, onViewOnMap }: ShowroomCardProps) {
  const isList = viewMode === 'list';
  const isCompact = viewMode === 'compact';

  const getOpeningDaysText = (sh: Showroom): string => {
    if (!sh.opening_days) return 'Tous les jours';
    let days = sh.opening_days;
    if (typeof days === 'string') {
      try {
        days = JSON.parse(days);
      } catch (e) {
        return 'Tous les jours';
      }
    }
    const openDays = Object.entries(days as Record<string, boolean>)
      .filter(([, isOpen]) => isOpen)
      .map(([day]) => DAYS_FR[day])
      .join(', ');
    return openDays || 'Tous les jours';
  };

  if (isCompact) {
    return (
      <div 
        className={`group bg-card rounded-2xl overflow-hidden w-full flex flex-row transition-all duration-500 will-change-transform ${
          isActive 
            ? 'shadow-2xl shadow-primary/20 scale-[1.02] ring-2 ring-primary border-transparent' 
            : 'border border-border/50 shadow-md hover:shadow-xl hover:border-primary/30'
        }`}
      >
        {/* Image - Left side */}
        <div className="w-28 min-h-[120px] relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30 z-10" />
          <img
            src={showroom.image_url || ''}
            alt={showroom.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          {isActive && (
            <div className="absolute top-2 left-2 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(34,197,94,0.8)] z-20 animate-pulse"></div>
          )}
        </div>

        {/* Info - Right side */}
        <div className="flex-1 p-3 flex flex-col justify-center gap-1.5 bg-gradient-to-b from-card to-background relative z-0 min-w-0">
          {/* Google Maps icon - top right corner */}
          {showroom.google_maps_url && (
            <a
              href={showroom.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Ouvrir dans Google Maps"
              className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-primary/20"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <div className="flex flex-col gap-1 mb-0.5 pr-8">
            <h3 className="font-black text-sm leading-tight text-foreground">{showroom.name}</h3>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest w-fit">
              {showroom.city}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-start gap-1.5 text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
              <span className="text-[10px] leading-snug line-clamp-2 font-medium">{showroom.address}</span>
            </div>
            {showroom.phone && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="w-3 h-3 shrink-0 text-primary" />
                <a href={`tel:${showroom.phone}`} className="hover:text-primary transition-colors text-[10px] font-bold">{showroom.phone}</a>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3 h-3 shrink-0 text-primary" />
              <span className="text-[10px] font-bold">{showroom.opening_hours_from || '09:00'} - {showroom.opening_hours_until || '19:00'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex bg-card rounded-[2rem] border border-border/50 overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1 ${isList ? 'flex-col md:flex-row' : 'flex-col'}`}>
      {/* Image Section */}
      <div className={`relative overflow-hidden ${isList ? 'md:w-5/12 h-72 md:h-auto shrink-0' : 'h-64 w-full'}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
        <img
          src={showroom.image_url || ''}
          alt={showroom.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-transform duration-700 ease-out"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-5 left-5 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[11px] font-black uppercase text-white shadow-lg border border-white/20 z-20">
          {showroom.city}
        </div>
        {!isList && (
          <div className="absolute bottom-5 left-5 right-5 z-20">
            <h3 className="text-3xl font-black text-white drop-shadow-md leading-tight">{showroom.name}</h3>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className={`flex-1 flex flex-col relative z-0 ${isList ? 'p-8 md:p-10' : 'p-8'}`}>
        {isList && <h3 className="text-3xl font-black text-foreground mb-6 leading-tight group-hover:text-primary transition-colors">{showroom.name}</h3>}

        <div className={`flex-1 ${isList ? 'grid grid-cols-1 lg:grid-cols-2 gap-8' : 'space-y-6'}`}>
          <div className="space-y-4">
            <div className="flex items-start gap-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium leading-relaxed pt-2">{showroom.address}, <span className="font-bold">{showroom.city}</span></span>
            </div>

            {showroom.phone && (
              <div className="flex items-center gap-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <a href={`tel:${showroom.phone}`} className="text-sm font-bold hover:text-primary transition-colors pt-1">
                  {showroom.phone}
                </a>
              </div>
            )}
            
            {showroom.email && (
              <div className="flex items-center gap-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <a href={`mailto:${showroom.email}`} className="text-sm font-bold hover:text-primary transition-colors pt-1">
                  {showroom.email}
                </a>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className={`${!isList ? 'pt-6 border-t border-border/50' : ''}`}>
              <div className="flex items-center gap-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                   <Calendar className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-bold pt-1">{getOpeningDaysText(showroom)}</span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="text-sm flex flex-col pt-1">
                  <span className="font-bold">{showroom.opening_hours_from || '09:00'} - {showroom.opening_hours_until || '19:00'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Contact Person & Action */}
        <div className={`mt-8 pt-6 border-t border-border/50 flex flex-col ${isList ? 'sm:flex-row sm:items-center justify-between gap-6' : 'gap-6'}`}>
          {/* Contact Person */}
          {(showroom.contact_person_name || showroom.contact_person_phone) && (
            <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-2xl border border-border/50 group-hover:bg-muted/50 transition-colors">
              <div className="bg-background shadow-sm p-2.5 rounded-full shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 pr-4">
                <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-0.5">Responsable</div>
                <div className="text-sm font-black text-foreground truncate leading-tight">{showroom.contact_person_name || 'Équipe Supersiesta'}</div>
                {showroom.contact_person_phone && (
                  <a href={`tel:${showroom.contact_person_phone}`} className="text-xs text-primary font-bold hover:underline whitespace-nowrap block mt-0.5">{showroom.contact_person_phone}</a>
                )}
              </div>
            </div>
          )}

          {showroom.google_maps_url ? (
            <a
              href={showroom.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-primary/20 shrink-0 hover:scale-105 active:scale-95 ${isList ? 'w-full sm:w-auto' : 'w-full'} ${(!showroom.contact_person_name && !showroom.contact_person_phone && !isList) ? 'mt-auto' : ''}`}
            >
              <ExternalLink className="w-4 h-4" />
              Ouvrir dans Google Maps
            </a>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewOnMap?.(showroom.id);
              }}
              className={`flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-primary/20 shrink-0 hover:scale-105 active:scale-95 ${isList ? 'w-full sm:w-auto' : 'w-full'} ${(!showroom.contact_person_name && !showroom.contact_person_phone && !isList) ? 'mt-auto' : ''}`}
            >
              <MapPin className="w-4 h-4" />
              Voir sur la carte
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
