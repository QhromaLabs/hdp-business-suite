-- Add missing payment methods to enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'till';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'mpesa';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'nat';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'equity';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'coop';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'kcb_kt';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'capital';
