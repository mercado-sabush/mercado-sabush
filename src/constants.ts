import { Category } from './types';
import { ShoppingBag, Laptop, Sofa, Wine, Car, Settings, Shirt, Sparkles, Hammer, Construction, Smartphone, ShoppingCart, Tractor, Briefcase } from 'lucide-react';

export const CATEGORIES: Category[] = [
  { id: 'electronics', name: 'Electronics', icon: 'Laptop', productCount: 120, sellerCount: 15, translationKey: 'categories.electronics' },
  { id: 'furniture', name: 'Furniture', icon: 'Sofa', productCount: 45, sellerCount: 8, translationKey: 'categories.furniture' },
  { id: 'home', name: 'Home Necessities', icon: 'ShoppingBag', productCount: 200, sellerCount: 30, translationKey: 'categories.home' },
  { id: 'bottle-store', name: 'Bottle Store', icon: 'Wine', productCount: 80, sellerCount: 5, translationKey: 'categories.bottle_store' },
  { id: 'car-parts', name: 'Car Spare Parts', icon: 'Car', productCount: 150, sellerCount: 12, translationKey: 'categories.car_parts' },
  { id: 'motor-parts', name: 'Motor Spare Parts', icon: 'Settings', productCount: 90, sellerCount: 7, translationKey: 'categories.motor_parts' },
  { id: 'fashion', name: 'Fashion', icon: 'Shirt', productCount: 300, sellerCount: 45, translationKey: 'categories.fashion' },
  { id: 'beauty', name: 'Beauty', icon: 'Sparkles', productCount: 180, sellerCount: 20, translationKey: 'categories.beauty' },
  { id: 'hardware', name: 'Hardware', icon: 'Hammer', productCount: 250, sellerCount: 18, translationKey: 'categories.hardware' },
  { id: 'construction', name: 'Construction', icon: 'Construction', productCount: 110, sellerCount: 10, translationKey: 'categories.construction' },
  { id: 'phones', name: 'Phones & Accessories', icon: 'Smartphone', productCount: 400, sellerCount: 50, translationKey: 'categories.phones' },
  { id: 'supermarket', name: 'Supermarket', icon: 'ShoppingCart', productCount: 1000, sellerCount: 10, translationKey: 'categories.supermarket' },
  { id: 'agriculture', name: 'Agriculture', icon: 'Tractor', productCount: 60, sellerCount: 6, translationKey: 'categories.agriculture' },
  { id: 'office', name: 'Office Supplies', icon: 'Briefcase', productCount: 140, sellerCount: 14, translationKey: 'categories.office' },
];

export const CATEGORY_ICONS: Record<string, any> = {
  Laptop, Sofa, ShoppingBag, Wine, Car, Settings, Shirt, Sparkles, Hammer, Construction, Smartphone, ShoppingCart, Tractor, Briefcase
};

export const PROVINCES = [
  'Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane', 'Sofala', 
  'Manica', 'Tete', 'Zambézia', 'Nampula', 'Cabo Delgado', 'Niassa'
];

export const COUNTRIES = [
  { code: 'MZ', name: 'Mozambique', currency: 'MZN', symbol: 'MT', flag: '🇲🇿' }
];

export const VAT_RATE = 0.17; // Mozambican IVA
export const PHONE_PREFIX = '+258';
