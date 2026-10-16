import React from 'react';
import { ShoppingBag, Lock } from 'lucide-react';
import { CartItem } from '../../types/menu';

interface HeaderProps {
  cartItems: CartItem[];
  currencySymbol: string;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  onOpenReservations: () => void;
  activeView: 'menu' | 'admin';
}

export const Header: React.FC<HeaderProps> = ({
  cartItems,
  currencySymbol,
  onOpenCart,
  onOpenAdmin,
  onOpenReservations,
  activeView,
}) => {
  const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0D0D0E]/90 backdrop-blur-md border-b border-[#242428] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element wordmark in display face) */}
        <a
          href="#top"
          className="group flex items-baseline gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880]"
        >
          <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F0] group-hover:text-[#C5A880] transition-colors">
            L'Étoile
          </span>
          <span className="text-[11px] font-sans tracking-[0.25em] text-[#C5A880] uppercase font-semibold">
            Gastronomie
          </span>
        </a>

        {/* Zone 2: 4-5 Concise Single-line Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs tracking-wider uppercase font-medium text-[#A1A1AA]">
          <a
            href="#starters"
            className="hover:text-[#F5F5F0] transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-4 decoration-[#C5A880]"
          >
            Starters
          </a>
          <a
            href="#mains"
            className="hover:text-[#F5F5F0] transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-4 decoration-[#C5A880]"
          >
            Chef's Mains
          </a>
          <a
            href="#sides"
            className="hover:text-[#F5F5F0] transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-4 decoration-[#C5A880]"
          >
            Sides
          </a>
          <a
            href="#desserts"
            className="hover:text-[#F5F5F0] transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-4 decoration-[#C5A880]"
          >
            Desserts
          </a>
          <a
            href="#cellar"
            className="hover:text-[#F5F5F0] transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-4 decoration-[#C5A880]"
          >
            Cellar
          </a>
        </nav>

        {/* Zone 3: Primary Action & Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenReservations}
            className="hidden sm:inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-[#C5A880] border border-[#C5A880]/30 hover:border-[#C5A880] hover:bg-[#C5A880]/10 rounded-sm transition-colors whitespace-nowrap shrink-0"
          >
            Reserve Table
          </button>

          <button
            onClick={onOpenCart}
            aria-label={`Open Order Tray with ${totalItemCount} items`}
            className="relative flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-sm transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2]" />
            <span className="hidden sm:inline">Order Tray</span>
            {totalItemCount > 0 ? (
              <span className="font-mono font-bold text-xs bg-[#0D0D0E] text-[#C5A880] px-1.5 py-0.2 rounded-xs">
                {totalItemCount} · {currencySymbol}{cartSubtotal.toFixed(2)}
              </span>
            ) : (
              <span className="text-[11px] opacity-80">(0)</span>
            )}
          </button>

          <button
            onClick={onOpenAdmin}
            aria-label="Admin Control Panel"
            title="Admin Control Panel (Git Sync & Menu Editor)"
            className={`p-2 rounded-sm border transition-colors ${
              activeView === 'admin'
                ? 'bg-[#C5A880]/15 text-[#C5A880] border-[#C5A880]'
                : 'text-[#A1A1AA] border-[#27272A] hover:text-[#F5F5F0] hover:border-[#3F3F46] bg-[#161618]'
            }`}
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
