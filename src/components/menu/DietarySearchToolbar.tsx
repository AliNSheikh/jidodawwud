import React from 'react';
import { Search, X, SlidersHorizontal, Check } from 'lucide-react';
import { DietaryType } from '../../types/menu';

interface DietarySearchToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDietary: DietaryType[];
  onToggleDietary: (diet: DietaryType) => void;
  inStockOnly: boolean;
  onToggleInStock: () => void;
  onResetFilters: () => void;
  totalFilteredCount: number;
}

const DIETARY_OPTIONS: { id: DietaryType; label: string }[] = [
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'halal', label: 'Halal' },
  { id: 'nut-free', label: 'Nut-Free' },
];

export const DietarySearchToolbar: React.FC<DietarySearchToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedDietary,
  onToggleDietary,
  inStockOnly,
  onToggleInStock,
  onResetFilters,
  totalFilteredCount,
}) => {
  const hasActiveFilters = searchQuery.trim() !== '' || selectedDietary.length > 0 || inStockOnly;

  return (
    <div className="py-4 bg-[#111113] border-b border-[#242428]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by ingredient, dish name, or flavor..."
              className="w-full pl-10 pr-9 py-2 text-xs text-[#F5F5F0] placeholder-[#71717A] bg-[#161618] border border-[#27272A] rounded-sm focus:outline-none focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#F5F5F0]"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Dietary Filters (Functional buttons with active states) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-[#71717A] font-medium mr-1 hidden sm:inline">
              Dietary:
            </span>
            {DIETARY_OPTIONS.map((option) => {
              const isSelected = selectedDietary.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => onToggleDietary(option.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-sm transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#C5A880]/20 text-[#E8D8B8] border border-[#C5A880]/70'
                      : 'bg-[#18181B] text-[#A1A1AA] hover:text-[#F5F5F0] border border-[#27272A]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-[#C5A880]" />}
                  <span>{option.label}</span>
                </button>
              );
            })}

            <button
              onClick={onToggleInStock}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-sm transition-colors cursor-pointer ${
                inStockOnly
                  ? 'bg-[#C5A880]/20 text-[#E8D8B8] border border-[#C5A880]/70'
                  : 'bg-[#18181B] text-[#A1A1AA] hover:text-[#F5F5F0] border border-[#27272A]'
              }`}
            >
              {inStockOnly && <Check className="w-3 h-3 text-[#C5A880]" />}
              <span>In Stock Only</span>
            </button>
          </div>

        </div>

        {/* Filter Summary & Reset Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 text-xs text-[#A1A1AA] border-t border-[#1C1C20]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>
                Showing <strong className="text-[#F5F5F0] font-mono">{totalFilteredCount}</strong> matching dishes
              </span>
            </div>
            <button
              onClick={onResetFilters}
              className="text-[11px] text-[#C5A880] hover:underline uppercase tracking-wider cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
