import React from 'react';
import { Sliders, Sparkles } from 'lucide-react';
import { MenuItem } from '../../types/menu';
import { ImageWithFallback } from '../common/ImageWithFallback';

interface DishCardProps {
  item: MenuItem;
  currencySymbol: string;
  onSelectDish: (dish: MenuItem) => void;
}

export const DishCard: React.FC<DishCardProps> = ({ item, currencySymbol, onSelectDish }) => {
  const hasCustomizations = item.customizationGroups && item.customizationGroups.length > 0;

  // Formatting dietary labels into clean unboxed text
  const dietaryText = item.dietary
    .map((d) => {
      switch (d) {
        case 'gluten-free':
          return 'Gluten-Free';
        case 'vegetarian':
          return 'Vegetarian';
        case 'vegan':
          return 'Vegan';
        case 'halal':
          return 'Halal';
        case 'nut-free':
          return 'Nut-Free';
        default:
          return d;
      }
    })
    .join(' · ');

  return (
    <article
      onClick={() => onSelectDish(item)}
      className={`group relative flex flex-col bg-[#141416] border border-[#242428] hover:border-[#C5A880]/50 rounded-sm overflow-hidden transition-all duration-300 hover:-translate-y-0.5 cursor-pointer shadow-xs ${
        !item.isAvailable ? 'opacity-65' : ''
      }`}
    >
      {/* Dish Photography */}
      <div className="relative w-full overflow-hidden">
        <ImageWithFallback
          src={item.imageUrl}
          alt={item.name}
          aspectRatioClass="aspect-[16/10]"
        />

        {/* Sold Out Watermark Overlay */}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-[#0D0D0E]/75 backdrop-blur-[2px] flex items-center justify-center">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#EF4444] border border-[#EF4444]/40 px-3 py-1 rounded-xs bg-[#0D0D0E]/80">
              Sold Out for Tonight
            </span>
          </div>
        )}

        {/* Customization available indicator */}
        {hasCustomizations && item.isAvailable && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#E8D8B8] bg-[#0D0D0E]/85 backdrop-blur-xs px-2 py-0.5 rounded-xs border border-[#C5A880]/30">
            <Sliders className="w-2.5 h-2.5 text-[#C5A880]" />
            <span>Customizable</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Header Row: Title and Price */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-lg sm:text-xl font-medium text-[#F5F5F0] group-hover:text-[#C5A880] transition-colors leading-snug">
              {item.name}
            </h3>
            <span className="font-mono text-base font-semibold text-[#C5A880] tabular-nums whitespace-nowrap shrink-0">
              {currencySymbol}{item.basePrice.toFixed(2)}
            </span>
          </div>

          {/* Culinary Description */}
          <p className="text-xs text-[#A1A1AA] leading-relaxed line-clamp-2 font-light">
            {item.description}
          </p>
        </div>

        {/* Footer Area: Clean unboxed metadata & Action */}
        <div className="space-y-3 pt-2 border-t border-[#1F1F23]">
          {/* Dietary & Allergens (No Pill Badges, clean typographic discipline) */}
          {(dietaryText || item.allergens?.length > 0) && (
            <div className="text-[11px] text-[#71717A] space-y-0.5">
              {dietaryText && (
                <p className="line-clamp-1">
                  <span className="text-[#A1A1AA]">{dietaryText}</span>
                </p>
              )}
              {item.allergens && item.allergens.length > 0 && (
                <p className="text-[10px] text-[#52525B]">
                  Contains: {item.allergens.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            disabled={!item.isAvailable}
            onClick={(e) => {
              e.stopPropagation();
              onSelectDish(item);
            }}
            className={`w-full py-2 px-3 text-xs uppercase tracking-wider font-medium rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              item.isAvailable
                ? 'bg-[#1C1C20] hover:bg-[#C5A880] text-[#D4D4D8] hover:text-[#0D0D0E] border border-[#2E2E33] hover:border-[#C5A880]'
                : 'bg-[#141416] text-[#52525B] border border-[#1E1E22] cursor-not-allowed'
            }`}
          >
            {item.isAvailable ? (
              <>
                <Sparkles className="w-3 h-3 text-[#C5A880] group-hover:text-[#0D0D0E]" />
                <span>Customize & View</span>
              </>
            ) : (
              <span>Currently Unavailable</span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};
