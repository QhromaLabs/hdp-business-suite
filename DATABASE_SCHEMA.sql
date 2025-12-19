-- =============================================
-- COMPLETE DATABASE SCHEMA FOR EXTERNAL SUPABASE
-- =============================================
-- Run this SQL in the Supabase SQL Editor to set up the complete database

-- =============================================
-- 1. ENUMS
-- =============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'clerk', 'sales_rep');
CREATE TYPE public.customer_type AS ENUM ('normal', 'consignment', 'credit');
CREATE TYPE public.order_status AS ENUM ('pending', 'approved', 'dispatched', 'delivered', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'bank_transfer', 'mobile_money', 'credit');
CREATE TYPE public.production_status AS ENUM ('in_progress', 'completed', 'cancelled');
CREATE TYPE public.audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- =============================================
-- 2. SEQUENCES
-- =============================================

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS batch_number_seq START 1;

-- =============================================
-- 3. TABLES
-- =============================================

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    device_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'clerk',
    assigned_by UUID,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Product categories
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.product_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.product_categories(id),
    base_price NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product variants
CREATE TABLE public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT NOT NULL UNIQUE,
    variant_name TEXT NOT NULL,
    barcode TEXT,
    size TEXT,
    color TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    warehouse_location TEXT,
    last_stock_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory transactions
CREATE TABLE public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES public.product_variants(id),
    transaction_type TEXT NOT NULL,
    quantity_change INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    customer_type customer_type NOT NULL DEFAULT 'normal',
    credit_limit NUMERIC DEFAULT 0,
    credit_balance NUMERIC DEFAULT 0,
    settlement_day TEXT,
    parent_customer_id UUID REFERENCES public.customers(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales orders
CREATE TABLE public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id),
    status order_status DEFAULT 'pending',
    subtotal NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    payment_method payment_method,
    is_credit_sale BOOLEAN DEFAULT FALSE,
    delivery_address TEXT,
    delivery_format TEXT DEFAULT 'POS',
    notes TEXT,
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    dispatched_by UUID,
    dispatched_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales order items
CREATE TABLE public.sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    discount NUMERIC DEFAULT 0,
    total_price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.sales_orders(id),
    customer_id UUID REFERENCES public.customers(id),
    amount NUMERIC NOT NULL,
    payment_method payment_method NOT NULL,
    reference_number TEXT,
    notes TEXT,
    received_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consignment returns
CREATE TABLE public.consignment_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    variant_id UUID NOT NULL REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    processed_by UUID,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    employee_number TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department TEXT,
    position TEXT,
    basic_salary NUMERIC DEFAULT 0,
    hire_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    date DATE NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'present',
    biometric_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payroll
CREATE TABLE public.payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    basic_salary NUMERIC NOT NULL,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    net_salary NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank accounts
CREATE TABLE public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    current_balance NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank transactions
CREATE TABLE public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
    transaction_type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    reference_number TEXT,
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciled_by UUID,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    expense_date DATE NOT NULL,
    payment_method payment_method,
    reference_number TEXT,
    is_manufacturing_cost BOOLEAN DEFAULT FALSE,
    approved_by UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creditors
CREATE TABLE public.creditors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    outstanding_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creditor transactions
CREATE TABLE public.creditor_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creditor_id UUID NOT NULL REFERENCES public.creditors(id),
    transaction_type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Raw materials
CREATE TABLE public.raw_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL,
    unit_cost NUMERIC DEFAULT 0,
    quantity_in_stock NUMERIC DEFAULT 0,
    reorder_level NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Machines
CREATE TABLE public.machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'operational',
    purchase_date DATE,
    purchase_cost NUMERIC DEFAULT 0,
    current_value NUMERIC DEFAULT 0,
    depreciation_rate NUMERIC DEFAULT 10.00,
    last_maintenance DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production runs
CREATE TABLE public.production_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number TEXT NOT NULL UNIQUE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    machine_id UUID REFERENCES public.machines(id),
    planned_quantity INTEGER NOT NULL,
    actual_quantity INTEGER DEFAULT 0,
    wastage_quantity INTEGER DEFAULT 0,
    status production_status DEFAULT 'in_progress',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    production_cost NUMERIC DEFAULT 0,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production materials
CREATE TABLE public.production_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_run_id UUID NOT NULL REFERENCES public.production_runs(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id),
    quantity_used NUMERIC NOT NULL,
    unit_cost NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales targets
CREATE TABLE public.sales_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    target_month DATE NOT NULL,
    target_amount NUMERIC NOT NULL,
    achieved_amount NUMERIC DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales feedback
CREATE TABLE public.sales_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_rep_id UUID NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    feedback_type TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock audits
CREATE TABLE public.stock_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES public.product_variants(id),
    system_quantity INTEGER NOT NULL,
    actual_quantity INTEGER NOT NULL,
    difference INTEGER NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    audited_by UUID,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action audit_action NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. FUNCTIONS
-- =============================================

-- Generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$$;

-- Generate batch number
CREATE OR REPLACE FUNCTION public.generate_batch_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    NEW.batch_number := 'BATCH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('batch_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$;

-- Check if user has specific role (SECURITY DEFINER to prevent RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role IN ('admin', 'manager')
    )
$$;

