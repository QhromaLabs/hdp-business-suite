# HDP Business Suite — Client & AI Developer Guide

Hi! This package contains the full HDP Business Suite project files, compiled web/mobile builds, database setup, and source code.

---

## 📌 1. Project Overview

- **What it is:** A complete ERP system with Login, Dashboard, POS, Orders, Customers, Inventory, Purchases, Manufacturing, Accounting, HR & Payroll, Commissions, Deliveries, and Mobile Apps.
- **Login & Auth:** Built-in authentication with user roles (`admin`, `manager`, `sales_rep`, `clerk`).
- **Security:** The database hosted on the VPS server is fully encrypted and secured for data privacy.

---

## 📁 2. Simple File Structure Guide

Here is where everything is located:

```
client_bundle/
├── README.md                  # This simple guide
├── SYSTEM_OVERVIEW.md         # List of features and modules
├── ACCOUNTING_GUIDE.md        # How the accounting GL works
├── DATABASE_SCHEMA.sql        # Full database tables and setup script
├── web_app/                   # Compiled web application (ready to run in browser or host)
├── mobile_apks/               # Android apps for phone installation
│   ├── deliveries-app.apk     # Delivery driver app
│   └── sales-app.apk          # Field sales app
└── source_code/               # Full React + TypeScript source code for developers/AI
    ├── src/
    │   ├── App.tsx            # Main app router & all page links
    │   ├── pages/             # All UI pages (POS, Orders, Inventory, Accounting, etc.)
    │   ├── components/        # Reusable UI cards, tables, layouts, and forms
    │   ├── hooks/             # Data fetching hooks and logic
    │   └── contexts/          # Auth context and user state
    ├── package.json           # Project dependencies
    └── vite.config.ts         # Build configuration
```

---

## 🤖 3. How an AI or Developer Can Work on This

If you or your developer give this `source_code/` folder to an AI assistant (like Claude, ChatGPT, or Cursor):
1. Point the AI to `src/App.tsx` to see all the pages and routes.
2. Point the AI to `src/pages/` to edit or add new pages.
3. Point the AI to `DATABASE_SCHEMA.sql` so it understands the database tables.
