import React, { useState, useEffect, useId } from 'react';
import { X, Plus, Minus, Check, AlertCircle } from 'lucide-react';
import { MenuItem, SelectedCustomization, CartItem } from '../../types/menu';
import { ImageWithFallback } from '../common/ImageWithFallback';

interface CustomizationModalProps {
  dish: MenuItem | null;
  currencySymbol: string;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

export const CustomizationModal: React.FC<CustomizationModalProps> = ({
  dish,
  currencySymbol,
  onClose,
  onAddToCart,
}) => {
  const dialogId = useId();

  // State for selections: map of groupId -> array of selected optionIds
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [specialNotes, setSpecialNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize defaults whenever dish changes
  useEffect(() => {
    if (!dish) return;

    const initialSelections: Record<string, string[]> = {};
    dish.customizationGroups.forEach((group) => {
      const defaultOptions = group.options.filter((opt) => opt.isDefault).map((opt) => opt.id);
      if (defaultOptions.length > 0) {
        initialSelections[group.id] = defaultOptions;
      } else if (group.type === 'single' && group.required && group.options.length > 0) {
        initialSelections[group.id] = [group.options[0].id];
      } else {
        initialSelections[group.id] = [];
      }
    });

    setSelections(initialSelections);
    setSpecialNotes('');
    setQuantity(1);
    setValidationError(null);
  }, [dish]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!dish) return null;

  // Toggle or select option
  const handleOptionToggle = (
    groupId: string,
    optionId: string,
    type: 'single' | 'multiple',
    maxSelections?: number
  ) => {
    setValidationError(null);
    setSelections((prev) => {
      const current = prev[groupId] || [];

      if (type === 'single') {
        return { ...prev, [groupId]: [optionId] };
      }

      // Multiple selection
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      } else {
        if (maxSelections && current.length >= maxSelections) {
          setValidationError(`You can select at most ${maxSelections} options for this group.`);
          return prev;
        }
        return { ...prev, [groupId]: [...current, optionId] };
      }
    });
  };

  // Compute live subtotal
  let unitPrice = dish.basePrice;
  dish.customizationGroups.forEach((group) => {
    const selectedIds = selections[group.id] || [];
    selectedIds.forEach((id) => {
      const opt = group.options.find((o) => o.id === id);
      if (opt) {
        unitPrice += opt.priceModifier;
      }
    });
  });

  const totalPrice = unitPrice * quantity;

  // Validate before adding to cart
  const handleAddToOrder = () => {
    // Check required single or multiple groups
    for (const group of dish.customizationGroups) {
      const chosen = selections[group.id] || [];
      if (group.required && chosen.length === 0) {
        setValidationError(`Please select an option for "${group.title}".`);
        return;
      }
      if (group.minSelections && chosen.length < group.minSelections) {
        setValidationError(`Please select at least ${group.minSelections} options for "${group.title}".`);
        return;
      }
    }

    // Build customizations detail
    const customizationSummary: SelectedCustomization[] = [];
    dish.customizationGroups.forEach((group) => {
      const chosen = selections[group.id] || [];
      if (chosen.length > 0) {
        const optionNames: string[] = [];
        let priceAddition = 0;
        chosen.forEach((id) => {
          const opt = group.options.find((o) => o.id === id);
          if (opt) {
            optionNames.push(opt.name);
            priceAddition += opt.priceModifier;
          }
        });
        customizationSummary.push({
          groupId: group.id,
          groupTitle: group.title,
          optionIds: chosen,
          optionNames,
          priceAddition,
        });
      }
    });

    const cartItem: CartItem = {
      id: `${dish.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      menuItemId: dish.id,
      name: dish.name,
      basePrice: dish.basePrice,
      unitPrice,
      quantity,
      imageUrl: dish.imageUrl,
      customizations: customizationSummary,
      specialNotes: specialNotes.trim() || undefined,
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${dialogId}-title`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#050507]/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col bg-[#111113] border-t sm:border border-[#27272A] rounded-t-lg sm:rounded-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        {/* Top Header with Close */}
        <div className="relative border-b border-[#222226] px-5 py-4 flex items-center justify-between bg-[#141417]">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#C5A880] font-semibold">
              Chef's Atelier Selection
            </span>
            <h2 id={`${dialogId}-title`} className="font-serif text-xl sm:text-2xl text-[#F5F5F0] font-medium">
              {dish.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-[#A1A1AA] hover:text-[#F5F5F0] hover:bg-[#1E1E22] rounded-xs transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-6 flex-1">
          {/* Dish Image & Ingredients Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-5 rounded-xs overflow-hidden border border-[#27272A]">
              <ImageWithFallback
                src={dish.imageUrl}
                alt={dish.name}
                aspectRatioClass="aspect-[4/3]"
              />
            </div>
            <div className="sm:col-span-7 space-y-3">
              <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                {dish.description}
              </p>

              {/* Dietary & Allergens info */}
              <div className="text-[11px] text-[#8E8E93] pt-2 border-t border-[#1F1F24] space-y-1">
                {dish.dietary.length > 0 && (
                  <div>
                    <span className="text-[#A1A1AA] font-medium">Dietary: </span>
                    <span>{dish.dietary.join(' · ')}</span>
                  </div>
                )}
                {dish.allergens.length > 0 && (
                  <div>
                    <span className="text-[#A1A1AA] font-medium">Allergens: </span>
                    <span>{dish.allergens.join(', ')}</span>
                  </div>
                )}
                <div className="font-mono text-xs text-[#C5A880] pt-1">
                  Base Price: {currencySymbol}{dish.basePrice.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div
              role="alert"
              className="flex items-center gap-2 px-3.5 py-2.5 bg-[#450A0A]/60 border border-[#EF4444]/40 text-[#FCA5A5] text-xs rounded-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Customization Groups */}
          {dish.customizationGroups.length > 0 ? (
            <div className="space-y-6 pt-2">
              {dish.customizationGroups.map((group) => {
                const selectedIds = selections[group.id] || [];

                return (
                  <fieldset key={group.id} className="space-y-3">
                    <div className="flex items-baseline justify-between border-b border-[#222226] pb-1.5">
                      <legend className="text-xs uppercase tracking-wider text-[#F5F5F0] font-semibold">
                        {group.title}
                      </legend>
                      <span className="text-[10px] text-[#A1A1AA] font-light">
                        {group.type === 'single'
                          ? group.required
                            ? 'Required · Select 1'
                            : 'Optional · Select 1'
                          : group.maxSelections
                          ? `Optional · Up to ${group.maxSelections}`
                          : 'Optional'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.options.map((option) => {
                        const isChecked = selectedIds.includes(option.id);

                        return (
                          <label
                            key={option.id}
                            onClick={() =>
                              handleOptionToggle(
                                group.id,
                                option.id,
                                group.type,
                                group.maxSelections
                              )
                            }
                            className={`flex items-center justify-between p-3 rounded-xs border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-[#C5A880]/10 border-[#C5A880] text-[#F5F5F0]'
                                : 'bg-[#161619] border-[#252529] text-[#A1A1AA] hover:border-[#38383E] hover:text-[#D4D4D8]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-4 h-4 flex items-center justify-center rounded-${
                                  group.type === 'single' ? 'full' : 'xs'
                                } border transition-colors ${
                                  isChecked
                                    ? 'bg-[#C5A880] border-[#C5A880] text-[#0D0D0E]'
                                    : 'border-[#3F3F46]'
                                }`}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </span>
                              <span className="font-medium">{option.name}</span>
                            </div>

                            {option.priceModifier > 0 ? (
                              <span className="font-mono text-[11px] text-[#C5A880] tabular-nums font-medium">
                                +{currencySymbol}{option.priceModifier.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#71717A] uppercase font-mono">
                                Free
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[#71717A] italic">
              This signature creation is presented exactly according to the Chef's master recipe with no mandatory modifications.
            </p>
          )}

          {/* Culinary Notes Textarea */}
          <div className="space-y-1.5 pt-2">
            <label
              htmlFor={`${dialogId}-notes`}
              className="block text-xs uppercase tracking-wider text-[#A1A1AA] font-medium"
            >
              Special Culinary Instructions / Notes
            </label>
            <textarea
              id={`${dialogId}-notes`}
              rows={2}
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder="e.g. No garlic butter, extra sauce on the side, anniversary celebration..."
              className="w-full p-2.5 text-xs text-[#F5F5F0] placeholder-[#52525B] bg-[#161619] border border-[#27272A] rounded-xs focus:outline-none focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer: Quantity & Add to Cart Live Subtotal */}
        <div className="border-t border-[#222226] p-4 bg-[#141417] flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs text-[#A1A1AA] uppercase tracking-wider font-medium">
              Quantity:
            </span>
            <div className="flex items-center border border-[#2C2C32] rounded-xs bg-[#1A1A1E]">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="p-1.5 text-[#A1A1AA] hover:text-[#F5F5F0] transition-colors cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 font-mono text-xs font-semibold text-[#F5F5F0] tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
                className="p-1.5 text-[#A1A1AA] hover:text-[#F5F5F0] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Add to Tray Button with Live Price calculation (ARIA live region) */}
          <button
            type="button"
            onClick={handleAddToOrder}
            aria-live="polite"
            className="w-full sm:w-auto px-6 py-2.5 text-xs uppercase tracking-widest font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] transition-colors rounded-xs shadow-md flex items-center justify-center gap-3 cursor-pointer"
          >
            <span>Add to Order Tray</span>
            <span className="font-mono text-sm font-bold bg-[#0D0D0E]/20 px-2 py-0.5 rounded-xs tabular-nums">
              {currencySymbol}{totalPrice.toFixed(2)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
