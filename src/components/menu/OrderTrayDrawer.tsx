import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, Printer, Share2, Utensils, CheckCircle } from 'lucide-react';
import { CartItem, RestaurantInfo } from '../../types/menu';

interface OrderTrayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  restaurant: RestaurantInfo;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onOpenShareModal: () => void;
}

export const OrderTrayDrawer: React.FC<OrderTrayDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  restaurant,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenShareModal,
}) => {
  const [tableNumber, setTableNumber] = useState('14');
  const [guestNotes, setGuestNotes] = useState('');
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  if (!isOpen) return null;

  const currencySymbol = restaurant.currencySymbol || '$';
  const subtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const taxRate = (restaurant.taxPercent || 8.5) / 100;
  const serviceRate = (restaurant.serviceChargePercent || 10) / 100;
  const taxAmount = subtotal * taxRate;
  const serviceCharge = subtotal * serviceRate;
  const grandTotal = subtotal + taxAmount + serviceCharge;

  const handlePrint = () => {
    window.print();
  };

  const handleSendToKitchen = () => {
    setOrderSubmitted(true);
    setTimeout(() => {
      setOrderSubmitted(false);
    }, 4000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden bg-[#050507]/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-y-0 right-0 max-w-full flex pl-10"
      >
        <div className="w-screen max-w-md bg-[#111113] border-l border-[#242428] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-5 border-b border-[#222226] flex items-center justify-between bg-[#141417]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
                <Utensils className="w-4 h-4 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#F5F5F0]">
                  Your Selection Tray
                </h2>
                <span className="text-[11px] text-[#A1A1AA]">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} selected
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cartItems.length > 0 && (
                <button
                  onClick={onClearCart}
                  title="Clear entire tray"
                  className="p-1.5 text-[#71717A] hover:text-[#EF4444] transition-colors rounded-xs"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Close tray"
                className="p-1.5 text-[#A1A1AA] hover:text-[#F5F5F0] hover:bg-[#1E1E22] rounded-xs transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Table assignment selector */}
          <div className="px-5 py-3 bg-[#161619] border-b border-[#222226] flex items-center justify-between text-xs">
            <span className="text-[#A1A1AA] uppercase tracking-wider font-medium">Table Assignment:</span>
            <div className="flex items-center gap-2">
              <span className="text-[#71717A]">Table No.</span>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                maxLength={4}
                className="w-14 px-2 py-1 text-center font-mono font-bold text-xs bg-[#0D0D0E] text-[#C5A880] border border-[#27272A] rounded-xs focus:outline-none focus:border-[#C5A880]"
              />
            </div>
          </div>

          {/* Items List (Scrollable) */}
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {orderSubmitted && (
              <div className="p-3 bg-[#064E3B]/80 border border-[#10B981]/50 rounded-xs text-[#A7F3D0] text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-[#34D399]" />
                <span>Selection transmitted to Sommelier & Kitchen! Enjoy your experience.</span>
              </div>
            )}

            {cartItems.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full border border-[#27272A] flex items-center justify-center text-[#52525B]">
                  <Utensils className="w-5 h-5" />
                </div>
                <p className="text-sm text-[#A1A1AA] font-light">Your selection tray is empty.</p>
                <p className="text-xs text-[#52525B]">
                  Browse the menu cards and click "Customize & View" to curate your tasting course.
                </p>
              </div>
            ) : (
              <div className="space-y-4 divide-y divide-[#1F1F24]">
                {cartItems.map((item) => (
                  <div key={item.id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-serif text-base font-medium text-[#F5F5F0]">
                          {item.name}
                        </h4>
                        <span className="font-mono text-xs text-[#C5A880] tabular-nums">
                          {currencySymbol}{item.unitPrice.toFixed(2)} each
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-[#2A2A30] rounded-xs bg-[#161619]">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="p-1 text-[#A1A1AA] hover:text-[#F5F5F0] transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono text-xs font-semibold text-[#F5F5F0] tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="p-1 text-[#A1A1AA] hover:text-[#F5F5F0] transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Chosen Customizations */}
                    {item.customizations.length > 0 && (
                      <div className="pl-2 border-l border-[#27272A] space-y-1 text-[11px] text-[#A1A1AA]">
                        {item.customizations.map((cust) => (
                          <div key={cust.groupId} className="flex justify-between">
                            <span className="text-[#8E8E93]">{cust.groupTitle}:</span>
                            <span className="text-[#D4D4D8] font-medium">{cust.optionNames.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Special Notes */}
                    {item.specialNotes && (
                      <p className="text-[11px] text-[#C5A880]/80 italic pl-2 border-l border-[#C5A880]/30">
                        "{item.specialNotes}"
                      </p>
                    )}

                    {/* Subtotal for line item */}
                    <div className="flex justify-between items-center text-xs pt-1">
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-[10px] text-[#71717A] hover:text-[#EF4444] transition-colors"
                      >
                        Remove item
                      </button>
                      <span className="font-mono font-semibold text-[#F5F5F0] tabular-nums">
                        {currencySymbol}{(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bill Calculation & Checkout Footer */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-[#222226] bg-[#141417] space-y-4">
              {/* Special dietary remarks for service */}
              <input
                type="text"
                value={guestNotes}
                onChange={(e) => setGuestNotes(e.target.value)}
                placeholder="Allergy notice or celebration message for captain..."
                className="w-full px-3 py-1.5 text-xs text-[#F5F5F0] placeholder-[#52525B] bg-[#1A1A1E] border border-[#27272A] rounded-xs focus:outline-none focus:border-[#C5A880]"
              />

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-[#A1A1AA] pt-1">
                <div className="flex justify-between">
                  <span>Culinary Subtotal</span>
                  <span className="font-mono text-[#F5F5F0] tabular-nums">
                    {currencySymbol}{subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[#8E8E93]">
                  <span>Estimated Tax ({restaurant.taxPercent || 8.5}%)</span>
                  <span className="font-mono tabular-nums">
                    {currencySymbol}{taxAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[#8E8E93]">
                  <span>Hospitality Service ({restaurant.serviceChargePercent || 10}%)</span>
                  <span className="font-mono tabular-nums">
                    {currencySymbol}{serviceCharge.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-[#222226] text-sm">
                  <span className="font-serif font-bold text-[#F5F5F0]">Estimated Total</span>
                  <span className="font-mono text-lg font-bold text-[#C5A880] tabular-nums">
                    {currencySymbol}{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Transmit, Print, Share */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleSendToKitchen}
                  className="w-full py-3 text-xs uppercase tracking-widest font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Transmit to Server / Captain</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onOpenShareModal}
                    className="py-2 px-3 text-xs uppercase tracking-wider font-medium text-[#D4D4D8] hover:text-[#F5F5F0] bg-[#1A1A1E] hover:bg-[#222227] border border-[#27272A] rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>Share / QR</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="py-2 px-3 text-xs uppercase tracking-wider font-medium text-[#D4D4D8] hover:text-[#F5F5F0] bg-[#1A1A1E] hover:bg-[#222227] border border-[#27272A] rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>Print Bill</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
