-- Double-entry accounting: Chart of Accounts
-- Foundation for the general ledger. Every journal line posts against one of these accounts.

CREATE TYPE public.account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
CREATE TYPE public.normal_balance_side AS ENUM ('debit', 'credit');

CREATE TABLE public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    account_type account_type NOT NULL,
    normal_balance normal_balance_side NOT NULL,
    parent_id UUID REFERENCES public.chart_of_accounts(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chart_of_accounts_type ON public.chart_of_accounts(account_type);

CREATE TRIGGER update_chart_of_accounts_updated_at
    BEFORE UPDATE ON public.chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view chart of accounts" ON public.chart_of_accounts FOR SELECT USING (true);
CREATE POLICY "Admin can manage chart of accounts" ON public.chart_of_accounts FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Seed accounts. Codes/mapping chosen to match existing operational tables
-- (payments.payment_method, expenses.category, machines, payroll, creditors).
INSERT INTO public.chart_of_accounts (code, name, account_type, normal_balance) VALUES
    ('1000', 'Assets', 'asset', 'debit'),
    ('1010', 'Cash on Hand', 'asset', 'debit'),
    ('1015', 'Bank Accounts', 'asset', 'debit'),
    ('1020', 'Accounts Receivable', 'asset', 'debit'),
    ('1030', 'Finished Goods Inventory', 'asset', 'debit'),
    ('1040', 'Raw Materials Inventory', 'asset', 'debit'),
    ('1045', 'Work In Progress (WIP)', 'asset', 'debit'),
    ('1050', 'Fixed Assets - Machinery & Equipment', 'asset', 'debit'),
    ('1055', 'Accumulated Depreciation', 'asset', 'credit'),
    ('2000', 'Liabilities', 'liability', 'credit'),
    ('2010', 'Accounts Payable', 'liability', 'credit'),
    ('2020', 'Wages Payable', 'liability', 'credit'),
    ('2025', 'Payroll Deductions Payable', 'liability', 'credit'),
    ('2030', 'Sales Tax Payable', 'liability', 'credit'),
    ('3000', 'Equity', 'equity', 'credit'),
    ('3010', 'Retained Earnings', 'equity', 'credit'),
    ('4000', 'Revenue', 'revenue', 'credit'),
    ('4010', 'Sales Revenue', 'revenue', 'credit'),
    ('5000', 'Cost of Goods Sold', 'expense', 'debit'),
    ('5010', 'Cost of Goods Sold', 'expense', 'debit'),
    ('5015', 'Manufacturing Overhead', 'expense', 'debit'),
    ('5020', 'Operating Expenses', 'expense', 'debit'),
    ('5030', 'Payroll Expense', 'expense', 'debit'),
    ('5040', 'Depreciation Expense', 'expense', 'debit')
ON CONFLICT (code) DO NOTHING;

-- Wire up parent hierarchy (Assets > Cash, AR, Inventory, Fixed Assets ...)
UPDATE public.chart_of_accounts child
SET parent_id = parent.id
FROM public.chart_of_accounts parent
WHERE parent.code = '1000' AND child.code IN ('1010','1015','1020','1030','1040','1045','1050','1055');

UPDATE public.chart_of_accounts child
SET parent_id = parent.id
FROM public.chart_of_accounts parent
WHERE parent.code = '2000' AND child.code IN ('2010','2020','2025','2030');

UPDATE public.chart_of_accounts child
SET parent_id = parent.id
FROM public.chart_of_accounts parent
WHERE parent.code = '3000' AND child.code IN ('3010');

UPDATE public.chart_of_accounts child
SET parent_id = parent.id
FROM public.chart_of_accounts parent
WHERE parent.code = '4000' AND child.code IN ('4010');

UPDATE public.chart_of_accounts child
SET parent_id = parent.id
FROM public.chart_of_accounts parent
WHERE parent.code = '5000' AND child.code IN ('5010','5015','5020','5030','5040');
