const fs = require('fs');
const file = 'src/pages/Accounting.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add import
if (!code.includes('import { Tabs')) {
  code = code.replace(
    /import \{ useMemo, useState, useEffect \} from 'react';/,
    "import { useMemo, useState, useEffect } from 'react';\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';"
  );
}

const parts = {};

const markers = {
  statsRowStart: '      {/* Stats Row */}',
  balanceSheetStart: '      {/* --- BALANCE SHEET SECTION --- */}',
  operationalInsightsStart: '      {/* Operational insights */}',
  expenseFormStart: '      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: \'100ms\' }}>',
  premiumPnLStart: '            {/* Premium P&L & Expenses */}',
  ledgerStart: '            {/* Elevated Transaction Ledger */}',
  workingCapitalStart: '          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">',
  quickActionsStart: '          {/* Premium Quick Actions */}',
  adminWrapEnd: '          <TransactionLedgerModal',
};

const extract = (start, end) => {
  const i = code.indexOf(start);
  const j = code.indexOf(end, i + start.length);
  if (i === -1 || j === -1) throw new Error('Could not find ' + start + ' or ' + end);
  return code.substring(i, j);
};

try {
  parts.header = code.substring(0, code.indexOf(markers.statsRowStart));
  parts.statsRow = extract(markers.statsRowStart, markers.balanceSheetStart);
  parts.balanceSheet = extract(markers.balanceSheetStart, markers.operationalInsightsStart);
  parts.operationalInsights = extract(markers.operationalInsightsStart, markers.expenseFormStart);
  
  parts.expenseForm = extract(markers.expenseFormStart, "      {(userRole === 'admin' || userRole === 'manager') && (\n        <>\n          <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6\">");
  
  parts.premiumPnL = extract(markers.premiumPnLStart, markers.ledgerStart);
  parts.ledger = extract(markers.ledgerStart, markers.workingCapitalStart);
  parts.workingCapital = extract(markers.workingCapitalStart, markers.quickActionsStart);
  parts.quickActions = extract(markers.quickActionsStart, markers.adminWrapEnd);
  
  parts.footer = code.substring(code.indexOf(markers.adminWrapEnd));

  const newCode = parts.header + 
`      {userRole !== 'admin' && userRole !== 'manager' ? (
` + parts.expenseForm + `
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card/50 backdrop-blur-md border border-border/50 p-1 rounded-xl h-12 w-full max-w-md grid grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold h-9">Overview</TabsTrigger>
            <TabsTrigger value="balance_sheet" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold h-9">Balance Sheet</TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold h-9">Expenses & Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
` + parts.statsRow.replace(/\{\(userRole === 'admin' \|\| userRole === 'manager'\) && \(/, '').replace(/      \)\}/, '') + 
parts.operationalInsights.replace(/\{\(userRole === 'admin' \|\| userRole === 'manager'\) && \(/, '').replace(/      \)\}/, '') + `
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
` + parts.premiumPnL + `
              <div></div> {/* Empty column filler since we moved Ledger out */}
            </div>
` + parts.quickActions + `
          </TabsContent>

          <TabsContent value="balance_sheet" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
` + parts.balanceSheet.replace(/\{\(userRole === 'admin' \|\| userRole === 'manager'\) && \(/, '').replace(/      \)\}/, '') + parts.workingCapital + `
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
` + parts.expenseForm + `
            <div className="mt-6">
` + parts.ledger + `
            </div>
          </TabsContent>
        </Tabs>
      )}

` + parts.footer;

  fs.writeFileSync(file, newCode, 'utf8');
  console.log('Successfully restructured file');
} catch (e) {
  console.error('Error:', e.message);
  console.error(e.stack);
}
