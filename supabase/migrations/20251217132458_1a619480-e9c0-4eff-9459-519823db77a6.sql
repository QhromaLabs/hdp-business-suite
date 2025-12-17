-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'clerk', 'sales_rep');

-- Create enum for customer types
CREATE TYPE public.customer_type AS ENUM ('normal', 'consignment', 'marketplace');

-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'approved', 'dispatched', 'delivered', 'cancelled');

-- Create enum for payment methods
CREATE TYPE public.payment_method AS ENUM ('cash', 'credit', 'till', 'nat', 'equity', 'coop', 'kcb_kt', 'capital');

-- Create enum for audit action types
CREATE TYPE public.audit_action AS ENUM ('create', 'update', 'delete', 'approve', 'reject', 'login', 'logout');

-- Create enum for production status
CREATE TYPE public.production_status AS ENUM ('in_progress', 'completed', 'paused', 'cancelled');

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  device_id TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================
-- USER ROLES TABLE (separate for security)
-- =====================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'clerk',
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================
-- SECURITY DEFINER FUNCTION FOR ROLE CHECKING
-- =====================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager')
  )
$$;

-- =====================
-- PRODUCT CATEGORIES
-- =====================
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.product_categories(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- =====================
-- PRODUCTS TABLE
-- =====================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.product_categories(id),
  base_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- =====================
-- PRODUCT VARIANTS (for size, color, etc.)
-- =====================
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE,
  variant_name TEXT NOT NULL,
  size TEXT,
  color TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- =====================
-- CUSTOMERS TABLE
-- =====================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_type customer_type NOT NULL DEFAULT 'normal',
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  credit_balance DECIMAL(12,2) DEFAULT 0,
  parent_customer_id UUID REFERENCES public.customers(id),
  settlement_day TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- =====================
-- INVENTORY TABLE
-- =====================
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  warehouse_location TEXT,
  last_stock_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(variant_id)
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- =====================
-- INVENTORY TRANSACTIONS (for audit trail)
-- =====================
CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID REFERENCES public.product_variants(id) NOT NULL,
  transaction_type TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- =====================
-- STOCK AUDITS
-- =====================
CREATE TABLE public.stock_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID REFERENCES public.product_variants(id) NOT NULL,
  system_quantity INTEGER NOT NULL,
  actual_quantity INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  audited_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stock_audits ENABLE ROW LEVEL SECURITY;

-- =====================
-- SALES ORDERS
-- =====================
CREATE TABLE public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  status order_status DEFAULT 'pending',
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  payment_method payment_method,
  is_credit_sale BOOLEAN DEFAULT false,
  notes TEXT,
  delivery_address TEXT,
  delivery_format TEXT DEFAULT 'POS',
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  dispatched_by UUID REFERENCES auth.users(id),
  dispatched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

-- =====================
-- SALES ORDER ITEMS
-- =====================
CREATE TABLE public.sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE NOT NULL,
  variant_id UUID REFERENCES public.product_variants(id) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

-- =====================
-- PAYMENTS
-- =====================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.sales_orders(id),
  customer_id UUID REFERENCES public.customers(id),
  amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL,
  reference_number TEXT,
  notes TEXT,
  received_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =====================
-- RAW MATERIALS
-- =====================
CREATE TABLE public.raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  unit_cost DECIMAL(12,2) DEFAULT 0,
  quantity_in_stock DECIMAL(12,2) DEFAULT 0,
  reorder_level DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

-- =====================
-- MACHINES
-- =====================
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  purchase_date DATE,
  purchase_cost DECIMAL(12,2) DEFAULT 0,
  current_value DECIMAL(12,2) DEFAULT 0,
  depreciation_rate DECIMAL(5,2) DEFAULT 10.00,
  status TEXT DEFAULT 'operational',
  last_maintenance DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- =====================
-- PRODUCTION RUNS
-- =====================
CREATE TABLE public.production_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT UNIQUE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  variant_id UUID REFERENCES public.product_variants(id),
  machine_id UUID REFERENCES public.machines(id),
  planned_quantity INTEGER NOT NULL,
  actual_quantity INTEGER DEFAULT 0,
  wastage_quantity INTEGER DEFAULT 0,
  status production_status DEFAULT 'in_progress',
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  production_cost DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.production_runs ENABLE ROW LEVEL SECURITY;

-- =====================
-- PRODUCTION MATERIALS (BOM)
-- =====================
CREATE TABLE public.production_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_run_id UUID REFERENCES public.production_runs(id) ON DELETE CASCADE NOT NULL,
  raw_material_id UUID REFERENCES public.raw_materials(id) NOT NULL,
  quantity_used DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.production_materials ENABLE ROW LEVEL SECURITY;

-- =====================
-- EMPLOYEES
-- =====================
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  employee_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  position TEXT,
  hire_date DATE,
  basic_salary DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- =====================
-- PAYROLL
-- =====================
CREATE TABLE public.payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL,
  allowances DECIMAL(12,2) DEFAULT 0,
  deductions DECIMAL(12,2) DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- =====================
-- ATTENDANCE
-- =====================
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) NOT NULL,
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present',
  biometric_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- =====================
-- EXPENSES
-- =====================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  payment_method payment_method,
  reference_number TEXT,
  is_manufacturing_cost BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- =====================
-- CREDITORS
-- =====================
CREATE TABLE public.creditors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  outstanding_balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.creditors ENABLE ROW LEVEL SECURITY;

-- =====================
-- CREDITOR TRANSACTIONS
-- =====================
CREATE TABLE public.creditor_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creditor_id UUID REFERENCES public.creditors(id) NOT NULL,
  transaction_type TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.creditor_transactions ENABLE ROW LEVEL SECURITY;

