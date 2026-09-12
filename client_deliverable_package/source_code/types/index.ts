export type UserRole = 'admin' | 'manager' | 'clerk' | 'sales_rep' | 'delivery_agent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  deviceId: string;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  product_type?: 'finished_good' | 'semi_finished_good' | 'raw_material';
  variants?: ProductVariant[];
  image?: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  size?: string;
  color?: string;
  price: number;
  stock: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  type: 'normal' | 'consignment' | 'marketplace';
  creditLimit: number;
  creditBalance: number;
  parentCustomerId?: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export type PaymentMethod =
  | 'cash'
  | 'credit'
  | 'till'
  | 'mpesa'
  | 'nat'
  | 'equity'
  | 'coop'
  | 'kcb_kt'
  | 'capital';

export interface Sale {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerId?: string;
  salesRepId: string;
  createdAt: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  pendingOrders: number;
  lowStockItems: number;
  totalCustomers: number;
  creditOutstanding: number;
}
