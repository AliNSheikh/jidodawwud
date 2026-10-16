import React, { useState } from 'react';
import { X, Copy, Check, QrCode } from 'lucide-react';
import { CartItem, RestaurantInfo } from '../../types/menu';

interface ShareOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  restaurant: RestaurantInfo;
}

export const ShareOrderModal: React.FC<ShareOrderModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  restaurant,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
  const total = cartItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050507]/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#111113] border border-[#27272A] rounded-sm shadow-2xl p-6 space-y-5 text-center animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-[#222226] pb-3">
          <div className="flex items-center gap-2 text-left">
            <QrCode className="w-5 h-5 text-[#C5A880]" />
            <div>
              <h3 className="font-serif text-base text-[#F5F5F0] font-semibold">
                Share Tableside Order
              </h3>
              <p className="text-[10px] text-[#A1A1AA]">
                {cartItems.length} items · {restaurant.currencySymbol}{total.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#A1A1AA] hover:text-[#F5F5F0] rounded-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* High-contrast generated SVG QR code */}
        <div className="p-4 bg-white rounded-xs max-w-[200px] mx-auto shadow-md">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Styled QR Code Mock Pattern */}
            <rect width="100" height="100" fill="#ffffff" />
            {/* Top-left corner */}
            <rect x="5" y="5" width="28" height="28" fill="#111111" />
            <rect x="9" y="9" width="20" height="20" fill="#ffffff" />
            <rect x="13" y="13" width="12" height="12" fill="#111111" />
            {/* Top-right corner */}
            <rect x="67" y="5" width="28" height="28" fill="#111111" />
            <rect x="71" y="9" width="20" height="20" fill="#ffffff" />
            <rect x="75" y="13" width="12" height="12" fill="#111111" />
            {/* Bottom-left corner */}
            <rect x="5" y="67" width="28" height="28" fill="#111111" />
            <rect x="9" y="71" width="20" height="20" fill="#ffffff" />
            <rect x="13" y="75" width="12" height="12" fill="#111111" />
            {/* Data matrix dots */}
            <rect x="40" y="8" width="8" height="8" fill="#111111" />
            <rect x="52" y="8" width="6" height="6" fill="#111111" />
            <rect x="40" y="24" width="6" height="6" fill="#111111" />
            <rect x="50" y="22" width="10" height="10" fill="#111111" />
            <rect x="10" y="40" width="8" height="8" fill="#111111" />
            <rect x="22" y="44" width="8" height="6" fill="#111111" />
            <rect x="36" y="38" width="12" height="6" fill="#111111" />
            <rect x="52" y="40" width="8" height="8" fill="#111111" />
            <rect x="66" y="42" width="6" height="14" fill="#111111" />
            <rect x="78" y="38" width="14" height="6" fill="#111111" />
            <rect x="40" y="52" width="8" height="12" fill="#111111" />
            <rect x="52" y="54" width="8" height="8" fill="#111111" />
            <rect x="40" y="70" width="14" height="6" fill="#111111" />
            <rect x="60" y="66" width="6" height="10" fill="#111111" />
            <rect x="72" y="72" width="10" height="8" fill="#111111" />
            <rect x="86" y="68" width="8" height="18" fill="#111111" />
            <rect x="40" y="82" width="6" height="12" fill="#111111" />
            <rect x="54" y="84" width="14" height="6" fill="#111111" />
            <rect x="72" y="86" width="8" height="8" fill="#111111" />
          </svg>
        </div>

        <p className="text-xs text-[#A1A1AA] leading-relaxed">
          Scan this table code to open or split this dining selection on any mobile device.
        </p>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={currentUrl}
            className="flex-1 px-3 py-2 text-xs bg-[#161619] border border-[#27272A] rounded-xs text-[#A1A1AA] truncate focus:outline-none"
          />
          <button
            onClick={handleCopyLink}
            className="px-3 py-2 text-xs uppercase tracking-wider font-semibold bg-[#C5A880] text-[#0D0D0E] hover:bg-[#D4B992] rounded-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
