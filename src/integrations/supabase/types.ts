export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          biometric_id: string | null
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string
          id: string
          notes: string | null
          status: string | null
        }
        Insert: {
          biometric_id?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          employee_id: string
          id?: string
          notes?: string | null
          status?: string | null
        }
        Update: {
          biometric_id?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      creditor_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          creditor_id: string
          id: string
          notes: string | null
          reference_number: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          creditor_id: string
          id?: string
          notes?: string | null
          reference_number?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          creditor_id?: string
          id?: string
          notes?: string | null
          reference_number?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "creditor_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creditor_transactions_creditor_id_fkey"
            columns: ["creditor_id"]
            isOneToOne: false
            referencedRelation: "creditors"
            referencedColumns: ["id"]
          },
        ]
      }
      creditors: {
        Row: {
          balance: number | null
          company_name: string | null
          contact_person: string
          created_at: string
          email: string | null
          id: string
          notes: string | null
          phone: string
          status: string | null
          updated_at: string
        }
        Insert: {
          balance?: number | null
          company_name?: string | null
          contact_person: string
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number | null
          company_name?: string | null
          contact_person?: string
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_routes: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          route_day: string
          route_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          route_day: string
          route_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          route_day?: string
          route_order?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_routes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          address_name: string | null
          city: string | null
          created_at: string | null
          credit_balance: number | null
          customer_type: Database["public"]["Enums"]["customer_type"]
          email: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
          kra_pin: string | null
        }
        Insert: {
          address?: string | null
          address_name?: string | null
          city?: string | null
          created_at?: string | null
          credit_balance?: number | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
          kra_pin?: string | null
        }
        Update: {
          address?: string | null
          address_name?: string | null
          city?: string | null
          created_at?: string | null
          credit_balance?: number | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
          kra_pin?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          department: string
          email: string
          first_name: string
          hire_date: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          position: string
          salary: number
          status: string | null
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          created_at?: string
          department: string
          email: string
          first_name: string
          hire_date?: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          position: string
          salary: number
          status?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          created_at?: string
          department?: string
          email?: string
          first_name?: string
          hire_date?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          position?: string
          salary?: number
          status?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          description: string
          id: string
          payment_method: string
          receipt_url: string | null
          user_id: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date?: string
          description: string
          id?: string
          payment_method: string
          receipt_url?: string | null
          user_id?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          payment_method?: string
          receipt_url?: string | null
          user_id?: string | null
          vendor?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          quantity: number
          status: string
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          quantity?: number
          status?: string
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          quantity?: number
          status?: string
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          new_quantity: number
          notes: string | null
          previous_quantity: number
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_quantity: number
          notes?: string | null
          previous_quantity: number
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          acquisition_cost: number | null
          acquisition_date: string | null
          created_at: string | null
          id: string
          last_maintenance_date: string | null
          location: string | null
          model_number: string | null
          name: string
          next_maintenance_date: string | null
          notes: string | null
          serial_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          created_at?: string | null
          id?: string
          last_maintenance_date?: string | null
          location?: string | null
          model_number?: string | null
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          created_at?: string | null
          id?: string
          last_maintenance_date?: string | null
          location?: string | null
          model_number?: string | null
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_tone"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type?: Database["public"]["Enums"]["notification_tone"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_tone"]
          user_id?: string | null
        }
        Relationships: []
      }
      order_item_production: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          order_item_id: string | null
          quantity_produced: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["production_status"] | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_item_id?: string | null
          quantity_produced?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["production_status"] | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_item_id?: string | null
          quantity_produced?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["production_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_production_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_production_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          id: string
          order_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: string
          updated_at: string | null
          receipt_url: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          order_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status?: string
          updated_at?: string | null
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          order_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: string
          updated_at?: string | null
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_return_items: {
        Row: {
          condition: string
          created_at: string | null
          id: string
          quantity: number
          return_id: string | null
          unit_refund_amount: number | null
          variant_id: string | null
        }
        Insert: {
          condition: string
          created_at?: string | null
          id?: string
          quantity: number
          return_id?: string | null
          unit_refund_amount?: number | null
          variant_id?: string | null
        }
        Update: {
          condition?: string
          created_at?: string | null
          id?: string
          quantity?: number
          return_id?: string | null
          unit_refund_amount?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "product_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_return_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_returns: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          id: string
          notes: string | null
          reason: string
          refund_amount: number
          refund_method: Database["public"]["Enums"]["payment_method"] | null
          return_number: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          reason: string
          refund_amount: number
          refund_method?: Database["public"]["Enums"]["payment_method"] | null
          return_number?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          reason?: string
          refund_amount?: number
          refund_method?: Database["public"]["Enums"]["payment_method"] | null
          return_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_returns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json | null
          barcode: string | null
          cost_price: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          price: number
          product_id: string | null
          reorder_point: number | null
          sku: string
          updated_at: string | null
          variant_name: string
        }
        Insert: {
          attributes?: Json | null
          barcode?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          price: number
          product_id?: string | null
          reorder_point?: number | null
          sku: string
          updated_at?: string | null
          variant_name: string
        }
        Update: {
          attributes?: Json | null
          barcode?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          price?: number
          product_id?: string | null
          reorder_point?: number | null
          sku?: string
          updated_at?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string | null
          production_needed: boolean | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string | null
          production_needed?: boolean | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string | null
          production_needed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sales_order_items: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          id: string
          order_id: string | null
          quantity: number
          total_price: number | null
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          order_id?: string | null
          quantity: number
          total_price?: number | null
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          order_id?: string | null
          quantity?: number
          total_price?: number | null
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          address_name: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          delivery_agent_id: string | null
          discount_amount: number | null
          id: string
          is_credit_sale: boolean | null
          latitude: number | null
          longitude: number | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          address_name?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_agent_id?: string | null
          discount_amount?: number | null
          id?: string
          is_credit_sale?: boolean | null
          latitude?: number | null
          longitude?: number | null
          order_number?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          address_name?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_agent_id?: string | null
          discount_amount?: number | null
          id?: string
          is_credit_sale?: boolean | null
          latitude?: number | null
          longitude?: number | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_delivery_agent_id_fkey"
            columns: ["delivery_agent_id"]
            isOneToOne: false
            referencedRelation: "users" // Mapped from profiles? Note: usually users table is auth.users but referenced usually means profiles if in public. Let's assume profiles alias or similar. 
            // Wait, generated types usually reference public tables.
            // If delivery_agent_id references auth.users directly, it won't show clearly here unless mapped.
            // But let's check `employees` or `profiles`.
            // In the generated output above, it seems to not have a relationship listed or I missed it due to truncation?
            // "delivery_agent_id" usually points to profiles.
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          battery_level: number | null
          created_at: string | null
          heading: number | null
          id: string
          is_online: boolean | null
          last_active: string | null
          latitude: number
          longitude: number
          speed: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          battery_level?: number | null
          created_at?: string | null
          heading?: number | null
          id?: string
          is_online?: boolean | null
          last_active?: string | null
          latitude: number
          longitude: number
          speed?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          battery_level?: number | null
          created_at?: string | null
          heading?: number | null
          id?: string
          is_online?: boolean | null
          last_active?: string | null
          latitude?: number
          longitude?: number
          speed?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_new_user: {
        Args: {
          email: string
          password: string
          full_name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      get_monthly_metrics: {
        Args: {
          start_date: string
          end_date: string
        }
        Returns: {
          month: string
          revenue: number
          expenses: number
          profit: number
        }[]
      }
      get_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_revenue: number
          total_orders: number
          low_stock_count: number
          pending_orders: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "clerk" | "sales_rep" | "delivery_agent"
      audit_action: "INSERT" | "UPDATE" | "DELETE"
      customer_type: "normal" | "consignment" | "credit"
      notification_tone: "primary" | "success" | "warning" | "destructive" | "info"
      order_status:
      | "pending"
      | "approved"
      | "dispatched"
      | "delivered"
      | "cancelled"
      | "in_transit"
      payment_method:
      | "cash"
      | "bank_transfer"
      | "mobile_money"
      | "credit"
      | "till"
      | "mpesa"
      | "nat"
      | "equity"
      | "coop"
      | "kcb_kt"
      | "capital"
      production_status: "in_progress" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
