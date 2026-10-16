import React, { useState } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Layers,
  FileCode2,
  Settings,
  ArrowLeft,
  GitCommit,
  Plus,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { MenuDatabase, MenuItem, Category } from '../../types/menu';
import { AdminDashboard } from './AdminDashboard';
import { CategoryManager } from './CategoryManager';
import { MenuItemEditor } from './MenuItemEditor';
import { RawJsonEditor } from './RawJsonEditor';
import { GitHubSettingsModal } from './GitHubSettingsModal';

interface AdminLayoutProps {
  menu: MenuDatabase;
  sha: string;
  lastModified?: string;
  gitHubConfigured: boolean;
  repoName?: string;
  branch?: string;
  adminToken: string;
  onCommitMenu: (menu: MenuDatabase, message: string) => Promise<void>;
  onRefreshMenu: () => Promise<void>;
  onExitAdmin: () => void;
  onLogout: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  menu,
  sha,
  lastModified,
  gitHubConfigured,
  repoName,
  branch,
  adminToken,
  onCommitMenu,
  onRefreshMenu,
  onExitAdmin,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'items' | 'categories' | 'raw' | 'settings'>('dashboard');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [quickCommitMessage, setQuickCommitMessage] = useState('Update menu inventory and items');

  const handleManualRefresh = async () => {
    setIsSyncing(true);
    try {
      await onRefreshMenu();
    } finally {
      setIsSyncing(false);
    }
  };

  // Item availability toggle
  const handleToggleItemAvailability = async (itemId: string) => {
    const updatedItems = menu.items.map((i) =>
      i.id === itemId ? { ...i, isAvailable: !i.isAvailable } : i
    );
    const item = menu.items.find((i) => i.id === itemId);
    const updatedMenu = { ...menu, items: updatedItems };
    const action = item?.isAvailable ? 'Marked sold out' : 'Marked in stock';
    await onCommitMenu(updatedMenu, `${action}: ${item?.name || itemId}`);
  };

  // Save edited or created item
  const handleSaveItem = async (savedItem: MenuItem) => {
    let updatedItems: MenuItem[];
    const exists = menu.items.some((i) => i.id === savedItem.id);

    if (exists) {
      updatedItems = menu.items.map((i) => (i.id === savedItem.id ? savedItem : i));
    } else {
      updatedItems = [...menu.items, savedItem];
    }

    const updatedMenu = { ...menu, items: updatedItems };
    setEditingItem(null);
    setIsCreatingItem(false);
    await onCommitMenu(
      updatedMenu,
      exists ? `Updated item: ${savedItem.name}` : `Added new item: ${savedItem.name}`
    );
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    const item = menu.items.find((i) => i.id === itemId);
    if (!confirm(`Are you sure you want to delete "${item?.name || 'this item'}"?`)) return;

    const updatedItems = menu.items.filter((i) => i.id !== itemId);
    const updatedMenu = { ...menu, items: updatedItems };
    await onCommitMenu(updatedMenu, `Removed item: ${item?.name || itemId}`);
  };

  // Save categories update
  const handleUpdateCategories = async (updatedCategories: Category[]) => {
    const updatedMenu = { ...menu, categories: updatedCategories };
    await onCommitMenu(updatedMenu, 'Updated category hierarchy and ordering');
  };

