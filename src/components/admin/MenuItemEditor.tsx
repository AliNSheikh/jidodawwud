import React, { useState } from 'react';
import { X, Plus, Trash2, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import {
  MenuItem,
  Category,
  CustomizationGroup,
  DietaryType,
} from '../../types/menu';
import { ImageWithFallback } from '../common/ImageWithFallback';

interface MenuItemEditorProps {
  item: MenuItem | null; // null if creating new
  categories: Category[];
  currencySymbol: string;
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
}

const DIETARY_OPTIONS: { id: DietaryType; label: string }[] = [
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'halal', label: 'Halal' },
  { id: 'nut-free', label: 'Nut-Free' },
];

export const MenuItemEditor: React.FC<MenuItemEditorProps> = ({
  item,
  categories,
  currencySymbol,
  onSave,
  onCancel,
}) => {
  const isEditing = Boolean(item);

  const [name, setName] = useState(item?.name || '');
  const [categoryId, setCategoryId] = useState(item?.categoryId || (categories[0]?.id || ''));
  const [description, setDescription] = useState(item?.description || '');
  const [basePrice, setBasePrice] = useState(item ? item.basePrice.toString() : '25.00');
  const [imageUrl, setImageUrl] = useState(item?.imageUrl || '');
  const [isAvailable, setIsAvailable] = useState(item ? item.isAvailable : true);
  const [dietary, setDietary] = useState<DietaryType[]>(item?.dietary || []);
  const [allergensText, setAllergensText] = useState(item?.allergens.join(', ') || '');
  const [customizationGroups, setCustomizationGroups] = useState<CustomizationGroup[]>(
    item?.customizationGroups ? JSON.parse(JSON.stringify(item.customizationGroups)) : []
  );
  const [error, setError] = useState<string | null>(null);

  // Toggle dietary tag
  const handleToggleDietary = (diet: DietaryType) => {
    if (dietary.includes(diet)) {
      setDietary(dietary.filter((d) => d !== diet));
    } else {
      setDietary([...dietary, diet]);
    }
  };

  // Customization group management
  const addCustomizationGroup = () => {
    const newGroup: CustomizationGroup = {
      id: `group-${Date.now()}`,
      title: 'New Option Group',
      type: 'single',
      required: false,
      options: [
        { id: `opt-1`, name: 'Option 1', priceModifier: 0.0, isDefault: true },
        { id: `opt-2`, name: 'Option 2', priceModifier: 0.0, isDefault: false },
      ],
    };
    setCustomizationGroups([...customizationGroups, newGroup]);
  };

  const removeCustomizationGroup = (groupId: string) => {
    setCustomizationGroups(customizationGroups.filter((g) => g.id !== groupId));
  };

  const updateGroup = (groupId: string, field: keyof CustomizationGroup, value: any) => {
    setCustomizationGroups(
      customizationGroups.map((g) => (g.id === groupId ? { ...g, [field]: value } : g))
    );
  };

  const addOptionToGroup = (groupId: string) => {
    setCustomizationGroups(
      customizationGroups.map((g) => {
        if (g.id === groupId) {
          const newOpt = {
            id: `opt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            name: 'New Option',
            priceModifier: 0.0,
            isDefault: false,
          };
          return { ...g, options: [...g.options, newOpt] };
        }
        return g;
      })
    );
  };

  const removeOptionFromGroup = (groupId: string, optionId: string) => {
    setCustomizationGroups(
      customizationGroups.map((g) => {
        if (g.id === groupId) {
          return { ...g, options: g.options.filter((o) => o.id !== optionId) };
        }
        return g;
      })
    );
  };

  const updateOptionInGroup = (
    groupId: string,
    optionId: string,
    field: 'name' | 'priceModifier' | 'isDefault',
    value: any
  ) => {
    setCustomizationGroups(
      customizationGroups.map((g) => {
        if (g.id === groupId) {
          const updatedOptions = g.options.map((o) => {
            if (o.id === optionId) {
              return { ...o, [field]: value };
            }
            // If setting default in single-choice group, unset others
            if (field === 'isDefault' && value === true && g.type === 'single') {
              return { ...o, isDefault: false };
            }
            return o;
          });
          return { ...g, options: updatedOptions };
        }
        return g;
      })
    );
  };

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Dish name is required');
      return;
    }

    const priceNum = parseFloat(basePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Please provide a valid non-negative base price');
      return;
    }

    const allergens = allergensText
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const savedItem: MenuItem = {
      id: item?.id || `item-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(16).substring(0, 4)}`,
      categoryId,
      name: name.trim(),
      description: description.trim(),
      basePrice: priceNum,
      imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
      isAvailable,
      dietary,
      allergens,
      displayOrder: item?.displayOrder || 99,
      customizationGroups,
    };

    onSave(savedItem);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050507]/80 backdrop-blur-sm animate-in fade-in"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] bg-[#111113] border border-[#27272A] rounded-sm shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#222226] flex items-center justify-between bg-[#141417]">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#C5A880] font-semibold">
              Menu Item Editor
            </span>
            <h3 className="font-serif text-xl text-[#F5F5F0] font-medium">
              {isEditing ? `Edit: ${item?.name}` : 'Create New Menu Item'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-[#A1A1AA] hover:text-[#F5F5F0] hover:bg-[#1E1E22] rounded-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="menu-item-form" className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-[#450A0A]/80 border border-[#EF4444]/40 text-[#FCA5A5] text-xs rounded-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8 space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                Dish Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dry-Aged Wagyu Ribeye"
                className="w-full px-3 py-2 text-xs bg-[#161619] border border-[#27272A] rounded-xs text-[#F5F5F0] focus:border-[#C5A880]"
              />
            </div>

            <div className="sm:col-span-4 space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                Category Assignment *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#161619] border border-[#27272A] rounded-xs text-[#F5F5F0] focus:border-[#C5A880]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
              Culinary Description & Ingredients
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed culinary description including preparation method, aging, and sauces..."
              className="w-full p-2.5 text-xs bg-[#161619] border border-[#27272A] rounded-xs text-[#F5F5F0] focus:border-[#C5A880] resize-none"
            />
          </div>

          {/* Pricing & Stock Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                Base Price ({currencySymbol}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[#C5A880] text-xs">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-[#161619] border border-[#27272A] rounded-xs text-[#F5F5F0] focus:border-[#C5A880]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                Inventory Status
              </label>
              <button
                type="button"
                onClick={() => setIsAvailable(!isAvailable)}
                className={`w-full py-2 px-3 text-xs font-medium rounded-xs border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  isAvailable
                    ? 'bg-[#064E3B]/30 text-[#6EE7B7] border-[#059669]/50'
                    : 'bg-[#450A0A]/40 text-[#FCA5A5] border-[#EF4444]/40'
                }`}
              >
                <span>{isAvailable ? 'In Stock (Available on Customer Menu)' : 'Sold Out / Temporarily Unavailable'}</span>
              </button>
            </div>
          </div>

          {/* Image URL & Live Preview */}
          <div className="space-y-2">
            <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
              Dish Photography URL / Asset Path
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... or /images/menu/dish.jpg"
                className="flex-1 px-3 py-2 text-xs bg-[#161619] border border-[#27272A] rounded-xs text-[#F5F5F0] focus:border-[#C5A880]"
              />
              <div className="w-16 h-12 rounded-xs overflow-hidden border border-[#27272A] shrink-0 bg-[#161618]">
                {imageUrl ? (
                  <ImageWithFallback src={imageUrl} alt="Preview" aspectRatioClass="aspect-[4/3]" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#52525B]">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dietary Checkbox Pills */}
          <div className="space-y-2">
            <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
              Dietary Classifications
            </label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((opt) => {
                const isSelected = dietary.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleToggleDietary(opt.id)}
                    className={`px-3 py-1.5 text-xs rounded-xs border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#C5A880]/20 text-[#E8D8B8] border-[#C5A880]'
                        : 'bg-[#18181B] text-[#A1A1AA] border-[#27272A] hover:text-[#F5F5F0]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#C5A880]" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Allergens */}
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
              Allergens (comma separated)
            </label>
            <input
              type="text"
              value={allergensText}
              onChange={(e) => setAllergensText(e.target.value)}
              placeholder="e.g. Dairy, Shellfish, Gluten, Eggs"
              className="w-full px-3 py-2 text-xs bg-[#161619] border border-[#27272A] rounded-xs text-[#F5F5F0]"
            />
          </div>

          {/* Dynamic Customization Groups Builder */}
          <div className="space-y-4 pt-4 border-t border-[#222226]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-serif text-lg text-[#F5F5F0]">
                  Customization Groups Builder
                </h4>
                <p className="text-xs text-[#8E8E93]">
                  Configure option groups (temperatures, add-ons, sauces) with single or multi-choice rules and price modifiers.
                </p>
              </div>
              <button
                type="button"
                onClick={addCustomizationGroup}
                className="px-3 py-1.5 text-xs text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Group</span>
              </button>
            </div>

            {customizationGroups.length === 0 ? (
              <p className="text-xs text-[#71717A] italic p-3 bg-[#161619] rounded-xs border border-[#222226]">
                No customization groups configured for this dish. Click "Add Group" to create options like doneness or luxury add-ons.
              </p>
            ) : (
              <div className="space-y-4">
                {customizationGroups.map((group, groupIdx) => (
                  <div
                    key={group.id}
                    className="p-4 bg-[#16161A] border border-[#27272A] rounded-xs space-y-3"
                  >
                    {/* Group Header Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#252529] pb-2">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-mono text-xs text-[#C5A880]">#{groupIdx + 1}</span>
                        <input
                          type="text"
                          value={group.title}
                          onChange={(e) => updateGroup(group.id, 'title', e.target.value)}
                          placeholder="Group Title (e.g. Cooking Temperature)"
                          className="px-2 py-1 text-xs font-semibold bg-[#111113] border border-[#2C2C30] rounded-xs text-[#F5F5F0] flex-1"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={group.type}
                          onChange={(e) => updateGroup(group.id, 'type', e.target.value as 'single' | 'multiple')}
                          className="px-2 py-1 text-xs bg-[#111113] border border-[#2C2C30] rounded-xs text-[#F5F5F0]"
                        >
                          <option value="single">Single (Radio)</option>
                          <option value="multiple">Multiple (Checkbox)</option>
                        </select>

                        <label className="flex items-center gap-1 text-[11px] text-[#A1A1AA] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={group.required}
                            onChange={(e) => updateGroup(group.id, 'required', e.target.checked)}
                            className="rounded-xs"
                          />
                          <span>Required</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => removeCustomizationGroup(group.id)}
                          className="p-1 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-xs"
                          title="Delete Group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Group Options List */}
                    <div className="space-y-2 pl-2">
                      <span className="text-[10px] uppercase tracking-wider text-[#71717A]">Options</span>
                      {group.options.map((option) => (
                        <div key={option.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option.name}
                            onChange={(e) =>
                              updateOptionInGroup(group.id, option.id, 'name', e.target.value)
                            }
                            placeholder="Option Name"
                            className="flex-1 px-2.5 py-1 text-xs bg-[#111113] border border-[#252529] rounded-xs text-[#F5F5F0]"
                          />

                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-[#A1A1AA]">+</span>
                            <input
                              type="number"
                              step="0.5"
                              value={option.priceModifier}
                              onChange={(e) =>
                                updateOptionInGroup(
                                  group.id,
                                  option.id,
                                  'priceModifier',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="0.00"
                              className="w-20 px-2 py-1 text-xs font-mono bg-[#111113] border border-[#252529] rounded-xs text-[#C5A880]"
                            />
                          </div>

                          <label className="flex items-center gap-1 text-[10px] text-[#8E8E93] cursor-pointer whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={Boolean(option.isDefault)}
                              onChange={(e) =>
                                updateOptionInGroup(group.id, option.id, 'isDefault', e.target.checked)
                              }
                            />
                            <span>Default</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => removeOptionFromGroup(group.id, option.id)}
                            className="p-1 text-[#71717A] hover:text-[#EF4444]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addOptionToGroup(group.id)}
                        className="text-[11px] text-[#C5A880] hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Option</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-[#222226] bg-[#141417] flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs text-[#A1A1AA] hover:text-[#F5F5F0] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="menu-item-form"
            className="px-6 py-2 text-xs uppercase tracking-wider font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs transition-colors cursor-pointer"
          >
            Save Dish
          </button>
        </div>
      </div>
    </div>
  );
};
