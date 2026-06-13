import re

with open('src/pages/Accounting.tsx', 'r') as f:
    code = f.read()

# Add imports
if 'import { Tabs' not in code:
    code = code.replace(
        "import { useMemo, useState, useEffect } from 'react';",
        "import { useMemo, useState, useEffect } from 'react';\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';"
    )

code = code.replace(
    '      {/* Stats Row */}',
    '''      {userRole !== 'admin' && userRole !== 'manager' ? (
        <div className="space-y-6">
            {/* Regular user just sees Expense Form from below */}
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card/50 backdrop-blur-md border border-border/50 p-1 rounded-xl h-12 w-full max-w-md grid grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold h-9">Overview</TabsTrigger>
            <TabsTrigger value="balance_sheet" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold h-9">Balance Sheet</TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold h-9">Expenses & Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            {/* Stats Row */}'''
)

code = code.replace(
    '      {/* --- BALANCE SHEET SECTION --- */}',
    '''      {/* --- BALANCE SHEET SECTION --- */}
          </TabsContent>

          <TabsContent value="balance_sheet" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">'''
)

code = code.replace(
    '      {/* Operational insights */}',
    '''          </TabsContent>
          
          <TabsContent value="overview" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
      {/* Operational insights */}'''
)

code = code.replace(
    '      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: \'100ms\' }}>',
    '''          </TabsContent>

          <TabsContent value="expenses" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>'''
)

code = code.replace(
    '            {/* Premium P&L & Expenses */}',
    '''          </TabsContent>

          <TabsContent value="overview" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Premium P&L & Expenses */}'''
)

code = code.replace(
    '            {/* Elevated Transaction Ledger */}',
    '''              <div></div>{/* Filler for Grid */}
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            {/* Elevated Transaction Ledger */}'''
)

code = code.replace(
    '          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">',
    '''          </TabsContent>

          <TabsContent value="balance_sheet" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">'''
)

code = code.replace(
    '          {/* Premium Quick Actions */}',
    '''          </TabsContent>

          <TabsContent value="overview" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
          {/* Premium Quick Actions */}'''
)

code = code.replace(
    '          <TransactionLedgerModal',
    '''          </TabsContent>
        </Tabs>
      )}

          <TransactionLedgerModal'''
)

# Strip out the existing userRole wrappers that we just bypassed
code = re.sub(r'\{\(userRole === \'admin\' \|\| userRole === \'manager\'\) && \(\n?\s*<>\n', '', code)
code = re.sub(r'\{\(userRole === \'admin\' \|\| userRole === \'manager\'\) && \(\n', '', code)
# We also need to strip the corresponding closings `)}` and `</>\n          )}`
# Since these are trickier to regex blindly without breaking things, I will just leave them? No, React will complain about unbalanced braces or unexpected tokens.
# A better way is just to regex replace the exact lines:
code = code.replace('      {(userRole === \'admin\' || userRole === \'manager\') && (\n', '')
code = code.replace('        <>\n', '')
code = code.replace('        </>\n      )}\n', '')
code = code.replace('      )}\n', '')

with open('src/pages/Accounting.tsx', 'w') as f:
    f.write(code)

print('Success')
