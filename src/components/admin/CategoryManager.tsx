import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Plus, Trash2, Edit2, Check, X, Layers } from 'lucide-react';
import { Category, MenuDatabase } from '../../types/menu';

interface CategoryManagerProps {
  menu: MenuDatabase;
  onUpdateCategories: (categories: Category[]) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  menu,
  onUpdateCategories,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // New category creation state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newId, setNewId] = useState('');

  // Reorder category up or down
  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const sorted = [...menu.categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Swap items
    const temp = sorted[index];
    sorted[index] = sorted[targetIndex];
    sorted[targetIndex] = temp;

    // Reassign sequential display orders
    const updated = sorted.map((cat, idx) => ({
      ...cat,
      displayOrder: idx + 1,
    }));

    onUpdateCategories(updated);
  };

  // Toggle active state
  const toggleActive = (id: string) => {
    const updated = menu.categories.map((cat) =>
      cat.id === id ? { ...cat, isActive: !cat.isActive } : cat
    );
    onUpdateCategories(updated);
  };

  // Start edit
  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || '');
  };

  // Save edit
  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    const updated = menu.categories.map((cat) =>
      cat.id === id
        ? {
            ...cat,
            name: editName.trim(),
            description: editDesc.trim() || undefined,
          }
        : cat
    );
    onUpdateCategories(updated);
    setEditingId(null);
  };

  // Delete category
  const deleteCategory = (id: string) => {
    const itemCount = menu.items.filter((i) => i.categoryId === id).length;
    if (itemCount > 0) {
      alert(`Cannot delete this category because it contains ${itemCount} menu items. Reassign or delete those items first.`);
      return;
    }
    if (confirm('Are you sure you want to delete this category?')) {
      const updated = menu.categories
        .filter((cat) => cat.id !== id)
        .map((cat, idx) => ({ ...cat, displayOrder: idx + 1 }));
      onUpdateCategories(updated);
    }
  };

  // Add new category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const slug = (newId.trim() || newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');
    
    // Check for duplicate ID
    if (menu.categories.some((c) => c.id === slug)) {
      alert('A category with this ID already exists. Please choose another.');
      return;
    }

    const newCategory: Category = {
      id: slug,
      name: newName.trim(),
      description: newDesc.trim() || undefined,
      displayOrder: menu.categories.length + 1,
      isActive: true,
    };

    onUpdateCategories([...menu.categories, newCategory]);
    setNewName('');
    setNewDesc('');
    setNewId('');
    setIsAdding(false);
  };

  const sortedCategories = [...menu.categories].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-xl font-semibold text-[#F5F5F0]">
            Category Hierarchy & Ordering
          </h3>
          <p className="text-xs text-[#8E8E93]">
            Organize the menu structure, rank courses, and configure customer visibility.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3.5 py-2 text-xs uppercase tracking-wider font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* New Category Form */}
      {isAdding && (
        <form
          onSubmit={handleAddCategory}
          className="p-5 bg-[#18181C] border border-[#C5A880]/40 rounded-sm space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#C5A880]">
              Create New Menu Category
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-[#71717A] hover:text-[#F5F5F0]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">
                Category Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Foraged & Fermented"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#111113] border border-[#27272A] rounded-xs text-[#F5F5F0] focus:border-[#C5A880]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">
                Unique Identifier (Slug)
              </label>
              <input
                type="text"
                placeholder="Auto-generated if blank (e.g. foraged)"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-[#111113] border border-[#27272A] rounded-xs text-[#F5F5F0] focus:border-[#C5A880]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">
              Culinary Description
            </label>
            <input
              type="text"
              placeholder="Short description shown at top of section in public menu..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#111113] border border-[#27272A] rounded-xs text-[#F5F5F0] focus:border-[#C5A880]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-[#F5F5F0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs uppercase tracking-wider font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs"
            >
              Save Category
            </button>
          </div>
        </form>
      )}

      {/* Categories List Table */}
      <div className="border border-[#242428] rounded-sm overflow-hidden bg-[#141417]">
        <div className="divide-y divide-[#1F1F24]">
          {sortedCategories.map((cat, index) => {
            const isEditing = editingId === cat.id;
            const itemCount = menu.items.filter((i) => i.categoryId === cat.id).length;

            return (
              <div
                key={cat.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#18181C]/40 transition-colors"
              >
                {/* Drag / Rank Indicators */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button
                      disabled={index === 0}
                      onClick={() => moveCategory(index, 'up')}
                      aria-label="Move category up"
                      className="p-1 text-[#71717A] hover:text-[#F5F5F0] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={index === sortedCategories.length - 1}
                      onClick={() => moveCategory(index, 'down')}
                      aria-label="Move category down"
                      className="p-1 text-[#71717A] hover:text-[#F5F5F0] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="w-6 text-center font-mono text-xs text-[#C5A880]">
                    #{cat.displayOrder}
                  </span>

                  {isEditing ? (
                    <div className="space-y-2 flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2.5 py-1 text-xs bg-[#111113] border border-[#C5A880] rounded-xs text-[#F5F5F0] w-full"
                      />
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description..."
                        className="px-2.5 py-1 text-xs bg-[#111113] border border-[#27272A] rounded-xs text-[#A1A1AA] w-full"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-base font-medium text-[#F5F5F0]">
                          {cat.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#71717A]">({cat.id})</span>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-[#8E8E93] line-clamp-1">{cat.description}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-[11px] text-[#71717A] font-mono">
                    {itemCount} {itemCount === 1 ? 'dish' : 'dishes'}
                  </span>

                  <button
                    onClick={() => toggleActive(cat.id)}
                    className={`px-2.5 py-1 text-[11px] rounded-xs border transition-colors cursor-pointer ${
                      cat.isActive
                        ? 'bg-[#064E3B]/30 text-[#6EE7B7] border-[#059669]/40'
                        : 'bg-[#27272A] text-[#71717A] border-[#3F3F46]'
                    }`}
                  >
                    {cat.isActive ? 'Active' : 'Hidden'}
                  </button>

                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => saveEdit(cat.id)}
                        className="p-1.5 text-[#10B981] hover:bg-[#10B981]/10 rounded-xs"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1.5 text-[#A1A1AA] hover:text-[#C5A880] rounded-xs"
                        title="Edit category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="p-1.5 text-[#71717A] hover:text-[#EF4444] rounded-xs"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
