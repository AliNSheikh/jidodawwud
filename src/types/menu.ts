export type DietaryType = "vegan" | "vegetarian" | "gluten-free" | "halal" | "nut-free";

export interface CustomizationOption {
  id: string;
  name: string;
  priceModifier: number; // 0.00 for free options, >0 for upcharges
  isDefault?: boolean;
}

export interface CustomizationGroup {
  id: string;
  title: string;
  type: "single" | "multiple";
  required: boolean;
  minSelections?: number;
  maxSelections?: number;
  options: CustomizationOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  isAvailable: boolean;
  dietary: DietaryType[];
  allergens: string[];
  displayOrder: number;
  customizationGroups: CustomizationGroup[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface RestaurantInfo {
  name: string;
  tagline: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  address?: string;
  phone?: string;
  hours?: string;
  serviceChargePercent?: number;
  taxPercent?: number;
}

export interface MenuDatabase {
  restaurant: RestaurantInfo;
  categories: Category[];
  items: MenuItem[];
}

export interface SelectedCustomization {
  groupId: string;
  groupTitle: string;
  optionIds: string[];
  optionNames: string[];
  priceAddition: number;
}

export interface CartItem {
  id: string; // unique cart line item id
  menuItemId: string;
  name: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
  customizations: SelectedCustomization[];
  specialNotes?: string;
}

export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  hasPat: boolean;
}

export interface GitHubCommitResult {
  success: boolean;
  sha?: string;
  commitUrl?: string;
  message?: string;
  timestamp?: string;
  error?: string;
}