  return (
    <div className="min-h-screen bg-[#0D0D0E] text-[#F5F5F0]">
      {/* Top Admin Bar */}
      <header className="sticky top-0 z-40 bg-[#121215]/95 backdrop-blur-md border-b border-[#242428]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onExitAdmin}
              className="p-1.5 text-[#A1A1AA] hover:text-[#F5F5F0] hover:bg-[#18181C] rounded-xs transition-colors flex items-center gap-1 text-xs cursor-pointer"
              title="Return to Public Customer Menu"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Public Menu</span>
            </button>

            <div className="h-5 w-[1px] bg-[#27272A]" />

            <div className="flex items-baseline gap-2">
              <span className="font-serif text-lg font-bold text-[#F5F5F0]">L'Étoile</span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#C5A880]">
                Admin Console
              </span>
            </div>
          </div>

          {/* Quick Git info and sync */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={isSyncing}
              className="p-1.5 text-[#A1A1AA] hover:text-[#F5F5F0] rounded-xs transition-colors cursor-pointer"
              title="Fetch fresh data from server/GitHub"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#C5A880]' : ''}`} />
            </button>

            <button
              onClick={() => setIsCreatingItem(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-wider font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Dish</span>
            </button>

            <button
              onClick={onLogout}
              className="p-1.5 text-[#A1A1AA] hover:text-[#EF4444] rounded-xs transition-colors cursor-pointer"
              title="Sign Out of Admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
            { id: 'items', label: 'Menu Items', icon: UtensilsCrossed },
            { id: 'categories', label: 'Categories', icon: Layers },
            { id: 'raw', label: 'Raw JSON & Sync', icon: FileCode2 },
            { id: 'settings', label: 'GitHub Config', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#C5A880] text-[#C5A880]'
                    : 'border-transparent text-[#A1A1AA] hover:text-[#F5F5F0] hover:border-[#38383E]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <AdminDashboard
            menu={menu}
            sha={sha}
            lastModified={lastModified}
            gitHubConfigured={gitHubConfigured}
            repoName={repoName}
            branch={branch}
            onNavigateTab={setActiveTab}
            onOpenAddItem={() => setIsCreatingItem(true)}
            onToggleItemAvailability={handleToggleItemAvailability}
            onOpenEditItem={(item) => setEditingItem(item)}
          />
        )}

        {activeTab === 'items' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-semibold text-[#F5F5F0]">
                  Full Menu Item Catalog
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  Configure names, descriptions, pricing, allergen warnings, and custom doneness / add-on groups.
                </p>
              </div>
              <button
                onClick={() => setIsCreatingItem(true)}
                className="px-3.5 py-2 text-xs uppercase tracking-wider font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Dish</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menu.items.map((item) => {
                const category = menu.categories.find((c) => c.id === item.categoryId);
                return (
                  <div
                    key={item.id}
                    className="p-4 bg-[#141417] border border-[#242428] rounded-sm space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-[#C5A880]">
                          {category?.name || item.categoryId}
                        </span>
                        <span className="font-mono text-xs font-semibold text-[#F5F5F0]">
                          {menu.restaurant.currencySymbol}{item.basePrice.toFixed(2)}
                        </span>
                      </div>

                      <h4 className="font-serif text-base font-semibold text-[#F5F5F0]">
                        {item.name}
                      </h4>
                      <p className="text-xs text-[#8E8E93] line-clamp-2">
                        {item.description}
                      </p>

                      <div className="text-[11px] text-[#71717A] space-y-0.5 pt-1">
                        {item.dietary.length > 0 && <div>{item.dietary.join(' · ')}</div>}
                        <div>{item.customizationGroups.length} customization groups</div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#1F1F24] flex items-center justify-between">
                      <button
                        onClick={() => handleToggleItemAvailability(item.id)}
                        className={`px-2 py-0.5 text-[10px] font-mono rounded-xs border transition-colors cursor-pointer ${
                          item.isAvailable
                            ? 'bg-[#064E3B]/30 text-[#6EE7B7] border-[#059669]/40'
                            : 'bg-[#450A0A]/40 text-[#FCA5A5] border-[#EF4444]/40'
                        }`}
                      >
                        {item.isAvailable ? 'In Stock' : 'Sold Out'}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="text-xs text-[#C5A880] hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <span className="text-[#3F3F46]">·</span>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-xs text-[#71717A] hover:text-[#EF4444] cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <CategoryManager
            menu={menu}
            onUpdateCategories={handleUpdateCategories}
          />
        )}

        {activeTab === 'raw' && (
          <RawJsonEditor
            currentMenu={menu}
            sha={sha}
            gitHubConfigured={gitHubConfigured}
            onCommit={async (updatedMenu, message) => {
              await onCommitMenu(updatedMenu, message);
            }}
          />
        )}

        {activeTab === 'settings' && (
          <GitHubSettingsModal
            token={adminToken}
            onConfigSaved={handleManualRefresh}
          />
        )}
      </main>

      {/* Menu Item Form Modal (Add / Edit) */}
      {(isCreatingItem || editingItem) && (
        <MenuItemEditor
          item={editingItem}
          categories={menu.categories}
          currencySymbol={menu.restaurant.currencySymbol}
          onSave={handleSaveItem}
          onCancel={() => {
            setIsCreatingItem(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};
