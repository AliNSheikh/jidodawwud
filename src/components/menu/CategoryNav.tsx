import React, { useEffect, useRef } from 'react';
import { Category, MenuItem } from '../../types/menu';

interface CategoryNavProps {
  categories: Category[];
  items: MenuItem[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  items,
  activeCategoryId,
  onSelectCategory,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the active category button into horizontal view
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const activeButton = scrollContainerRef.current.querySelector<HTMLButtonElement>(
      `[data-category-id="${activeCategoryId}"]`
    );
    if (activeButton) {
      activeButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeCategoryId]);

  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <div className="sticky top-18 z-30 w-full bg-[#0D0D0E]/95 backdrop-blur-md border-b border-[#242428] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {activeCategories.map((category) => {
            const itemCount = items.filter(
              (item) => item.categoryId === category.id && item.isAvailable
            ).length;
            const isActive = activeCategoryId === category.id;

            return (
              <button
                key={category.id}
                data-category-id={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider font-medium rounded-sm whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C5A880] text-[#0D0D0E] font-semibold shadow-xs'
                    : 'bg-[#161618] text-[#A1A1AA] hover:text-[#F5F5F0] hover:bg-[#1D1D21] border border-[#27272A]'
                }`}
              >
                <span>{category.name}</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded-xs ${
                    isActive
                      ? 'bg-[#0D0D0E]/20 text-[#0D0D0E]'
                      : 'bg-[#27272A] text-[#71717A]'
                  }`}
                >
                  {itemCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
