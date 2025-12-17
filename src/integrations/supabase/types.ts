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
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string | null
          current_balance: number | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_reconciled: boolean | null
          reconciled_at: string | null
          reconciled_by: string | null
          reference_number: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_reconciled?: boolean | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference_number?: string | null
          transaction_date: string
          transaction_type: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_reconciled?: boolean | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference_number?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_returns: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          processed_at: string | null
          processed_by: string | null
          quantity: number
          reason: string | null
          status: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          quantity: number
          reason?: string | null
          status?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          quantity?: number
          reason?: string | null
          status?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignment_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_returns_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      creditor_transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          creditor_id: string
          id: string
          notes: string | null
          reference_number: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          creditor_id: string
          id?: string
          notes?: string | null
          reference_number?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          creditor_id?: string
          id?: string
          notes?: string | null
          reference_number?: string | null
          transaction_type?: string
        }
        Relationships: [
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
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          outstanding_balance: number | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          outstanding_balance?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          outstanding_balance?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string | null
          credit_balance: number | null
          credit_limit: number | null
          customer_type: Database["public"]["Enums"]["customer_type"]
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_customer_id: string | null
          phone: string | null
          settlement_day: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_balance?: number | null
          credit_limit?: number | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_customer_id?: string | null
          phone?: string | null
          settlement_day?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_balance?: number | null
          credit_limit?: number | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_customer_id?: string | null
          phone?: string | null
          settlement_day?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          basic_salary: number | null
          created_at: string | null
          department: string | null
          email: string | null
          employee_number: string
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          position: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          basic_salary?: number | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_number: string
          full_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          basic_salary?: number | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_number?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string
          created_at: string | null
          created_by: string | null
          description: string
          expense_date: string
          id: string
          is_manufacturing_cost: boolean | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          description: string
          expense_date: string
          id?: string
          is_manufacturing_cost?: boolean | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          is_manufacturing_cost?: boolean | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          reference_number?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string | null
          id: string
          last_stock_date: string | null
          quantity: number
          reserved_quantity: number | null
          updated_at: string | null
          variant_id: string
          warehouse_location: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_stock_date?: string | null
          quantity?: number
          reserved_quantity?: number | null
          updated_at?: string | null
          variant_id: string
          warehouse_location?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_stock_date?: string | null
          quantity?: number
          reserved_quantity?: number | null
          updated_at?: string | null
          variant_id?: string
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: true
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
          variant_id: string
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
          variant_id: string
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
          variant_id?: string
        }
        Relationships: [
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
          created_at: string | null
          current_value: number | null
          depreciation_rate: number | null
          description: string | null
          id: string
          last_maintenance: string | null
          name: string
          purchase_cost: number | null
          purchase_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          depreciation_rate?: number | null
          description?: string | null
          id?: string
          last_maintenance?: string | null
          name: string
          purchase_cost?: number | null
          purchase_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          depreciation_rate?: number | null
          description?: string | null
          id?: string
          last_maintenance?: string | null
          name?: string
          purchase_cost?: number | null
          purchase_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          id: string
          notes: string | null
          order_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_by: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_by?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          received_by?: string | null
          reference_number?: string | null
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
      payroll: {
        Row: {
          allowances: number | null
          basic_salary: number
          created_at: string | null
          created_by: string | null
          deductions: number | null
          employee_id: string
          id: string
          net_salary: number
          paid_at: string | null
          pay_period_end: string
          pay_period_start: string
          status: string | null
        }
        Insert: {
          allowances?: number | null
          basic_salary: number
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          employee_id: string
          id?: string
          net_salary: number
          paid_at?: string | null
          pay_period_end: string
          pay_period_start: string
          status?: string | null
        }
        Update: {
          allowances?: number | null
          basic_salary?: number
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          employee_id?: string
          id?: string
          net_salary?: number
          paid_at?: string | null
          pay_period_end?: string
          pay_period_start?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          color: string | null
          cost_price: number
          created_at: string | null
          id: string
          is_active: boolean | null
          price: number
          product_id: string
          reorder_level: number | null
          size: string | null
          sku: string
          updated_at: string | null
          variant_name: string
        }
        Insert: {
          barcode?: string | null
          color?: string | null
          cost_price?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          price?: number
          product_id: string
          reorder_level?: number | null
          size?: string | null
          sku: string
          updated_at?: string | null
          variant_name: string
        }
        Update: {
          barcode?: string | null
          color?: string | null
          cost_price?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          price?: number
          product_id?: string
          reorder_level?: number | null
          size?: string | null
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
      production_materials: {
        Row: {
          created_at: string | null
          id: string
          production_run_id: string
          quantity_used: number
          raw_material_id: string
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          production_run_id: string
          quantity_used: number
          raw_material_id: string
          unit_cost: number
        }
        Update: {
          created_at?: string | null
          id?: string
          production_run_id?: string
          quantity_used?: number
          raw_material_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_materials_production_run_id_fkey"
            columns: ["production_run_id"]
            isOneToOne: false
            referencedRelation: "production_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_materials_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      production_runs: {
        Row: {
          actual_quantity: number | null
          batch_number: string
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          machine_id: string | null
          notes: string | null
          planned_quantity: number
          product_id: string
          production_cost: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["production_status"] | null
          updated_at: string | null
          variant_id: string | null
          wastage_quantity: number | null
        }
        Insert: {
          actual_quantity?: number | null
          batch_number: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          machine_id?: string | null
          notes?: string | null
          planned_quantity: number
          product_id: string
          production_cost?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["production_status"] | null
          updated_at?: string | null
          variant_id?: string | null
          wastage_quantity?: number | null
        }
        Update: {
          actual_quantity?: number | null
          batch_number?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          machine_id?: string | null
          notes?: string | null
          planned_quantity?: number
          product_id?: string
          production_cost?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["production_status"] | null
          updated_at?: string | null
          variant_id?: string | null
          wastage_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "production_runs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_runs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_runs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          category_id: string | null
          cost_price: number
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
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
          avatar_url: string | null
          created_at: string | null
          device_id: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          device_id?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          device_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      raw_materials: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          quantity_in_stock: number | null
          reorder_level: number | null
          unit: string
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          quantity_in_stock?: number | null
          reorder_level?: number | null
          unit: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          quantity_in_stock?: number | null
          reorder_level?: number | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sales_feedback: {
        Row: {
          content: string
          created_at: string | null
          customer_id: string | null
          feedback_type: string
          follow_up_date: string | null
          id: string
          sales_rep_id: string
          status: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          customer_id?: string | null
          feedback_type: string
          follow_up_date?: string | null
          id?: string
          sales_rep_id: string
          status?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          customer_id?: string | null
          feedback_type?: string
          follow_up_date?: string | null
          id?: string
          sales_rep_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          created_at: string | null
          discount: number | null
          id: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
          variant_id: string
        }
        Insert: {
          created_at?: string | null
          discount?: number | null
          id?: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
          variant_id: string
        }
        Update: {
          created_at?: string | null
          discount?: number | null
          id?: string
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          variant_id?: string
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
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          delivery_address: string | null
          delivery_format: string | null
          discount_amount: number | null
          dispatched_at: string | null
          dispatched_by: string | null
          id: string
          is_credit_sale: boolean | null
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          delivery_format?: string | null
          discount_amount?: number | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          id?: string
          is_credit_sale?: boolean | null
          notes?: string | null
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          delivery_format?: string | null
          discount_amount?: number | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          id?: string
          is_credit_sale?: boolean | null
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_targets: {
        Row: {
          achieved_amount: number | null
          created_at: string | null
          created_by: string | null
          id: string
          target_amount: number
          target_month: string
          user_id: string
        }
        Insert: {
          achieved_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_amount: number
          target_month: string
          user_id: string
        }
        Update: {
          achieved_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_amount?: number
          target_month?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_audits: {
        Row: {
          actual_quantity: number
          approved_at: string | null
          approved_by: string | null
          audited_by: string | null
          created_at: string | null
          difference: number
          id: string
          reason: string | null
          status: string | null
          system_quantity: number
          variant_id: string
        }
        Insert: {
          actual_quantity: number
          approved_at?: string | null
          approved_by?: string | null
          audited_by?: string | null
          created_at?: string | null
          difference: number
          id?: string
          reason?: string | null
          status?: string | null
          system_quantity: number
          variant_id: string
        }
        Update: {
          actual_quantity?: number
          approved_at?: string | null
          approved_by?: string | null
          audited_by?: string | null
          created_at?: string | null
          difference?: number
          id?: string
          reason?: string | null
          status?: string | null
          system_quantity?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_audits_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "clerk" | "sales_rep"
      audit_action:
        | "create"
        | "update"
        | "delete"
        | "approve"
        | "reject"
        | "login"
        | "logout"
      customer_type: "normal" | "consignment" | "marketplace"
      order_status:
        | "pending"
        | "approved"
        | "dispatched"
        | "delivered"
        | "cancelled"
      payment_method:
        | "cash"
        | "credit"
        | "till"
        | "nat"
        | "equity"
        | "coop"
        | "kcb_kt"
        | "capital"
      production_status: "in_progress" | "completed" | "paused" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "clerk", "sales_rep"],
      audit_action: [
        "create",
        "update",
        "delete",
        "approve",
        "reject",
        "login",
        "logout",
      ],
      customer_type: ["normal", "consignment", "marketplace"],
      order_status: [
        "pending",
        "approved",
        "dispatched",
        "delivered",
        "cancelled",
      ],
      payment_method: [
        "cash",
        "credit",
        "till",
        "nat",
        "equity",
        "coop",
        "kcb_kt",
        "capital",
      ],
      production_status: ["in_progress", "completed", "paused", "cancelled"],
    },
  },
} as const
