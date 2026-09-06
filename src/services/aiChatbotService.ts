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
   * Generates a context-aware AI response using OpenRouter API or rule engine fallback
   */
  static async generateResponse(
    userQuery: string,
    history: ChatMessage[],
    userId?: string
  ): Promise<string> {
    const context = await this.getLiveContext(userId);
    const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY || localStorage.getItem('OPENROUTER_API_KEY');

    // If OpenRouter API Key is configured, execute live LLM completion
    if (openRouterApiKey) {
      try {
        const systemPrompt = `You are the official Customer Support AI Assistant for ${context.storeName}.
You are helpful, polite, professional, and concise.

AUTHORITATIVE REAL-TIME DATABASE CONTEXT:
Store Name: ${context.storeName}
Contact Email: ${context.contactEmail}
Contact Phone: ${context.contactPhone}
Currency: ${context.currency}

IN-STOCK PRODUCTS & LIVE PRICING:
${context.inStockProducts.map(p => `- ${p.name} (${p.category}): ${context.currency} ${p.price.toLocaleString()} (${p.stock} units available) — ${p.description}`).join('\n')}

RECENT USER ORDERS:
${context.userRecentOrders.length > 0 ? context.userRecentOrders.map(o => `- Order ${o.orderNumber}: ${context.currency} ${o.totalAmount.toLocaleString()} [Status: ${o.status.toUpperCase()}]`).join('\n') : 'No recent orders for this user.'}

INSTRUCTIONS:
1. Answer customer queries accurately based ONLY on the live context above.
2. If asked about product stock or pricing, give exact KES figures from the context.
3. If asked about order status, summarize their recent orders.
4. Keep responses friendly, clean, and nicely formatted in Markdown.`;

        const messagesPayload = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: userQuery }
        ];

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterApiKey}`,
            'HTTP-Referer': 'https://pro2036.xyz',
            'X-Title': 'HDP Business Suite Chatbot'
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.3-70b-instruct:free',
            messages: messagesPayload,
            temperature: 0.7,
            max_tokens: 500
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiText = data.choices?.[0]?.message?.content;
          if (aiText) return aiText;
        } else {
          console.warn('OpenRouter API returned non-200 status:', response.status);
        }
      } catch (err) {
        console.error('OpenRouter Completion Error:', err);
      }
    }

    // Fallback Rule Engine if no API key or API call fails
    const queryLower = userQuery.toLowerCase();

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

    if (queryLower.includes('contact') || queryLower.includes('phone') || queryLower.includes('email') || queryLower.includes('hours') || queryLower.includes('location')) {
      return `Here is our store contact information:\n\n• **Store**: ${context.storeName}\n• **Phone**: ${context.contactPhone}\n• **Email**: ${context.contactEmail}\n• **Currency**: ${context.currency}\n\nFeel free to call or email us directly for bulk corporate orders!`;
    }

    const sampleProducts = context.inStockProducts.slice(0, 3).map(p => p.name).join(', ');
    return `Welcome to **${context.storeName}** AI Customer Support! 👋\n\nI am connected directly to our live inventory system. I can help you with:\n\n1. **Live Stock & Pricing**: We have items like *${sampleProducts || 'Office Furniture & Supplies'}* in stock.\n2. **Order Tracking**: Check status on your pending orders.\n3. **Store Policies & Support**: Contact details and assistance.\n\nHow can I help you today?`;
  }
}
