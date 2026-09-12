# HDP Business Suite — Accounting System

_Last updated: 2026-07-13_

## What this is

The suite now runs a **real double-entry general ledger (GL)** alongside the
operational tables. Every financial event — a delivered sale, a customer payment,
an expense, a supplier bill, a payroll run, monthly depreciation — automatically
posts a balanced **journal entry** (equal debits and credits) against a **chart of
accounts**. The Accounting page's reports are derived from these entries, not from
ad-hoc sums over unrelated tables.

## How it works

### Chart of accounts (`chart_of_accounts`)

| Code | Account | Type |
|------|---------|------|
| 1010 | Cash on Hand | Asset |
| 1015 | Bank Accounts (incl. M-Pesa) | Asset |
| 1020 | Accounts Receivable | Asset |
| 1030 | Finished Goods Inventory | Asset |
| 1040 | Raw Materials Inventory | Asset |
| 1050 | Fixed Assets — Machinery | Asset |
| 1055 | Accumulated Depreciation | Contra-asset |
| 2010 | Accounts Payable | Liability |
| 2020 | Wages Payable | Liability |
| 2030 | Sales Tax Payable | Liability |
| 3020 | Opening Balance Adjustments | Equity |
| 4010 | Sales Revenue | Revenue |
| 5010 | Cost of Goods Sold | Expense |
| 5015 | Manufacturing Overhead | Expense |
| 5020 | Operating Expenses | Expense |
| 5030 | Payroll Expense | Expense |
| 5040 | Depreciation Expense | Expense |
| 9000 | Suspense / Uncategorized | Liability |

### Automatic posting rules (database triggers)

| Event | Debit | Credit |
|-------|-------|--------|
| Order marked **delivered** | Cash/Bank/AR (by payment method) + COGS | Sales Revenue (+ Sales Tax) + Finished Goods |
| **Payment** received (credit sale or standalone) | Cash/Bank | Accounts Receivable |
| **Expense** recorded — paid (cash or no method given) | Expense account by category | Cash on Hand |
| **Expense** recorded — `payment_method = 'credit'` | Expense account by category | Accounts Payable |
| Supplier **bill** | Finished Goods Inventory | Accounts Payable |
| Supplier **payment** | Accounts Payable | Bank |
| Payroll marked **paid** | Payroll Expense (gross) | Wages Payable + Deductions Payable |
| **Run Monthly Depreciation** button | Depreciation Expense | Accumulated Depreciation |

COGS is computed from `sales_order_items.landed_cost_at_sale` — the FIFO cost that
was actually relieved from inventory batches at the moment of sale — **not** the
manually edited `product_variants.cost_price`.

### Edit/delete safety (sync triggers)

If a source record is **edited or deleted** (an expense amount changed, an order
deleted, a delivered order reverted, payroll un-paid), its journal entry is
automatically deleted and — for edits — reposted. The books cannot silently drift
from the operational data.

A deferred constraint trigger rejects any unbalanced entry at commit time, so no
code path can ever write a one-sided entry.

### Reports (all on the Accounting page)

- **Overview tab** — KPIs. *Recognized Revenue* counts **delivered + completed
  orders only** (revenue is earned at delivery); in-flight orders are shown as
  pipeline value, not income.
- **Balance Sheet tab** — Cash & Bank come from the GL books; receivables from
  customer balances; inventory from live FIFO batch values; equipment at net book
  value (purchase cost − accumulated depreciation).
- **General Ledger tab** — period income statement (follows the date-range picker),
  balance sheet per books, journal entry browser, and trial balance.

---

## Changelog — 2026-07-13 overhaul

**Database**
1. Applied the double-entry ledger (chart of accounts, journal engine, posting
   triggers, reporting views) and **backfilled 1,000+ journal entries** for all
   historical delivered/completed orders, payments, expenses, and supplier bills.
2. Fixed the sales COGS trigger to use FIFO landed cost instead of the stale
   variant cost price.
3. Fixed a constraint-trigger bug that made deleting any journal entry impossible.
4. Added the edit/delete **sync triggers** described above.
5. Made posting functions `SECURITY DEFINER` so non-admin staff (delivery agents,
   sales reps) don't get blocked by row-level security when their actions post
   journal entries.
6. **Expense mapping fixes**: expenses recorded without a payment method were
   being booked as *unpaid credit purchases*, silently inflating Accounts Payable
   by ~12M. They are now treated as paid in cash. Supplier bills now debit
   Finished Goods (sellable stock) instead of Raw Materials.
7. Posted a one-time, fully auditable **opening-balance true-up** (see FAQ).
8. Added `gl_income_statement(from, to)` / `gl_net_income(from, to)` functions for
   period reporting.

**Application**
9. Regenerated Supabase TypeScript types (the file had been corrupted to 2 lines).
10. **Balance Sheet tab bug**: the page read `assets.inventory/rawMaterials/equipment`
    but the hook returned different field names — inventory, raw materials, and
    equipment had been rendering as **KES 0** and were missing from total assets.
    Fixed, and the values now come from live FIFO batch data and net book values.
11. Revenue definition aligned to the ledger (delivered + completed only).
12. Payables no longer use `Math.abs()` — an overpaid supplier is not debt.
13. Payroll payouts were silently failing to log bank transactions (wrong column
    name `account_id` → `bank_account_id`). Fixed.
14. Stale cache keys fixed — recording/deleting an expense now refreshes the
    dashboards immediately.
15. General Ledger tab redesigned: period-aware income statement, journal entry
    browser with expandable debit/credit lines, standard-presentation trial
    balance.

---

## FAQ

### Why is the trial balance total so large?

Two reasons, both now addressed in presentation:

1. A trial balance that shows **lifetime gross flows** counts every shilling each
   time it moves. One 10,000 sale on credit later collected touches AR twice
   (debit at sale, credit at collection) — 20,000 of "activity" for 10,000 of
   business. Over 900+ orders and 1,500+ payments this compounds into hundreds of
   millions. The UI now shows the **standard presentation**: each account's *net*
   balance on its normal side, so the totals are meaningful (and the two columns
   must still be exactly equal — that equality is the entire point of the report).
2. The opening-balance true-up added large one-time amounts (seeding ~40M of
   inventory, reversing ~12M of overstated AP, etc.), which inflated gross totals
   further. Net presentation is unaffected by this.

### Why is the opening balance dated today (2026-07-13)?

Because that is the date the adjustment was actually made — backdating an
adjusting entry is what auditors flag, not the honest date. The entry is an
**opening-balance true-up**: the ledger was adopted mid-life, so its
balance-sheet *levels* (what you own/owe today) had to be seeded from the
operational tables (customer balances, creditor balances, live inventory batches,
machine registry). Crucially, it only touches **balance-sheet accounts and
equity** — it contains no revenue or expense lines — so it does not distort any
period's income statement. The offset sits in its own clearly-labeled equity
account (3020 Opening Balance Adjustments) where an accountant can review or
reclassify it.

### What still needs a human decision?

- **Cash/Bank levels**: the books say ~12.4M cash + ~32.5M bank, but historical
  outflows were incompletely recorded before the ledger existed, so these are
  likely overstated. When you know the real balances, post one adjusting entry
  against 3020 (same pattern as the true-up).
- **Period close**: net income is reported live; there is no year-end close that
  rolls it into Retained Earnings yet.
- **The 9000 Suspense account** collects unclassifiable bank transactions for
  manual review — check it periodically.
