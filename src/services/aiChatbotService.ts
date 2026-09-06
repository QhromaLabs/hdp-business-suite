import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface LiveBusinessContext {
  storeName: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  inStockProducts: Array<{
    name: string;
    category?: string;
    price: number;
    stock: number;
    description?: string;
  }>;
  userRecentOrders: Array<{
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: string;
  }>;
}

export class AiChatbotService {
  /**
   * Fetches live context dynamically from the database
   */
  static async getLiveContext(userId?: string): Promise<LiveBusinessContext> {
    try {
      // 1. Fetch In-Stock Products
      const { data: productsData } = await supabase
        .from('products')
        .select('name, price, stock_quantity, description, product_categories(name)')
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false })
        .limit(25);

      const inStockProducts = (productsData || []).map((p: any) => ({
        name: p.name,
        category: p.product_categories?.name || 'General',
        price: p.price,
        stock: p.stock_quantity,
        description: p.description || ''
      }));

      // 2. Fetch Recent Orders if user is logged in
      let userRecentOrders: any[] = [];
      if (userId) {
        const { data: ordersData } = await supabase
          .from('sales_orders')
          .select('order_number, status, total_amount, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        userRecentOrders = (ordersData || []).map((o: any) => ({
          orderNumber: o.order_number,
          status: o.status,
          totalAmount: o.total_amount,
          createdAt: o.created_at
        }));
      }

      // 3. Fetch Store Info
      const { data: storeData } = await supabase
        .from('store_settings')
        .select('*')
        .limit(1)
        .single();

      return {
        storeName: storeData?.store_name || 'HDP Business Suite',
        contactEmail: storeData?.contact_email || 'support@pro2036.xyz',
        contactPhone: storeData?.contact_phone || '+254 700 000 000',
        currency: storeData?.currency || 'KES',
        inStockProducts,
        userRecentOrders
      };
    } catch (err) {
      console.error('Error compiling live chatbot context:', err);
      return {
        storeName: 'HDP Business Suite',
        contactEmail: 'support@pro2036.xyz',
        contactPhone: '+254 700 000 000',
        currency: 'KES',
        inStockProducts: [],
        userRecentOrders: []
      };
    }
  }

  /**
   * Generates a context-aware AI response based on real-time database state
   */
  static async generateResponse(
    userQuery: string,
    history: ChatMessage[],
    userId?: string
  ): Promise<string> {
    const context = await this.getLiveContext(userId);
    const queryLower = userQuery.toLowerCase();

    // 1. Order Tracking Queries
    if (queryLower.includes('order') || queryLower.includes('track') || queryLower.includes('status')) {
      if (context.userRecentOrders.length > 0) {
        const latest = context.userRecentOrders[0];
        const ordersList = context.userRecentOrders
          .map(o => `• **${o.orderNumber}**: ${context.currency} ${o.totalAmount.toLocaleString()} — Status: **${o.status.toUpperCase()}**`)
          .join('\n');

        return `Here are your most recent orders:\n\n${ordersList}\n\nYour latest order **${latest.orderNumber}** is currently **${latest.status.toUpperCase()}**.`;
      } else {
        return `I checked your account! You don't have any recent orders logged in the system. Would you like help placing a new order?`;
      }
    }

    // 2. Stock / Product / Pricing Queries
    if (
      queryLower.includes('stock') ||
      queryLower.includes('product') ||
      queryLower.includes('chair') ||
      queryLower.includes('price') ||
      queryLower.includes('available') ||
      queryLower.includes('inventory')
    ) {
      const matchingProducts = context.inStockProducts.filter(p =>
        queryLower.split(' ').some(word => word.length > 3 && p.name.toLowerCase().includes(word))
      );

      const displayList = matchingProducts.length > 0 ? matchingProducts : context.inStockProducts.slice(0, 5);

      if (displayList.length > 0) {
        const items = displayList
          .map(p => `• **${p.name}** — ${context.currency} ${p.price.toLocaleString()} (${p.stock} units available)`)
          .join('\n');

        return `Here are our current in-stock products:\n\n${items}\n\nAll items are ready for dispatch!`;
      }
    }

    // 3. Contact & Store Info Queries
    if (queryLower.includes('contact') || queryLower.includes('phone') || queryLower.includes('email') || queryLower.includes('hours') || queryLower.includes('location')) {
      return `Here is our store contact information:\n\n• **Store**: ${context.storeName}\n• **Phone**: ${context.contactPhone}\n• **Email**: ${context.contactEmail}\n• **Currency**: ${context.currency}\n\nFeel free to call or email us directly for bulk corporate orders!`;
    }

    // 4. Default AI Assistant Response using live context
    const sampleProducts = context.inStockProducts.slice(0, 3).map(p => p.name).join(', ');
    return `Welcome to **${context.storeName}** AI Customer Support! 👋\n\nI am connected directly to our live inventory system. I can help you with:\n\n1. **Live Stock & Pricing**: We have items like *${sampleProducts || 'Office Furniture & Supplies'}* in stock.\n2. **Order Tracking**: Check status on your pending orders.\n3. **Store Policies & Support**: Contact details and assistance.\n\nHow can I help you today?`;
  }
}
