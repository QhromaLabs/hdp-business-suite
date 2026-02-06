import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Sparkles, Package, Truck, Users, DollarSign, Factory, CreditCard, Wallet, Smartphone, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Feature {
    title: string;
    description: string;
    screenshot?: string;
    highlights?: string[];
}

interface ChangelogSection {
    id: string;
    title: string;
    icon: any;
    color: string;
    features: Feature[];
}

export default function Changelog() {
    const navigate = useNavigate();
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['pos']));

    const changelogData: ChangelogSection[] = [
        {
            id: 'pos',
            title: 'Point of Sale (POS)',
            icon: Package,
            color: 'text-blue-600 bg-blue-500/10',
            features: [
                {
                    title: 'Return Mode Toggle',
                    description: 'Introduced a dedicated Return Mode that transforms the POS interface for processing product returns. When activated, the UI adopts purple accents and the checkout process is modified to handle returns instead of sales.',
                    highlights: [
                        'One-click toggle between Sale and Return modes',
                        'Visual indicators with purple accent colors',
                        'Toast notifications when mode is activated',
                        'Modified checkout flow for returns processing'
                    ],
                    screenshot: 'C:/Users/cliff/.gemini/antigravity/brain/9dd0632f-4553-4f62-86a9-bc6cde7b92fd/01_pos_return_mode_toggle.png'
                },
                {
                    title: 'Enhanced Return Processing Workflow',
                    description: 'Complete return processing system with reason tracking, notes, and refund method selection. Returns are linked to original orders with full audit trail.',
                    highlights: [
                        'Return reason capture (Defective, Wrong Item, Customer Request)',
                        'Optional notes for detailed return documentation',
                        'Refund method selection (Cash, M-Pesa, Store Credit)',
                        'Automatic inventory adjustment on return completion',
                        'Full return history and tracking'
                    ],
                    screenshot: 'C:/Users/cliff/.gemini/antigravity/brain/9dd0632f-4553-4f62-86a9-bc6cde7b92fd/02_pos_return_processing_modal.png'
                },
                {
                    title: 'Global Discount System',
                    description: 'Apply discounts to the entire transaction with a single input. The discount is dynamically reflected in the cart total with real-time calculations.',
                    highlights: [
                        'Quick discount input in cart details',
                        'Real-time total recalculation',
                        'Visual breakdown showing discount amount',
                        'Minimum value validation'
                    ],
                    screenshot: 'C:/Users/cliff/.gemini/antigravity/brain/9dd0632f-4553-4f62-86a9-bc6cde7b92fd/03_pos_global_discount.png'
                },
                {
                    title: 'Per-Item Price Editing',
                    description: 'Flexibility to adjust individual item prices during checkout for special pricing, promotions, or negotiations.',
                    highlights: [
                        'Inline price editing for cart items',
                        'Maintains original price reference',
                        'Override prices for specific customers',
                        'Price changes reflected immediately in totals'
                    ]
                },
                {
                    title: 'Customer Credit Balance Display',
                    description: 'Real-time display of customer credit limits and outstanding balances during checkout to support informed credit decisions.',
                    highlights: [
                        'Live credit balance display in customer selector',
                        'Credit limit vs. current balance visualization',
                        'Warning indicators for customers at/over limit',
                        'Credit customer type identification'
                    ],
                    screenshot: '[Screenshot Placeholder: Customer Credit Display]'
                },
                {
                    title: 'Product Variant Selection & Stock Indicators',
                    description: 'Enhanced product grid with variant selection and real-time stock level visualization with low-stock alerts.',
                    highlights: [
                        'Visual stock badges on product cards',
                        'Low stock warnings (red badges)',
                        'Real-time inventory sync',
                        'Out-of-stock indicators',
                        'Configurable reorder level thresholds'
                    ]
                },
                {
                    title: 'Customer Quick-Add Modal',
                    description: 'Streamlined customer creation directly from the POS checkout flow without leaving the transaction.',
                    highlights: [
                        'Inline customer creation during checkout',
                        'Auto-selection after creation',
                        'Name and phone capture',
                        'Immediate availability for current sale'
                    ]
                }
            ]
        },
        {
            id: 'manufacturing',
            title: 'Manufacturing & Production',
            icon: Factory,
            color: 'text-purple-600 bg-purple-500/10',
            features: [
                {
                    title: 'Production Batch Management',
                    description: 'Comprehensive system for creating, tracking, and completing production batches with real-time status monitoring.',
                    highlights: [
                        'Create production batches from recipes',
                        'Track active vs. completed batches',
                        'Production output value calculation',
                        'Batch yield and efficiency metrics',
                        'Historical batch records with filtering'
                    ],
                    screenshot: 'C:/Users/cliff/.gemini/antigravity/brain/9dd0632f-4553-4f62-86a9-bc6cde7b92fd/05_manufacturing_production_batch.png'
                },
                {
                    title: 'Recipe Management & BOM',
                    description: 'Define production recipes with detailed Bills of Materials (BOM), cost calculations, and ingredient tracking.',
                    highlights: [
                        'Recipe creation with multi-ingredient support',
                        'Automatic cost calculation from materials',
                        'Yield quantity specification',
                        'Edit and version control for recipes',
                        'Linked to production batches'
                    ]
                },
                {
                    title: 'Raw Material Inventory Tracking',
                    description: 'Dedicated raw material management with restock functionality and inventory valuation.',
                    highlights: [
                        'Raw material catalog management',
                        'Restock with quantity and unit price',
                        'Edit material details and pricing',
                        'Delete unused materials',
                        'Total raw material value tracking',
                        'Low stock alerts'
                    ],
                    screenshot: 'C:/Users/cliff/.gemini/antigravity/brain/9dd0632f-4553-4f62-86a9-bc6cde7b92fd/06_manufacturing_raw_materials.png'
                },
                {
                    title: 'Machine Health Monitoring',
                    description: 'Track manufacturing equipment health, status, and valuation for maintenance planning.',
                    highlights: [
                        'Machine registration and cataloging',
                        'Health status indic ators (Good, Needs Maintenance, Critical)',
                        'Equipment value tracking',
                        'Total machinery asset valuation',
                        'Maintenance scheduling support'
                    ]
                },
                {
                    title: 'Intermediate Product (Semi-Finished Goods)',
                    description: 'Support for semi-finished products in the production workflow, enabling multi-stage manufacturing.',
                    highlights: [
                        'Create intermediate products',
                        'Use in recipe BOMs',
                        'Track semi-finished inventory separately',
                        'Multi-level production chains'
                    ]
                },
                {
                    title: 'Manufacturing Ledger',
                    description: 'Detailed financial tracking of all manufacturing activities, costs, and production value.',
                    highlights: [
                        'Raw material cost tracking',
                        'Production batch valuation',
                        'Equipment investment tracking',
                        'Manufacturing spend breakdown',
                        'Profit/loss analysis per batch'
                    ]
                },
                {
                    title: 'Production Statistics Dashboard',
                    description: 'Real-time overview of production metrics including output, value, and resource utilization.',
                    highlights: [
                        'Active batch count',
                        'Production output value',
                        'Raw material inventory value',
                        'Equipment asset value',
                        'Production efficiency metrics'
                    ]
                }
            ]
        },
        {
            id: 'field-sales',
            title: 'Field Sales & Tracking',
            icon: MapPin,
            color: 'text-green-600 bg-green-500/10',
            features: [
                {
                    title: 'Real-Time Agent Location Tracking',
                    description: 'Live map interface showing the current location of all field sales representatives with custom markers.',
                    highlights: [
                        'Interactive Leaflet map integration',
                        'Custom agent markers with initials',
                        'Status-based color coding (active, idle, offline)',
                        'Automatic position updates via WebSocket',
                        'Geocoded address display using Nominatim'
                    ],
                    screenshot: '[Screenshot Placeholder: Live Agent Tracking Map]'
                },
                {
                    title: 'Route Visualization & Coverage',
                    description: 'Display agent routes and movement history with path tracking for territory coverage analysis.',
                    highlights: [
                        'Historical location trace plotting',
                        'Route path visualization on map',
                        'Territory coverage heatmaps',
                        'Distance and time tracking',
                        'Movement pattern analysis'
                    ]
                },
                {
                    title: 'Agent Performance Dashboard',
                    description: 'Comprehensive metrics tracking for each sales agent including orders, revenue, and targets.',
                    highlights: [
                        'Orders completed counter',
                        'Total sales value tracking',
                        'Target vs. actual performance',
                        'Efficiency rate calculation',
                        'Leader board for top performers',
                        'MVP designation for high achievers'
                    ],
                    screenshot: '[Screenshot Placeholder: Agent Performance Metrics]'
                },
                {
                    title: 'Order Management & Approval',
                    description: 'Centralized order desk for reviewing, approving, and dispatching field orders.',
                    highlights: [
                        'Pending order queue',
                        '"Release" approval workflow',
                        'Dispatch order functionality',
                        'Order status transitions (Pending → Approved → Dispatched)',
                        'Order details preview'
                    ]
                },
                {
                    title: 'Field Note Logging System',
                    description: 'Allow agents and admins to log field observations, customer feedback, and follow-up tasks.',
                    highlights: [
                        'Quick note capture interface',
                        'Feedback categorization',
                        'Follow-up date scheduling',
                        'Note history and audit trail',
                        'Link notes to specific customers or locations'
                    ]
                },
                {
                    title: 'Location Ping Request',
                    description: 'Manual location refresh capability to request live position updates from agents on demand.',
                    highlights: [
                        'One-click location ping',
                        'Loading state during fetch',
                        'Timestamp display on last ping',
                        'Failed ping error handling'
                    ]
                }
            ]
        },
        {
            id: 'deliveries',
            title: 'Deliveries & Logistics',
            icon: Truck,
            color: 'text-orange-600 bg-orange-500/10',
            features: [
                {
                    title: 'Delivery Agent Live Tracking',
                    description: 'Real-time map-based tracking of delivery agents with custom markers showing status and location.',
                    highlights: [
                        'Live Leaflet map with agent positions',
                        'Custom markers with agent initials',
                        'Status indicators (online, busy, offline)',
                        'Automatic map centering and bounds adjustment'
                    ],
                    screenshot: '[Screenshot Placeholder: Delivery Agent Map]'
                },
                {
                    title: 'Order Pin Visualization',
                    description: 'Display delivery orders as pins on the map with customer information and order details.',
                    highlights: [
                        'Clickable order pins on map',
                        'Info cards with client name, order #, and ID',
                        'Open full order details on pin click',
                        'Color-coded by status (pending, in_transit, delivered)'
                    ]
                },
                {
                    title: 'In-Transit Order Tracking',
                    description: 'Track orders currently being delivered with real-time driver location updates.',
                    highlights: [
                        'In-transit status badge',
                        'Live driver GPS tracking',
                        'Estimated time of arrival (ETA)',
                        'Route path visualization'
                    ]
                },
                {
                    title: 'Delivery Note Generation (PDF)',
                    description: 'Automatic PDF delivery note generation with brand header, logo, and itemized list.',
                    highlights: [
                        'Professional PDF layout with brand elements',
                        'Itemized product list with quantities',
                        'Customer details and delivery address',
                        'Signature section for proof of delivery',
                        'Automatic page breaks for long orders',
                        'Duplicate copy for customer'
                    ],
                    screenshot: '[Screenshot Placeholder: Delivery Note PDF]'
                },
                {
                    title: 'Delivery History & Location Log',
                    description: 'Comprehensive log of all delivery agent movements and location pings with timestamps.',
                    highlights: [
                        'Chronological location history',
                        'Reverse geocoded addresses',
                        'Ping timestamp tracking',
                        'Last known location display'
                    ]
                }
            ]
        },
        {
            id: 'customers',
            title: 'Customers & CRM',
            icon: Users,
            color: 'text-pink-600 bg-pink-500/10',
            features: [
                {
                    title: 'Customer Type Management',
                    description: 'Support for multiple customer types with distinct behaviors and credit capabilities.',
                    highlights: [
                        'Normal customers (standard cash/credit)',
                        'Consignment customers',
                        'Marketplace customers',
                        'Credit customers with limits',
                        'Type-based filtering and search'
                    ],
                    screenshot: '[Screenshot Placeholder: Customer Types View]'
                },
                {
                    title: 'Credit Limit & Balance Tracking',
                    description: 'Real-time credit management with limit enforcement and balance monitoring.',
                    highlights: [
                        'Configurable credit limits per customer',
                        'Live balance calculation',
                        'Over-limit warnings',
                        'Credit utilization percentage',
                        'Payment history tracking'
                    ]
                },
                {
                    title: 'Contact Information Management',
                    description: 'Comprehensive contact details with phone, email, and note support.',
                    highlights: [
                        'Phone number capture and display',
                        'Email communication links',
                        'Customer notes and tags',
                        'Quick contact actions'
                    ]
                },
                {
                    title: 'Customer Financial Management',
                    description: 'View and manage customer financial transactions, credit balances, and payment history.',
                    highlights: [
                        'Outstanding balance overview',
                        'Payment collection interface',
                        'Transaction history',
                        'Credit adjustment capabilities'
                    ]
                }
            ]
        },
        {
            id: 'accounting',
            title: 'Accounting & Finance',
            icon: DollarSign,
            color: 'text-emerald-600 bg-emerald-500/10',
            features: [
                {
                    title: 'Balance Sheet Dashboard',
                    description: 'Real-time financial position with assets, liabilities, and owner\'s equity calculation.',
                    highlights: [
                        'Cash & Bank balance tracking',
                        'Inventory stock valuation (Raw + Finished)',
                        'Equipment & Fixed Assets',
                        'Accounts Receivable (customer debts)',
                        'Supplier Payables',
                        'Pending Payroll obligations',
                        'Owner\'s Equity calc ulation (Assets - Liabilities)'
                    ],
                    screenshot: '[Screenshot Placeholder: Balance Sheet View]'
                },
                {
                    title: 'Cash Flow Visualization (30-day)',
                    description: 'Track cash inflows and outflows over the last 30 days with graphical representation.',
                    highlights: [
                        'Cash IN from customer payments',
                        'Cash OUT breakdown (expenses, payroll, suppliers)',
                        'Net cash flow calculation',
                        'Visual progress bar representation'
                    ]
                },
                {
                    title: 'Manufacturing Spend Breakdown',
                    description: 'Dedicated tracking of all manufacturing-related costs including materials, equipment, and production.',
                    highlights: [
                        'Materials cost tracking',
                        'Equipment investment allocation',
                        'Production run costs',
                        'Total manufacturing spend aggregate',
                        'Cost per batch analysis'
                    ]
                },
                {
                    title: 'Expense Recording System',
                    description: 'Quick expense logging with customizable categories and detailed tracking.',
                    highlights: [
                        'Custom or preset expense categories',
                        'Category management (select or type)',
                        'Description and reference number fields',
                        'Expense date selection',
                        'Instant ledger posting'
                    ],
                    screenshot: '[Screenshot Placeholder: Expense Entry Form]'
                },
                {
                    title: 'Date Range Filtering',
                    description: 'Flexible date range selection for all financial reports with preset quick filters.',
                    highlights: [
                        '30-day quick filter',
                        'Bi-monthly (60-day) filter',
                        'Yearly view',
                        'Custom date range picker',
                        'All data hooks synchronized to selected range'
                    ]
                },
                {
                    title: 'Unified Transaction Ledger',
                    description: 'Combined view of all financial transactions including income, expenses, and transfers.',
                    highlights: [
                        'All income from payments',
                        'All expenses (general, payroll, suppliers)',
                        'Creditor transactions',
                        'Payroll disbursements',
                        'Chronological sorting',
                        'Type and category filtering'
                    ]
                },
                {
                    title: 'Payment Method Breakdown',
                    description: 'Track cash vs. digital payments with breakdown by method (Cash, M-Pesa, Bank, Credit).',
                    highlights: [
                        'Cash payment totals',
                        'M-Pesa transaction tracking',
                        'Bank transfer monitoring',
                        'Credit sale tracking',
                        'Top payment methods ranking'
                    ]
                },
                {
                    title: 'Realtime Sync',
                    description: 'Automatic data refresh across all accounting tables using Supabase Realtime.',
                    highlights: [
                        'Live updates from Supabase',
                        'Multi-table subscription',
                        'Instant query invalidation',
                        'No manual refresh required'
                    ]
                }
            ]
        },
        {
            id: 'payroll',
            title: 'Payroll & Salaries',
            icon: Wallet,
            color: 'text-indigo-600 bg-indigo-500/10',
            features: [
                {
                    title: 'Combined Payroll + Commission Dashboard',
                    description: 'Unified view of employee salaries and sales agent commissions in one interface.',
                    highlights: [
                        'Pending payroll estimate',
                        'Total commission payouts tracking',
                        'Deductions (tax & other) summary',
                        'Combined outflow calculation',
                        'Visual breakdown of all components'
                    ],
                    screenshot: '[Screenshot Placeholder: Payroll Dashboard]'
                },
                {
                    title: 'Payroll Processing',
                    description: 'One-click payroll run functionality to process all pending employee salaries.',
                    highlights: [
                        '"RUN SALARY PAYROLL" action button',
                        'Batch salary processing',
                        'Status updates (pending → paid)',
                        'Payroll history tracking',
                        'Loading states during processing'
                    ]
                },
                {
                    title: 'Recent Payouts Ledger',
                    description: 'Chronological view of recent salary and commission payments with status indicators.',
                    highlights: [
                        'Mixed salary and commission entries',
                        'Employee/agent name display',
                        'Payment type labels',
                        'Amount and date display',
                        'Status badges (pending, paid)'
                    ]
                }
            ]
        },
        {
            id: 'commissions',
            title: 'Sales Commissions',
            icon: CreditCard,
            color: 'text-cyan-600 bg-cyan-500/10',
            features: [
                {
                    title: 'Commission Calculation (1% of Order Total)',
                    description: 'Automatic commission generation at 1% of order value for sales agents on every completed sale.',
                    highlights: [
                        'Automatic 1% commission on orders',
                        'Real-time commission accrual',
                        'Commission log with order reference',
                        'Total lifetime commissions tracking'
                    ]
                },
                {
                    title: 'Withdrawal Request System',
                    description: 'Agents can request commission withdrawals to M-Pesa with admin approval workflow.',
                    highlights: [
                        'Self-service withdrawal requests',
                        'M-Pesa phone number capture',
                        'Pending request tracking',
                        'Admin approval/rejection interface',
                        'Optional notes for approval/rejection'
                    ],
                    screenshot: '[Screenshot Placeholder: Withdrawal Request Modal]'
                },
                {
                    title: 'Withdrawal Approval Workflow',
                    description: 'Admin interface to review, approve/pay, or reject withdrawal requests with notes.',
                    highlights: [
                        '"Pay" action (marks as paid, creates expense)',
                        '"Reject" action with reason capture',
                        'Approval notes and references (e.g., M-Pesa code)',
                        'Status transitions (pending → paid/rejected)',
                        'Processed date tracking'
                    ]
                },
                {
                    title: 'Commission to Expense Integration',
                    description: 'Approved commission payouts automatically create expense entries in accounting ledger.',
                    highlights: [
                        'Auto-expense on payment approval',
                        'Linked to agent profile',
                        'Tracking in accounting module',
                        'Full audit trail'
                    ]
                },
                {
                    title: 'Commission Stats & Analytics',
                    description: 'Overview dashboard showing total commissions, pending requests, and payout history.',
                    highlights: [
                        'Total commissions generated (lifetime)',
                        'Pending withdrawal amount',
                        'Total paid out commissions',
                        'Request count display'
                    ]
                }
            ]
        },
        {
            id: 'sales-agent-app',
            title: 'Sales Agent Mobile App',
            icon: Smartphone,
            color: 'text-rose-600 bg-rose-500/10',
            features: [
                {
                    title: 'Mobile POS with Product Images',
                    description: 'Full-featured mobile POS with product images, stock indicators, and customer credit visibility.',
                    highlights: [
                        'Product grid with network images',
                        'Real-time stock badges (low stock warnings)',
                        'Customer selection with credit balance display',
                        'Quick customer creation',
                        'Cart management with checkout',
                        'Payment method selection (Cash, M-Pesa, Bank, Credit)',
                        'Location-tagged orders (GPS)',
                        'Offline-ready architecture'
                    ],
                    screenshot: '[Screenshot Placeholder: Mobile POS Grid]'
                },
                {
                    title: 'Wallet & Earnings Tracking',
                    description: 'Dedicated wallet page showing agent earnings, available balance, and withdrawal history.',
                    highlights: [
                        'Available balance display',
                        'Total earned commissions',
                        'Pending withdrawals tracker',
                        'Transaction history (earnings + withdrawals)',
                        'Visual gradient wallet card',
                        'Pull-to-refresh functionality'
                    ],
                    screenshot: '[Screenshot Placeholder: Mobile Wallet Page]'
                },
                {
                    title: 'Withdrawal Request (Mobile)',
                    description: 'In-app withdrawal request form with auto-populated phone number and available balance validation.',
                    highlights: [
                        'Bottom modal withdrawal form',
                        'Available balance display',
                        'M-Pesa phone auto-fill from profile',
                        'Amount validation (max = available)',
                        'Loading states and confirmations',
                        'Immediate UI update on submission'
                    ]
                },
                {
                    title: 'Enhanced Stock Visibility',
                    description: 'Real-time inventory levels displayed on product cards with low-stock alerts.',
                    highlights: [
                        'Stock quantity badges on cards',
                        'Low stock visual warnings (red)',
                        'Stock level thresholds',
                        'Out-of-stock indicators'
                    ]
                },
                {
                    title: 'Customer Credit Display',
                    description: 'Show customer credit balance and limit during checkout to inform credit decisions.',
                    highlights: [
                        'Unpaid balance display',
                        'Credit limit reference',
                        'Over-limit warnings',
                        'Customer type identification'
                    ]
                }
            ]
        },
        {
            id: 'delivery-agent-app',
            title: 'Delivery Agent Mobile App',
            icon: Truck,
            color: 'text-amber-600 bg-amber-500/10',
            features: [
                {
                    title: 'Phone-Based Authentication',
                    description: 'Simplified login using phone number for delivery agents without complex credentials.',
                    highlights: [
                        'Phone number login',
                        'Pre-approved number validation',
                        'Admin-controlled access',
                        'No email required'
                    ]
                },
                {
                    title: 'Order Dashboard with Map',
                    description: 'Delivery-focused interface showing assigned orders with an integrated map view.',
                    highlights: [
                        'Order list with customer details',
                        'Integrated map showing delivery locations',
                        'Order status updates',
                        'Route visualization'
                    ],
                    screenshot: '[Screenshot Placeholder: Delivery Agent Dashboard]'
                },
                {
                    title: 'Floating Bottom Navigation',
                    description: 'Intuitive bottom navigation with Home, Map, and History tabs with active state animations.',
                    highlights: [
                        'White rounded floating bar',
                        'Orange active state highlighting',
                        'Icon + label on active tab',
                        'Smooth transitions',
                        'Right-aligned layout'
                    ]
                },
                {
                    title: 'Delivery History View',
                    description: 'Historical log of all completed deliveries with order details and clickable cards.',
                    highlights: [
                        'Clickable delivered order cards',
                        'Order details modal (read-only)',
                        'Delivery timestamps',
                        'Customer information',
                        'No actions for delivered orders'
                    ]
                },
                {
                    title: 'Live Location Broadcasting',
                    description: 'Automatic GPS location sharing to admin panel for real-time tracking.',
                    highlights: [
                        'Background location tracking',
                        'Periodic position updates',
                        'Low battery optimization',
                        'Privacy controls'
                    ]
                }
            ]
        }
    ];

    const toggleSection = (id: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <div className="max-w-6xl mx-auto px-6 py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-8 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
                    >
                        <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        Back
                    </button>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                            <Sparkles className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                Platform Changelog
                            </h1>
                            <p className="text-xl text-muted-foreground mt-2">
                                January - February 2026
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 p-6 bg-primary/5 border border-primary/20 rounded-2xl">
                        <p className="text-base text-foreground/80 leading-relaxed">
                            A comprehensive overview of all features, enhancements, and updates delivered to the HDP Business Suite
                            during the first two months of 2026. This changelog details improvements across POS, Manufacturing,
                            Field Sales, Deliveries, Accounting, Payroll, Commissions, and both mobile applications.
                        </p>
                    </div>
                </motion.div>

                {/* Changelog Sections */}
                <div className="mt-12 space-y-6">
                    {changelogData.map((section, idx) => {
                        const Icon = section.icon;
                        const isExpanded = expandedSections.has(section.id);

                        return (
                            <motion.div
                                key={section.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: idx * 0.05 }}
                                className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                                {/* Section Header */}
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full px-8 py-6 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn('p-3 rounded-2xl', section.color)}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {section.features.length} feature{section.features.length !== 1 ? 's' : ''} added
                                            </p>
                                        </div>
                                    </div>
                                    <motion.div
                                        animate={{ rotate: isExpanded ? 180 : 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <ChevronDown className="w-6 h-6 text-muted-foreground" />
                                    </motion.div>
                                </button>

                                {/* Section Content */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-8 pb-8 space-y-6 border-t border-border/30 pt-6">
                                                {section.features.map((feature, featureIdx) => (
                                                    <motion.div
                                                        key={featureIdx}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ duration: 0.3, delay: featureIdx * 0.05 }}
                                                        className="bg-muted/20 rounded-2xl p-6 border border-border/30"
                                                    >
                                                        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                                                            {feature.title}
                                                        </h3>
                                                        <p className="text-muted-foreground leading-relaxed mb-4">
                                                            {feature.description}
                                                        </p>

                                                        {feature.highlights && feature.highlights.length > 0 && (
                                                            <div className="mt-4">
                                                                <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2">
                                                                    Key Highlights
                                                                </p>
                                                                <ul className="space-y-2">
                                                                    {feature.highlights.map((highlight, hIdx) => (
                                                                        <li key={hIdx} className="text-sm text-foreground/80 flex items-start gap-2">
                                                                            <span className="text-primary mt-1">✓</span>
                                                                            <span>{highlight}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {feature.screenshot && (
                                                            <div className="mt-6 rounded-xl overflow-hidden border border-border/50">
                                                                {feature.screenshot.startsWith('[') ? (
                                                                    <div className="p-8 bg-muted/40 border-2 border-dashed border-border/50 text-center">
                                                                        <p className="text-sm italic text-muted-foreground">{feature.screenshot}</p>
                                                                    </div>
                                                                ) : (
                                                                    <img
                                                                        src={feature.screenshot}
                                                                        alt={feature.title}
                                                                        className="w-full h-auto"
                                                                    />
                                                                )}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-16 text-center pb-8"
                >
                    <div className="inline-block px-6 py-3 bg-card border border-border/50 rounded-full">
                        <p className="text-sm text-muted-foreground">
                            Built with ❤️ by the HDP Development Team • Jan-Feb 2026
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
