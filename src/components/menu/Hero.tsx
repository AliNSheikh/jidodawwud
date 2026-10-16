import React from 'react';
import { Clock, MapPin, Calendar, Award } from 'lucide-react';
import { RestaurantInfo } from '../../types/menu';

interface HeroProps {
  restaurant: RestaurantInfo;
  onOpenReservations: () => void;
  syncSource?: 'github' | 'local';
}

export const Hero: React.FC<HeroProps> = ({ restaurant, onOpenReservations }) => {
  return (
    <section id="top" className="relative pt-12 pb-14 border-b border-[#242428] bg-gradient-to-b from-[#121215] to-[#0D0D0E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Brand Story & Headline */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#C5A880] font-medium">
              <Award className="w-4 h-4 stroke-[1.5]" />
              <span>Michelin Guide Selection · Two Stars 2026</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#F5F5F0] font-normal tracking-tight leading-[1.1] text-balance">
              The Architecture of Taste & Seasonal Terroir
            </h1>

            <p className="text-[#A1A1AA] text-base sm:text-lg max-w-2xl font-light leading-relaxed">
              {restaurant.tagline || 'Experience French contemporary gastronomy rooted in heritage cultivation, wild sea foraging, and cellared vintages.'}
            </p>

            {/* Quiet unboxed location and hours metadata (No pill boxes, clean typographic separators) */}
            <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-[#8E8E93]">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C5A880]/80" />
                <span>{restaurant.address || '42 Rue de l\'Amirauté, Paris'}</span>
              </div>
              <span aria-hidden="true" className="text-[#3F3F46]">/</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#C5A880]/80" />
                <span>{restaurant.hours || 'Tue–Sat 18:00–23:30'}</span>
              </div>
              <span aria-hidden="true" className="text-[#3F3F46]">/</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[#C5A880]">{restaurant.currencySymbol}</span>
                <span>All prices in {restaurant.currency}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-3 flex flex-wrap items-center gap-4">
              <button
                onClick={onOpenReservations}
                className="inline-flex items-center gap-2 px-6 py-3 text-xs uppercase tracking-widest font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] transition-colors rounded-xs shadow-md cursor-pointer"
              >
                <Calendar className="w-4 h-4 stroke-[2]" />
                Reserve Tasting Table
              </button>

              <a
                href="#starters"
                className="inline-flex items-center px-6 py-3 text-xs uppercase tracking-widest font-semibold text-[#F5F5F0] hover:text-[#C5A880] border border-[#2F2F35] hover:border-[#C5A880]/60 bg-[#141416]/60 rounded-xs transition-colors"
              >
                Browse Menu
              </a>
            </div>
          </div>

          {/* Right Column: Hero Visual Atmosphere */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-sm overflow-hidden border border-[#27272A] aspect-[4/3] shadow-2xl group bg-[#161618]">
              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80"
                alt="L'Étoile Gastronomie Dining Room Ambiance"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1000&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0E] via-[#0D0D0E]/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-widest text-[#C5A880] font-semibold">Salon Principal</span>
                  <p className="text-xs text-[#D4D4D8] font-light">Chef Patron Aurélien Laurent</p>
                </div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#A1A1AA] bg-[#0D0D0E]/70 px-2 py-1 rounded-xs border border-[#27272A]">
                  Tasting & À La Carte
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
