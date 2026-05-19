export type UserRole = 'customer' | 'seller' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  isBanned?: boolean;
  phoneNumber?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  preferredLanguage?: string;
  country?: string;
  currency?: string;
  createdAt: string;
}

export type StoreStatus = 'pending' | 'active' | 'suspended';
export type DeliveryOptions = 'pickup' | 'delivery' | 'both';

export interface Store {
  id: string;
  ownerId: string;
  businessName: string;
  category: string;
  description?: string;
  logo?: string;
  banner?: string;
  location: string;
  country: string;
  currency: string;
  latitude?: number;
  longitude?: number;
  whatsappNumber: string;
  deliveryOptions: DeliveryOptions;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  status: StoreStatus;
  createdAt: string;
  translations?: {
    [lang: string]: {
      description: string;
    };
  };
}

export interface WholesaleTier {
  minQuantity: number;
  price: number;
}

export interface Product {
  id: string;
  storeId: string;
  sellerId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  country: string;
  currency: string;
  images: string[];
  stock: number;
  minOrderQuantity: number;
  wholesalePrices?: WholesaleTier[];
  deliveryAvailable: boolean;
  rating: number;
  reviewCount: number;
  status: 'active' | 'hidden' | 'out_of_stock';
  createdAt: string;
  colors?: string[];
  sizes?: string[];
  specs?: { name: string; value: string }[];
  translations?: {
    [lang: string]: {
      name: string;
      description: string;
    };
  };
}

export interface RFQ {
  id: string;
  customerId: string;
  storeId: string;
  productId?: string;
  productName: string;
  quantity: number;
  description: string;
  status: 'pending' | 'responded' | 'closed';
  createdAt: string;
  response?: {
    price: number;
    notes: string;
    respondedAt: string;
  };
}

export interface Favorite {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  productCount: number;
  sellerCount: number;
  translationKey?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  selectedColor?: string;
  selectedSize?: string;
}

export interface Order {
  id: string;
  customerId: string;
  storeId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: 'mpesa' | 'emola' | 'card' | 'cod' | 'bank';
  paymentStatus: 'pending' | 'paid' | 'failed';
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress?: string;
  whatsappContacted: boolean;
  country: string;
  currency: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  orderId?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'chat' | 'mpesa' | 'emola' | 'bank';
  read: boolean;
  createdAt: string;
}

export type ReportTargetType = 'user' | 'store' | 'product';
export type ReportStatus = 'pending' | 'resolved' | 'ignored';

export interface UserReport {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: ReportTargetType;
  reason: string;
  details?: string;
  status: ReportStatus;
  createdAt: string;
}
