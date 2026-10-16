import React from 'react';
import {
  Layers,
  Utensils,
  CheckCircle2,
  XCircle,
  GitCommit,
  Plus,
  FileCode2,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { MenuDatabase, MenuItem } from '../../types/menu';

interface AdminDashboardProps {
  menu: MenuDatabase;
  sha: string;
  lastModified?: string;
  gitHubConfigured: boolean;
  repoName?: string;
  branch?: string;
  onNavigateTab: (tab: 'items' | 'categories' | 'raw' | 'settings') => void;
  onOpenAddItem: () => void;
  onToggleItemAvailability: (itemId: string) => void;
  onOpenEditItem: (item: MenuItem) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  menu,
  sha,
  lastModified,
  gitHubConfigured,
  repoName,
  branch,
  onNavigateTab,
  onOpenAddItem,
  onToggleItemAvailability,
  onOpenEditItem,
}) => {
  const totalItems = menu.items.length;
  const activeItems = menu.items.filter((i) => i.isAvailable).length;
  const soldOutItems = totalItems - activeItems;
  const totalCategories = menu.categories.length;

  return (
    <div className="space-y-8">
      {/* Top Banner & Git Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-[#141417] border border-[#27272A] rounded-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-[#C5A880] font-semibold">
              Live Persistence Engine
            </span>
            <span className="text-xs text-[#52525B]">·</span>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-xs border ${
                gitHubConfigured
                  ? 'bg-[#064E3B]/40 text-[#6EE7B7] border-[#059669]/40'
                  : 'bg-[#78350F]/40 text-[#FCD34D] border-[#D97706]/40'
              }`}
            >
              {gitHubConfigured ? 'GitHub Contents API Active' : 'Local Git Mode (Pending PAT)'}
            </span>
          </div>

          <p className="text-xs text-[#A1A1AA]">
            {gitHubConfigured ? (
              <>
                Target: <strong className="text-[#F5F5F0] font-mono">{repoName || 'repository'}</strong> on branch{' '}
                <strong className="text-[#C5A880] font-mono">{branch || 'main'}</strong>
              </>
            ) : (
              'Changes are currently saved locally to data/menu.json. Configure your GitHub Personal Access Token to push commits.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('settings')}
            className="px-3 py-1.5 text-xs text-[#D4D4D8] hover:text-[#F5F5F0] bg-[#1A1A1E] hover:bg-[#222227] border border-[#2C2C32] rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>GitHub Settings</span>
          </button>
          <button
            onClick={() => onNavigateTab('raw')}
            className="px-3 py-1.5 text-xs text-[#D4D4D8] hover:text-[#F5F5F0] bg-[#1A1A1E] hover:bg-[#222227] border border-[#2C2C32] rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileCode2 className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Raw JSON & Commit</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Items */}
        <div className="p-4 bg-[#141417] border border-[#242428] rounded-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#8E8E93]">
            <span>Active Menu Items</span>
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#F5F5F0]">
            {activeItems} <span className="text-xs font-sans text-[#71717A] font-normal">/ {totalItems}</span>
          </div>
          <div className="text-[11px] text-[#A1A1AA]">Available for tableside orders</div>
        </div>

        {/* Sold-out Items */}
        <div className="p-4 bg-[#141417] border border-[#242428] rounded-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#8E8E93]">
            <span>Sold Out / Inactive</span>
            <XCircle className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#EF4444]">
            {soldOutItems}
          </div>
          <div className="text-[11px] text-[#A1A1AA]">Toggled unavailable</div>
        </div>

        {/* Categories Count */}
        <div className="p-4 bg-[#141417] border border-[#242428] rounded-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#8E8E93]">
            <span>Categories</span>
            <Layers className="w-4 h-4 text-[#C5A880]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#F5F5F0]">
            {totalCategories}
          </div>
          <div className="text-[11px] text-[#A1A1AA]">Organized tasting sections</div>
        </div>

        {/* Current SHA */}
        <div className="p-4 bg-[#141417] border border-[#242428] rounded-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#8E8E93]">
            <span>Git Commit SHA</span>
            <GitCommit className="w-4 h-4 text-[#C5A880]" />
          </div>
          <div className="font-mono text-sm font-semibold text-[#C5A880] truncate" title={sha}>
            {sha ? sha.substring(0, 10) : 'local-seed'}
          </div>
          <div className="text-[11px] text-[#71717A] truncate">
            {lastModified ? new Date(lastModified).toLocaleTimeString() : 'Current session'}
          </div>
        </div>
      </div>

      {/* Quick Action Item Availability Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#F5F5F0]">
              Quick Inventory & Stock Toggles
            </h3>
            <p className="text-xs text-[#8E8E93]">
              Instantly toggle dishes as "In Stock" or "Sold Out" for real-time customer updates.
            </p>
          </div>
          <button
            onClick={onOpenAddItem}
            className="px-3.5 py-2 text-xs uppercase tracking-wider font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Dish</span>
          </button>
        </div>

        <div className="border border-[#242428] rounded-sm overflow-hidden bg-[#141417]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181C] border-b border-[#242428] text-[#8E8E93] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Dish</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Base Price</th>
                  <th className="py-3 px-4">Customizations</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F24]">
                {menu.items.map((item) => {
                  const category = menu.categories.find((c) => c.id === item.categoryId);
                  return (
                    <tr key={item.id} className="hover:bg-[#18181C]/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#F5F5F0]">{item.name}</div>
                        <div className="text-[10px] text-[#71717A] line-clamp-1">{item.description}</div>
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA] whitespace-nowrap">
                        {category?.name || item.categoryId}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#C5A880] tabular-nums whitespace-nowrap">
                        {menu.restaurant.currencySymbol}{item.basePrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA] whitespace-nowrap">
                        {item.customizationGroups.length > 0
                          ? `${item.customizationGroups.length} groups`
                          : 'None'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => onToggleItemAvailability(item.id)}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-xs border transition-colors cursor-pointer ${
                            item.isAvailable
                              ? 'bg-[#064E3B]/30 text-[#6EE7B7] border-[#059669]/40 hover:bg-[#064E3B]/60'
                              : 'bg-[#450A0A]/40 text-[#FCA5A5] border-[#EF4444]/40 hover:bg-[#450A0A]/70'
                          }`}
                        >
                          {item.isAvailable ? 'In Stock' : 'Sold Out'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onOpenEditItem(item)}
                          className="text-[11px] text-[#C5A880] hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