-- =====================
-- BANK ACCOUNTS
-- =====================
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  current_balance DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- =====================
-- BANK TRANSACTIONS
-- =====================
CREATE TABLE public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID REFERENCES public.bank_accounts(id) NOT NULL,
  transaction_type TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  reference_number TEXT,
  transaction_date DATE NOT NULL,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_by UUID REFERENCES auth.users(id),
  reconciled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- =====================
-- SALES TARGETS
-- =====================
CREATE TABLE public.sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  target_month DATE NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  achieved_amount DECIMAL(12,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_month)
);

ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- =====================
-- SALES FEEDBACK
-- =====================
CREATE TABLE public.sales_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id UUID REFERENCES auth.users(id) NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  feedback_type TEXT NOT NULL,
  content TEXT NOT NULL,
  follow_up_date DATE,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sales_feedback ENABLE ROW LEVEL SECURITY;

-- =====================
-- AUDIT LOGS
-- =====================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action audit_action NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================
-- CONSIGNMENT RETURNS
-- =====================
CREATE TABLE public.consignment_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  variant_id UUID REFERENCES public.product_variants(id) NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.consignment_returns ENABLE ROW LEVEL SECURITY;

-- =====================
-- RLS POLICIES
-- =====================

-- Profiles: Users can view all profiles, update own
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User Roles: Only admins can manage, users can view own
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Products & Variants: All authenticated can view, admin/manager can modify
CREATE POLICY "Authenticated can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage products" ON public.products FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view categories" ON public.product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage categories" ON public.product_categories FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view variants" ON public.product_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage variants" ON public.product_variants FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- Customers: All authenticated can view, admin/manager/sales can manage
CREATE POLICY "Authenticated can view customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage customers" ON public.customers FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Sales can create customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'sales_rep'));

-- Inventory: All can view, admin/manager can modify
CREATE POLICY "Authenticated can view inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage inventory" ON public.inventory FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view inventory transactions" ON public.inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create inventory transactions" ON public.inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- Stock Audits: Manager can create/edit, Admin approves
CREATE POLICY "Authenticated can view stock audits" ON public.stock_audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manager can create stock audits" ON public.stock_audits FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin can manage stock audits" ON public.stock_audits FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Sales Orders: All can view, appropriate roles can manage
CREATE POLICY "Authenticated can view orders" ON public.sales_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create orders" ON public.sales_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin/Manager can manage orders" ON public.sales_orders FOR UPDATE TO authenticated USING (public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Clerk can update dispatch" ON public.sales_orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'clerk'));

CREATE POLICY "Authenticated can view order items" ON public.sales_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage order items" ON public.sales_order_items FOR ALL TO authenticated USING (true);

-- Payments: All can view, all authenticated can create
CREATE POLICY "Authenticated can view payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);

-- Manufacturing: All can view, admin/manager can manage
CREATE POLICY "Authenticated can view raw materials" ON public.raw_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage raw materials" ON public.raw_materials FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view machines" ON public.machines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage machines" ON public.machines FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view production runs" ON public.production_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage production runs" ON public.production_runs FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view production materials" ON public.production_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage production materials" ON public.production_materials FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- HR: Admin can manage all, employees view own
CREATE POLICY "Admin can manage employees" ON public.employees FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own employee record" ON public.employees FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Managers can view employees" ON public.employees FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin can manage payroll" ON public.payroll FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own payroll" ON public.payroll FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.employees WHERE id = payroll.employee_id AND user_id = auth.uid())
);

CREATE POLICY "Authenticated can view attendance" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage attendance" ON public.attendance FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- Finance: Admin/Manager can manage
CREATE POLICY "Authenticated can view expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view creditors" ON public.creditors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage creditors" ON public.creditors FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view creditor transactions" ON public.creditor_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage creditor transactions" ON public.creditor_transactions FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view bank accounts" ON public.bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage bank accounts" ON public.bank_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view bank transactions" ON public.bank_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage bank transactions" ON public.bank_transactions FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- Sales Targets & Feedback
CREATE POLICY "Authenticated can view sales targets" ON public.sales_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage sales targets" ON public.sales_targets FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view sales feedback" ON public.sales_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sales can create feedback" ON public.sales_feedback FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'sales_rep'));
CREATE POLICY "Admin/Manager can manage feedback" ON public.sales_feedback FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- Audit Logs: Admin can view all, others view own
CREATE POLICY "Admin can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Consignment Returns
CREATE POLICY "Authenticated can view consignment returns" ON public.consignment_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage consignment returns" ON public.consignment_returns FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- =====================
-- TRIGGERS FOR UPDATED_AT
-- =====================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_raw_materials_updated_at BEFORE UPDATE ON public.raw_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_production_runs_updated_at BEFORE UPDATE ON public.production_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_creditors_updated_at BEFORE UPDATE ON public.creditors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- FUNCTION TO CREATE PROFILE ON SIGNUP
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Default role is clerk
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'clerk');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- FUNCTION TO GENERATE ORDER NUMBER
-- =====================
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.sales_orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION public.generate_order_number();

-- =====================
-- FUNCTION TO GENERATE BATCH NUMBER
-- =====================
CREATE OR REPLACE FUNCTION public.generate_batch_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.batch_number := 'BATCH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('batch_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS batch_number_seq START 1;

CREATE TRIGGER set_batch_number
  BEFORE INSERT ON public.production_runs
  FOR EACH ROW
  WHEN (NEW.batch_number IS NULL)
  EXECUTE FUNCTION public.generate_batch_number();