-- Handle new user signup (creates profile and assigns default role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =============================================
-- 5. TRIGGERS
-- =============================================

-- Auto-generate order numbers
CREATE TRIGGER generate_order_number_trigger
    BEFORE INSERT ON public.sales_orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
    EXECUTE FUNCTION public.generate_order_number();

-- Auto-generate batch numbers
CREATE TRIGGER generate_batch_number_trigger
    BEFORE INSERT ON public.production_runs
    FOR EACH ROW
    WHEN (NEW.batch_number IS NULL OR NEW.batch_number = '')
    EXECUTE FUNCTION public.generate_batch_number();

-- Handle new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_creditors_updated_at BEFORE UPDATE ON public.creditors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_raw_materials_updated_at BEFORE UPDATE ON public.raw_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_production_runs_updated_at BEFORE UPDATE ON public.production_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignment_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creditors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creditor_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. RLS POLICIES
-- =============================================

-- Profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Product categories
CREATE POLICY "Authenticated can view categories" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage categories" ON public.product_categories FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Products
CREATE POLICY "Authenticated can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage products" ON public.products FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Product variants
CREATE POLICY "Authenticated can view variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage variants" ON public.product_variants FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Inventory
CREATE POLICY "Authenticated can view inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage inventory" ON public.inventory FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Inventory transactions
CREATE POLICY "Authenticated can view inventory transactions" ON public.inventory_transactions FOR SELECT USING (true);
CREATE POLICY "Authenticated can create inventory transactions" ON public.inventory_transactions FOR INSERT WITH CHECK (true);

-- Customers
CREATE POLICY "Authenticated can view customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage customers" ON public.customers FOR ALL USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "Sales can create customers" ON public.customers FOR INSERT WITH CHECK (has_role(auth.uid(), 'sales_rep'));

-- Sales orders
CREATE POLICY "Authenticated can view orders" ON public.sales_orders FOR SELECT USING (true);
CREATE POLICY "Authenticated can create orders" ON public.sales_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin/Manager can manage orders" ON public.sales_orders FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "Clerk can update dispatch" ON public.sales_orders FOR UPDATE USING (has_role(auth.uid(), 'clerk'));

-- Sales order items
CREATE POLICY "Authenticated can view order items" ON public.sales_order_items FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage order items" ON public.sales_order_items FOR ALL USING (true);

-- Payments
CREATE POLICY "Authenticated can view payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Authenticated can create payments" ON public.payments FOR INSERT WITH CHECK (true);

-- Consignment returns
CREATE POLICY "Authenticated can view consignment returns" ON public.consignment_returns FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage consignment returns" ON public.consignment_returns FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Employees
CREATE POLICY "Users can view own employee record" ON public.employees FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Managers can view employees" ON public.employees FOR SELECT USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin can manage employees" ON public.employees FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Attendance
CREATE POLICY "Authenticated can view attendance" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage attendance" ON public.attendance FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Payroll
CREATE POLICY "Users can view own payroll" ON public.payroll FOR SELECT USING (
    EXISTS (SELECT 1 FROM employees WHERE employees.id = payroll.employee_id AND employees.user_id = auth.uid())
);
CREATE POLICY "Admin can manage payroll" ON public.payroll FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Bank accounts
CREATE POLICY "Authenticated can view bank accounts" ON public.bank_accounts FOR SELECT USING (true);
CREATE POLICY "Admin can manage bank accounts" ON public.bank_accounts FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Bank transactions
CREATE POLICY "Authenticated can view bank transactions" ON public.bank_transactions FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage bank transactions" ON public.bank_transactions FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Expenses
CREATE POLICY "Authenticated can view expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage expenses" ON public.expenses FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Creditors
CREATE POLICY "Authenticated can view creditors" ON public.creditors FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage creditors" ON public.creditors FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Creditor transactions
CREATE POLICY "Authenticated can view creditor transactions" ON public.creditor_transactions FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage creditor transactions" ON public.creditor_transactions FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Raw materials
CREATE POLICY "Authenticated can view raw materials" ON public.raw_materials FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage raw materials" ON public.raw_materials FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Machines
CREATE POLICY "Authenticated can view machines" ON public.machines FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage machines" ON public.machines FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Production runs
CREATE POLICY "Authenticated can view production runs" ON public.production_runs FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage production runs" ON public.production_runs FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Production materials
CREATE POLICY "Authenticated can view production materials" ON public.production_materials FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage production materials" ON public.production_materials FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Sales targets
CREATE POLICY "Authenticated can view sales targets" ON public.sales_targets FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage sales targets" ON public.sales_targets FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Sales feedback
CREATE POLICY "Authenticated can view sales feedback" ON public.sales_feedback FOR SELECT USING (true);
CREATE POLICY "Sales can create feedback" ON public.sales_feedback FOR INSERT WITH CHECK (has_role(auth.uid(), 'sales_rep'));
CREATE POLICY "Admin/Manager can manage feedback" ON public.sales_feedback FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Stock audits
CREATE POLICY "Authenticated can view stock audits" ON public.stock_audits FOR SELECT USING (true);
CREATE POLICY "Manager can create stock audits" ON public.stock_audits FOR INSERT WITH CHECK (has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin can manage stock audits" ON public.stock_audits FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Audit logs
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin can view all audit logs" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- =============================================
-- 8. CONFIGURATION NOTES
-- =============================================

/*
After running this schema, configure the following in Supabase Dashboard:

1. AUTHENTICATION SETTINGS (Auth > Settings):
   - Enable Email provider
   - Disable "Confirm email" for development (enable for production)
   - Set Site URL to your app URL
   - Add redirect URLs for your app

2. ENVIRONMENT VARIABLES (for your app):
   - VITE_SUPABASE_URL=https://your-project.supabase.co
   - VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

3. FIRST ADMIN USER:
   After creating your first user, manually update their role:
   
   UPDATE public.user_roles 
   SET role = 'admin' 
   WHERE user_id = 'your-user-uuid';

4. STORAGE (if needed):
   Create buckets in Storage section for file uploads
*/
