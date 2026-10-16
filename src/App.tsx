import React, { useState, useEffect, useRef } from 'react';
import {
  MenuDatabase,
  MenuItem,
  CartItem,
  DietaryType,
} from './types/menu';
import { fetchMenuData, commitMenuChanges, getGitHubStatus } from './services/api';

// Public Menu Components
import { Header } from './components/menu/Header';
import { Hero } from './components/menu/Hero';
import { CategoryNav } from './components/menu/CategoryNav';
import { DietarySearchToolbar } from './components/menu/DietarySearchToolbar';
import { DishCard } from './components/menu/DishCard';
import { CustomizationModal } from './components/menu/CustomizationModal';
import { OrderTrayDrawer } from './components/menu/OrderTrayDrawer';
import { ReservationModal } from './components/menu/ReservationModal';
import { ShareOrderModal } from './components/menu/ShareOrderModal';

// Admin Components
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminLayout } from './components/admin/AdminLayout';

export default function App() {
  // Navigation / View state
  const [currentView, setCurrentView] = useState<'menu' | 'admin'>('menu');
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('etoile_admin_token');
  });

  // Menu database state
  const [menu, setMenu] = useState<MenuDatabase | null>(null);
  const [menuSha, setMenuSha] = useState<string>('');
  const [menuSource, setMenuSource] = useState<'github' | 'local'>('local');
  const [lastModified, setLastModified] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // GitHub integration state
  const [gitHubStatus, setGitHubStatus] = useState<{
    configured: boolean;
    owner: string;
    repo: string;
    branch: string;
  }>({
    configured: false,
    owner: '',
    repo: '',
    branch: 'main',
  });

  // Cart / Order Tray state (persisted in localStorage)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('etoile_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // UI Modals and Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedDishForCustomization, setSelectedDishForCustomization] = useState<MenuItem | null>(null);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDietary, setSelectedDietary] = useState<DietaryType[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState('starters');

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('etoile_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [cartItems]);

  // Load menu data on mount
  const loadMenu = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchMenuData();
      setMenu(data.menu);
      setMenuSha(data.sha || '');
      setMenuSource(data.source || 'local');
      setLastModified(data.lastModified || '');
      if (data.menu.categories.length > 0) {
        setActiveCategoryId(data.menu.categories[0].id);
      }

      // Check GitHub status
      const gh = await getGitHubStatus().catch(() => null);
      if (gh) {
        setGitHubStatus({
          configured: gh.configured,
          owner: gh.owner,
          repo: gh.repo,
          branch: gh.branch,
        });
      }
    } catch (err: any) {
      console.error('Menu load error:', err);
      setLoadError(err.message || 'Could not load menu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // Scroll spy for sticky category bar
  useEffect(() => {
    if (currentView !== 'menu' || !menu) return;

    const handleScroll = () => {
      const categories = menu.categories.filter((c) => c.isActive);
      const scrollPosition = window.scrollY + 200;

      for (let i = categories.length - 1; i >= 0; i--) {
        const cat = categories[i];
        const el = document.getElementById(cat.id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveCategoryId(cat.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentView, menu]);

  // Cart operations
  const handleAddToCart = (newItem: CartItem) => {
    setCartItems((prev) => {
      // Check if item with identical customization already exists
      const existingIndex = prev.findIndex(
        (i) =>
          i.menuItemId === newItem.menuItemId &&
          JSON.stringify(i.customizations) === JSON.stringify(newItem.customizations) &&
          i.specialNotes === newItem.specialNotes
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += newItem.quantity;
        return updated;
      }
      return [...prev, newItem];
    });

    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQ = item.quantity + delta;
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Admin authentication handlers
  const handleAdminLoginSuccess = (token: string) => {
    setAdminToken(token);
    localStorage.setItem('etoile_admin_token', token);
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('etoile_admin_token');
    setCurrentView('menu');
  };

  // Commit changes from Admin (pushes to GitHub & local file)
  const handleCommitMenu = async (updatedMenu: MenuDatabase, message: string) => {
    if (!adminToken) return;
    try {
      const res = await commitMenuChanges(updatedMenu, message, adminToken, menuSha);
      setMenu(updatedMenu);
      if (res.sha) {
        setMenuSha(res.sha);
      }
      setLastModified(new Date().toISOString());
    } catch (err: any) {
      alert(`Commit error: ${err.message}`);
      throw err;
    }
  };

  // Dietary toggle filter
  const handleToggleDietary = (diet: DietaryType) => {
    if (selectedDietary.includes(diet)) {
      setSelectedDietary(selectedDietary.filter((d) => d !== diet));
    } else {
      setSelectedDietary([...selectedDietary, diet]);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDietary([]);
    setInStockOnly(false);
  };

  // Select category from nav bar
  const handleSelectCategory = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    const element = document.getElementById(categoryId);
    if (element) {
      const navOffset = 130;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  // Loading Screen
  if (isLoading && !menu) {
    return (
      <div className="min-h-screen bg-[#0D0D0E] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border border-[#C5A880]/30 border-t-[#C5A880] animate-spin" />
        <span className="font-serif text-lg tracking-widest text-[#F5F5F0] uppercase">
          L'Étoile Gastronomie
        </span>
        <span className="text-xs text-[#71717A] tracking-wider">
          Retrieving seasonal terroir from Git repository...
        </span>
      </div>
    );
  }

  // Error screen with retry
  if (loadError && !menu) {
    return (
      <div className="min-h-screen bg-[#0D0D0E] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#450A0A]/40 border border-[#EF4444]/40 flex items-center justify-center text-[#EF4444] text-xl font-mono">
          !
        </div>
        <h2 className="font-serif text-2xl text-[#F5F5F0]">Unable to Load Menu</h2>
        <p className="text-xs text-[#A1A1AA] max-w-md">{loadError}</p>
        <button
          onClick={loadMenu}
          className="px-6 py-2.5 text-xs uppercase tracking-widest font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!menu) return null;

  // Filter items based on keyword search, dietary filter pills, and inStock toggle
  const filteredItems = menu.items.filter((item) => {
    // Keyword search match in name or description
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchAllergens = item.allergens.some((a) => a.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchAllergens) return false;
    }

    // Dietary filter (dish must satisfy all selected dietary tags)
    if (selectedDietary.length > 0) {
      const hasAllDietary = selectedDietary.every((d) => item.dietary.includes(d));
      if (!hasAllDietary) return false;
    }

    // In-stock toggle
    if (inStockOnly && !item.isAvailable) {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#0D0D0E] text-[#F5F5F0] selection:bg-[#C5A880]/30 selection:text-[#E8D8B8]">
      {/* View routing: Public Customer Menu vs Admin Control Panel */}
      {currentView === 'admin' ? (
        !adminToken ? (
          <AdminLogin
            onSuccess={handleAdminLoginSuccess}
            onCancel={() => setCurrentView('menu')}
          />
        ) : (
          <AdminLayout
            menu={menu}
            sha={menuSha}
            lastModified={lastModified}
            gitHubConfigured={gitHubStatus.configured}
            repoName={gitHubStatus.repo}
            branch={gitHubStatus.branch}
            adminToken={adminToken}
            onCommitMenu={handleCommitMenu}
            onRefreshMenu={loadMenu}
            onExitAdmin={() => setCurrentView('menu')}
            onLogout={handleAdminLogout}
          />
        )
      ) : (
        /* Public Customer Menu */
        <div>
          {/* Top Bar Contract (3 zones: 1-line wordmark, single-line links, primary action) */}
          <Header
            cartItems={cartItems}
            currencySymbol={menu.restaurant.currencySymbol}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenAdmin={() => setCurrentView('admin')}
            onOpenReservations={() => setIsReservationOpen(true)}
            activeView="menu"
          />

          {/* Hero Section with fine dining ambiance, hours, address, accolades */}
          <Hero
            restaurant={menu.restaurant}
            onOpenReservations={() => setIsReservationOpen(true)}
            syncSource={menuSource}
          />

          {/* Sticky Category Navigation Bar with active scroll state tracking */}
          <CategoryNav
            categories={menu.categories}
            items={menu.items}
            activeCategoryId={activeCategoryId}
            onSelectCategory={handleSelectCategory}
          />

          {/* Real-time Keyword Search & Dietary Filter Toolbar */}
          <DietarySearchToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedDietary={selectedDietary}
            onToggleDietary={handleToggleDietary}
            inStockOnly={inStockOnly}
            onToggleInStock={() => setInStockOnly(!inStockOnly)}
            onResetFilters={handleResetFilters}
            totalFilteredCount={filteredItems.length}
          />

          {/* Main Menu Categories & Dishes Grid */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
            {menu.categories
              .filter((c) => c.isActive)
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((category) => {
                const categoryDishes = filteredItems
                  .filter((item) => item.categoryId === category.id)
                  .sort((a, b) => a.displayOrder - b.displayOrder);

                if (categoryDishes.length === 0 && (searchQuery || selectedDietary.length > 0)) {
                  return null;
                }

                return (
                  <section
                    key={category.id}
                    id={category.id}
                    className="scroll-mt-36 space-y-6 pt-4"
                  >
                    {/* Category Title Header */}
                    <div className="border-b border-[#242428] pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-[#C5A880]">
                          Course 0{category.displayOrder}
                        </span>
                        <h2 className="font-serif text-2xl sm:text-3xl text-[#F5F5F0] font-normal tracking-tight">
                          {category.name}
                        </h2>
                      </div>
                      {category.description && (
                        <p className="text-xs text-[#8E8E93] max-w-md font-light italic">
                          {category.description}
                        </p>
                      )}
                    </div>

                    {/* Dishes Grid */}
                    {categoryDishes.length === 0 ? (
                      <div className="p-8 text-center bg-[#141417] border border-[#242428] rounded-sm text-xs text-[#71717A]">
                        No dishes currently available in this section matching your filters.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categoryDishes.map((dish) => (
                          <DishCard
                            key={dish.id}
                            item={dish}
                            currencySymbol={menu.restaurant.currencySymbol}
                            onSelectDish={(item) => setSelectedDishForCustomization(item)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
          </main>

          {/* Luxury Restaurant Footer */}
          <footer className="border-t border-[#242428] bg-[#0A0A0C] text-[#8E8E93] py-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-3 md:col-span-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl text-[#F5F5F0] font-bold">L'Étoile</span>
                    <span className="text-[10px] tracking-[0.25em] text-[#C5A880] uppercase font-semibold">
                      Gastronomie
                    </span>
                  </div>
                  <p className="text-xs text-[#71717A] max-w-sm leading-relaxed">
                    Celebrating contemporary culinary art, bio-dynamic vine cultivation, and artisanal terroir in the heart of Paris.
                  </p>
                  <p className="text-[11px] text-[#52525B]">
                    Persisted directly on GitHub Contents API · Zero third-party databases
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="uppercase tracking-widest text-[#F5F5F0] font-semibold text-[11px]">
                    Service Hours
                  </span>
                  <p className="text-[#A1A1AA]">Dinner: Tue–Sat 18:00 – 23:30</p>
                  <p className="text-[#A1A1AA]">Lunch: Sat–Sun 12:00 – 15:00</p>
                  <p className="text-[#71717A]">Sunday Dinner & Monday: Closed</p>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="uppercase tracking-widest text-[#F5F5F0] font-semibold text-[11px]">
                    Location & Concierge
                  </span>
                  <p className="text-[#A1A1AA]">{menu.restaurant.address || '42 Rue de l\'Amirauté, Paris'}</p>
                  <p className="text-[#A1A1AA]">{menu.restaurant.phone || '+33 1 42 68 55 00'}</p>
                  <div className="pt-2">
                    <button
                      onClick={() => setCurrentView('admin')}
                      className="text-xs text-[#C5A880] hover:underline uppercase tracking-wider font-semibold cursor-pointer"
                    >
                      Staff / Admin Gateway →
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-[#1C1C20] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#52525B]">
                <p>© 2026 L'Étoile Gastronomie. All rights reserved.</p>
                <p>Git-backed schema · SHA {menuSha ? menuSha.substring(0, 8) : 'local'}</p>
              </div>
            </div>
          </footer>

          {/* Floating Mobile Cart / Tray Pill (Does not exceed 15% mobile viewport cap) */}
          {cartItems.length > 0 && !isCartOpen && (
            <div className="fixed bottom-4 inset-x-4 sm:hidden z-40">
              <button
                onClick={() => setIsCartOpen(true)}
                className="w-full py-3 px-5 bg-[#C5A880] text-[#0D0D0E] rounded-sm font-semibold text-xs uppercase tracking-wider flex items-center justify-between shadow-2xl"
              >
                <span>View Selection Tray ({cartItems.reduce((a, b) => a + b.quantity, 0)})</span>
                <span className="font-mono text-sm font-bold">
                  {menu.restaurant.currencySymbol}
                  {cartItems.reduce((a, b) => a + b.unitPrice * b.quantity, 0).toFixed(2)}
                </span>
              </button>
            </div>
          )}

          {/* Dish Customization Modal */}
          <CustomizationModal
            dish={selectedDishForCustomization}
            currencySymbol={menu.restaurant.currencySymbol}
            onClose={() => setSelectedDishForCustomization(null)}
            onAddToCart={handleAddToCart}
          />

          {/* Tableside Order Tray Drawer */}
          <OrderTrayDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cartItems={cartItems}
            restaurant={menu.restaurant}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            onOpenShareModal={() => setIsShareOpen(true)}
          />

          {/* Reservation Modal */}
          <ReservationModal
            isOpen={isReservationOpen}
            onClose={() => setIsReservationOpen(false)}
            restaurant={menu.restaurant}
          />

          {/* Tableside Share QR Modal */}
          <ShareOrderModal
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            cartItems={cartItems}
            restaurant={menu.restaurant}
          />
        </div>
      )}
    </div>
  );
}
