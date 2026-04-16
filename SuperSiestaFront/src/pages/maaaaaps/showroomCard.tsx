import { MapPin, Phone, Mail, Clock, User, ExternalLink, Calendar } from 'lucide-react';
import { Showroom } from '../types';

interface ShowroomCardProps {
  showroom: Showroom;
  viewMode?: 'grid' | 'list' | 'compact';
  isActive?: boolean;
}

export function ShowroomCard({ showroom, viewMode = 'grid', isActive = false }: ShowroomCardProps) {
  const isList = viewMode === 'list';
  const isCompact = viewMode === 'compact';

  if (isCompact) {
    return (
      <div className={`bg-white rounded-xl border overflow-hidden w-full flex flex-col transition-all duration-300 ${isActive ? 'border-blue-500 shadow-lg scale-[1.02] ring-1 ring-blue-500' : 'border-gray-200 shadow-sm hover:border-gray-300'}`}>
        <div className="h-32 relative">
          <img
            src={showroom.image_url}
            alt={showroom.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold text-gray-800 uppercase tracking-wider shadow-sm">
            {showroom.city}
          </div>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <h3 className="font-bold text-gray-900 text-sm leading-tight">{showroom.name}</h3>
          
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-gray-600 text-xs">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
              <span className="leading-tight">{showroom.address}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-xs">
              <Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              <a href={`tel:${showroom.phone}`} className="hover:text-blue-600">{showroom.phone}</a>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-xs">
              <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              <span>{showroom.opening_hours_from} - {showroom.opening_hours_until}</span>
            </div>
          </div>

          <a
            href={showroom.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-2 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium transition-colors ${isActive ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
          >
            <ExternalLink className="w-3 h-3" />
            Itinéraire
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 ${isList ? 'flex-col md:flex-row' : 'flex-col'}`}>
      {/* Image Section */}
      <div className={`relative overflow-hidden ${isList ? 'md:w-5/12 h-64 md:h-auto shrink-0' : 'h-56 w-full'}`}>
        <img
          src={showroom.image_url}
          alt={showroom.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-800 shadow-sm">
          {showroom.city}
        </div>
      </div>

      {/* Content Section */}
      <div className={`flex-1 flex flex-col ${isList ? 'p-6 md:p-8' : 'p-6'}`}>
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">{showroom.name}</h3>

        <div className={`flex-1 ${isList ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}`}>
          {/* Left Column in List View / Top in Grid */}
          <div className="space-y-3">
            {/* Address */}
            <div className="flex items-start gap-3 text-gray-600">
              <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <span className="text-sm leading-relaxed">{showroom.address}, {showroom.city}</span>
            </div>

            {/* Contact Info */}
            <div className="flex items-center gap-3 text-gray-600">
              <Phone className="w-5 h-5 text-gray-400 shrink-0" />
              <a href={`tel:${showroom.phone}`} className="text-sm hover:text-blue-600 transition-colors">
                {showroom.phone}
              </a>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="w-5 h-5 text-gray-400 shrink-0" />
              <a href={`mailto:${showroom.email}`} className="text-sm hover:text-blue-600 transition-colors">
                {showroom.email}
              </a>
            </div>
          </div>

          {/* Right Column in List View / Bottom in Grid */}
          <div className="space-y-4">
            {/* Opening Hours */}
            <div className={`space-y-2 ${!isList ? 'pt-4 border-t border-gray-100' : ''}`}>
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                <span className="text-sm font-medium">{showroom.opening_days}</span>
              </div>
              <div className="flex items-start gap-3 text-gray-600">
                <Clock className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <div className="text-sm flex flex-col">
                  <span>{showroom.opening_hours_from} - {showroom.opening_hours_until}</span>
                  <span className="text-gray-400">{showroom.opening_hours}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Contact Person & Action */}
        <div className={`mt-6 pt-6 border-t border-gray-100 flex flex-col ${isList ? 'sm:flex-row sm:items-center justify-between gap-4' : 'gap-4'}`}>
          {/* Contact Person */}
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-2 rounded-full shrink-0">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{showroom.contact_person_name}</div>
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-1">
                <a href={`tel:${showroom.contact_person_phone}`} className="hover:text-blue-600 whitespace-nowrap">{showroom.contact_person_phone}</a>
                <span className="hidden sm:inline">•</span>
                <a href={`mailto:${showroom.contact_person_email}`} className="hover:text-blue-600 truncate">{showroom.contact_person_email}</a>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <a
            href={showroom.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-2.5 px-5 rounded-xl text-sm font-medium transition-colors shrink-0 ${isList ? 'w-full sm:w-auto' : 'w-full'}`}
          >
            <ExternalLink className="w-4 h-4" />
            Voir sur la carte
          </a>
        </div>
      </div>
    </div>
  );
}

