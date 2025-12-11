# 📊 Dashboard Widget Audit & Suggestions

## Executive Summary

This document provides a comprehensive audit of **The Pep Planner** app features and the current customizable dashboard widget system. It identifies gaps between available features and widgetized content, and proposes new widgets to enhance the dashboard experience.

---

## 🎯 Current Widget Inventory (23 Widgets)

### **Core Task & Activity Widgets**
1. **Tasks Widget** (`tasks`) - Today's research tasks (supplements, peptides)
2. **Quick Actions Widget** (`quick_actions`) - Essential actions (reconstitute, add stockpile, vendor, protocol)
3. **Injection History Widget** (`injection_history`) - Track injection sites and history

### **Order & Inventory Management**
4. **Upcoming Order Widget** (`upcoming_order`) - Track incoming orders and shipments
5. **Upcoming Buys Widget** (`upcoming_buys`) - Scheduled group buys and purchases
6. **Pending Vendors Widget** (`pending_vendors`) - Complete vendor information for auto-created vendors
7. **Inventory Widget** (`inventory`) - Monitor stock levels and low inventory alerts
8. **Lead Time Widget** (`lead_time`) - Track delivery times and vendor performance

### **Financial & Analytics**
9. **Spending Widget** (`spending`) - Monitor monthly and total spending
10. **Analytics Widget** (`analytics`) - Full analytics dashboard (compliance, spending, inventory)

### **Protocol & Research Tracking**
11. **Compliance Widget** (`compliance`) - Track supplement compliance and streaks
12. **Active Protocols Notes Widget** (`active_protocols_notes`) - Add research notes to active protocols
13. **Goals Only Widget** (`goals_only`) - Track and manage research goals
14. **Metrics Widget** (`metrics_only`) - Record and track body metrics

### **Health & Wellness**
15. **Supplements Widget** (`supplements`) - Manage supplement schedule
16. **Water Tracker Widget** (`water_tracker`) - Track daily water intake

### **Information & Reference**
17. **Glossary Widget** (`glossary`) - Comprehensive peptide research tool with search
18. **Notes Widget** (`notes`) - Quick note-taking for research observations
19. **Tips Widget** (`tips`) - Rotating tips to discover app features
20. **Wishlist Widget** (`wishlist`) - Track research items to purchase or investigate

### **Achievement & Recognition**
21. **Badges Widget** (`badges`) - Track achievement progress

### **Special Widgets**
22. **Conversion Widget** (`conversion`) - Subscription upgrade prompts (not in customization system)
23. **Research Status Widget** - Research status display (not in customization system)

---

## 🔍 App Feature Inventory

### **Core Features (Full Pages)**

#### 1. **Calendar** (`/app/calendar`)
- **Features:**
  - Month/Week view toggle
  - Protocol scheduling visualization
  - Daily task tracking (AM/PM)
  - Calendar notes per day
  - Injection site tracking
  - Task completion tracking
  - Quick edit functionality
  - Day view modal with full details
- **Data Tracked:**
  - Scheduled peptides by protocol
  - Scheduled supplements
  - Calendar notes/observations
  - Task completion status
  - Injection sites (if enabled)
  - Protocol timelines

#### 2. **Protocols** (`/app/protocols`)
- **Features:**
  - Protocol library (active/inactive)
  - Protocol creation/editing
  - Protocol history tracking
  - Start protocol wizard
  - Protocol follow-up management
  - Vial management for active protocols
  - Protocol search
  - Export to CSV
- **Data Tracked:**
  - Protocol definitions
  - Active protocol instances
  - Protocol history entries
  - Completion status
  - Start/end dates
  - Washout periods
  - Protocol notes

#### 3. **Reconstitution** (`/app/recon`)
- **Features:**
  - Reconstitution calculator
  - Reconstituted items list
  - Reconstitution history
  - Multi-peptide mixing
  - Pen color tracking
  - Delivery method selection
  - Vial inventory management
  - Usage history
- **Data Tracked:**
  - Reconstituted peptides
  - Calculation formulas
  - Reconstitution dates
  - Pen colors
  - Delivery methods
  - Usage tracking

#### 4. **Stockpile** (`/app/stockpile`)
- **Features:**
  - On-hand inventory
  - Incoming inventory
  - Peptide details (mg, quantity, vendor, batch, expiration)
  - Documentation upload
  - Image attachments
  - Duplicate detection
  - Merge functionality
  - Stock history tracking
  - Low stock alerts
- **Data Tracked:**
  - Peptide inventory
  - Quantities
  - Vendors
  - Batch numbers
  - Expiration dates
  - Documentation files
  - Stock events

#### 5. **Orders** (`/app/orders`)
- **Features:**
  - Domestic/International/Group Buy tabs
  - Order tracking
  - Status management (Processing → Shipped → Delivered)
  - Tracking number integration
  - Order details modal
  - Documentation sync to stockpile
  - Order search
  - Auto-sync from tracking data
- **Data Tracked:**
  - Order details
  - Shipping dates
  - Delivery dates
  - Tracking numbers
  - Order status
  - Costs
  - Vendor information

#### 6. **Vendors** (`/app/vendors`)
- **Features:**
  - Domestic/International/Group Buy organization
  - Vendor profiles
  - Contact information
  - Payment methods
  - Shipping preferences
  - Vendor ratings
  - Order history per vendor
  - Vendor search
- **Data Tracked:**
  - Vendor details
  - Contact info
  - Payment preferences
  - Shipping methods
  - Vendor ratings
  - Order relationships

#### 7. **Goals** (`/app/goals`)
- **Features:**
  - Goal creation/editing
  - Goal progress tracking
  - Goal completion status
  - Goal categories
- **Data Tracked:**
  - Goal definitions
  - Progress updates
  - Completion dates

#### 8. **Badges** (`/app/badges`)
- **Features:**
  - Achievement tracking
  - Badge progress
  - Badge categories
  - Unlock conditions
- **Data Tracked:**
  - Badge progress
  - Achievement status
  - Unlock dates

#### 9. **Settings** (`/app/settings`)
- **Features:**
  - Appearance settings
  - Notification preferences
  - Privacy settings
  - Data management
  - Legal documents
  - Regional preferences
- **Data Tracked:**
  - User preferences
  - Notification settings
  - Theme preferences

#### 10. **Account** (`/app/account`)
- **Features:**
  - Profile management
  - Subscription management
  - Security settings
  - Legal agreements
- **Data Tracked:**
  - User profile
  - Subscription status
  - Security preferences

---

## 📈 Analytics & Statistics Available

### **Compliance Analytics**
- Supplement compliance percentage (last 7 days)
- Compliance streaks
- Task completion rates

### **Spending Analytics**
- Monthly spending trends
- Total spending
- Spending by vendor
- Spending by peptide type

### **Inventory Analytics**
- Low stock alerts
- Expiration date tracking
- Stock levels
- Inventory value

### **Order Analytics**
- Average delivery lead time
- Vendor performance (lead time, on-time delivery)
- Order status distribution
- Delivery trends

### **Protocol Analytics**
- Active protocol count
- Protocol completion rates
- Protocol duration tracking
- Protocol history statistics

### **Vendor Analytics**
- Vendor ratings
- Vendor order counts
- Vendor performance metrics
- Preferred vendors

---

## 🎯 Gap Analysis: Features Not Widgetized

### **High Priority Gaps**

#### 1. **Calendar Integration**
- ❌ **Upcoming Calendar Events Widget** - Show next 3-7 days of scheduled tasks
- ❌ **Today's Schedule Widget** - Compact view of today's AM/PM tasks
- ❌ **Calendar Notes Widget** - Recent calendar notes/observations
- ❌ **Protocol Timeline Widget** - Visual timeline of active protocols

#### 2. **Protocol Management**
- ❌ **Active Protocols Summary Widget** - Quick overview of active protocols
- ❌ **Protocol Progress Widget** - Progress bars for active protocols
- ❌ **Protocol History Widget** - Recent protocol completions
- ❌ **Upcoming Protocol Milestones Widget** - Important dates (end dates, washout periods)

#### 3. **Reconstitution**
- ❌ **Recent Reconstitutions Widget** - Last 3-5 reconstituted items
- ❌ **Reconstitution Calculator Widget** - Quick calculator access
- ❌ **Expiring Reconstituted Items Widget** - Items approaching expiration

#### 4. **Stockpile Management**
- ❌ **Expiring Items Widget** - Items expiring soon
- ❌ **Recent Stockpile Additions Widget** - Recently added items
- ❌ **Stockpile Value Widget** - Total inventory value
- ❌ **Stockpile Statistics Widget** - Total items, total vials, etc.

#### 5. **Order Management**
- ❌ **Order Status Summary Widget** - Count of orders by status
- ❌ **Recent Orders Widget** - Last 3-5 orders
- ❌ **Tracking Updates Widget** - Orders with recent tracking updates

#### 6. **Vendor Management**
- ❌ **Top Vendors Widget** - Most used vendors
- ❌ **Vendor Performance Widget** - Vendor ratings and stats
- ❌ **Recent Vendor Activity Widget** - Recent orders by vendor

#### 7. **Analytics & Insights**
- ❌ **Weekly Summary Widget** - Week-over-week statistics
- ❌ **Research Streak Widget** - Current compliance streak
- ❌ **Monthly Goals Progress Widget** - Progress toward monthly goals
- ❌ **Peptide Usage Stats Widget** - Most used peptides

#### 8. **Quick Access & Tools**
- ❌ **Recent Activity Widget** - Recent actions across the app
- ❌ **Quick Calculator Widget** - Quick recon calculator
- ❌ **Search Widget** - Quick search across all data

---

## 💡 Suggested New Widgets

### **Priority 1: High-Value, Quick Wins**

#### 1. **Today's Schedule Widget** ⭐
- **Type:** `today_schedule`
- **Size:** Medium (2x1) or Large (2x2)
- **Description:** Compact view of today's scheduled tasks (AM/PM slots)
- **Features:**
  - Show today's peptides and supplements
  - Time-based grouping (AM/PM)
  - Quick completion toggle
  - Link to full calendar
- **Data Source:** Calendar scheduled data, task completion status
- **Settings:**
  - Show completed tasks (boolean)
  - Group by time slot (boolean)

#### 2. **Active Protocols Summary Widget** ⭐
- **Type:** `active_protocols_summary`
- **Size:** Medium (2x1) or Large (2x2)
- **Description:** Quick overview of all active protocols
- **Features:**
  - List of active protocols
  - Progress indicators
  - Days remaining
  - Quick access to protocol details
- **Data Source:** Protocols (active = true)
- **Settings:**
  - Max protocols to show (number, 3-10)
  - Show progress bars (boolean)

#### 3. **Expiring Items Widget** ⭐
- **Type:** `expiring_items`
- **Size:** Small (1x1) or Medium (2x1)
- **Description:** Alerts for items expiring soon
- **Features:**
  - List items expiring in next 30 days
  - Days until expiration
  - Color-coded urgency (red/yellow/green)
  - Link to stockpile
- **Data Source:** Stockpile items with expiration dates
- **Settings:**
  - Days ahead to show (number, default: 30)
  - Max items to show (number, default: 5)

#### 4. **Recent Reconstitutions Widget**
- **Type:** `recent_reconstitutions`
- **Size:** Medium (2x1)
- **Description:** Show last 3-5 reconstituted items
- **Features:**
  - Peptide name
  - Reconstitution date
  - Quick access to recon details
- **Data Source:** Recon history
- **Settings:**
  - Max items to show (number, 3-10)

#### 5. **Order Status Summary Widget**
- **Type:** `order_status_summary`
- **Size:** Small (1x1) or Medium (2x1)
- **Description:** Count of orders by status
- **Features:**
  - Processing count
  - Shipped count
  - Delivered count
  - Visual indicators (icons/colors)
- **Data Source:** Orders
- **Settings:**
  - Show counts (boolean)
  - Show icons (boolean)

### **Priority 2: Enhanced Analytics & Insights**

#### 6. **Research Streak Widget**
- **Type:** `research_streak`
- **Size:** Small (1x1)
- **Description:** Current compliance streak
- **Features:**
  - Current streak count
  - Streak type (daily/weekly)
  - Visual flame/icon
  - Best streak record
- **Data Source:** Compliance calculations
- **Settings:**
  - Streak type (daily/weekly)

#### 7. **Weekly Summary Widget**
- **Type:** `weekly_summary`
- **Size:** Medium (2x1) or Large (2x2)
- **Description:** Week-over-week statistics
- **Features:**
  - Tasks completed this week
  - Protocols active
  - Orders received
  - Comparison to last week
- **Data Source:** Calendar, protocols, orders
- **Settings:**
  - Show comparison (boolean)

#### 8. **Top Vendors Widget**
- **Type:** `top_vendors`
- **Size:** Medium (2x1)
- **Description:** Most used vendors
- **Features:**
  - Top 3-5 vendors by order count
  - Vendor ratings
  - Quick access to vendor details
- **Data Source:** Vendors, orders
- **Settings:**
  - Max vendors to show (number, 3-5)
  - Sort by (orders/rating)

#### 9. **Protocol Progress Widget**
- **Type:** `protocol_progress`
- **Size:** Medium (2x1) or Large (2x2)
- **Description:** Progress bars for active protocols
- **Features:**
  - Visual progress bars
  - Days completed / total days
  - Percentage complete
  - Protocol names
- **Data Source:** Active protocols, start dates, durations
- **Settings:**
  - Max protocols to show (number, 3-5)
  - Show percentages (boolean)

#### 10. **Stockpile Value Widget**
- **Type:** `stockpile_value`
- **Size:** Small (1x1)
- **Description:** Total inventory value
- **Features:**
  - Total value calculation
  - Item count
  - Vial count
  - Currency formatting
- **Data Source:** Stockpile items (cost × quantity)
- **Settings:**
  - Currency symbol (string)

### **Priority 3: Quick Access & Tools**

#### 11. **Quick Calculator Widget**
- **Type:** `quick_calculator`
- **Size:** Medium (2x1) or Large (2x2)
- **Description:** Quick reconstitution calculator
- **Features:**
  - Simplified calculator interface
  - Pre-fill from stockpile
  - Save to recon list
- **Data Source:** Stockpile (for pre-fill)
- **Settings:**
  - Show pre-fill options (boolean)

#### 12. **Recent Activity Widget**
- **Type:** `recent_activity`
- **Size:** Medium (2x1) or Large (2x2)
- **Description:** Recent actions across the app
- **Features:**
  - Last 5-10 actions
  - Action types (order added, protocol started, etc.)
  - Timestamps
  - Links to relevant pages
- **Data Source:** Activity log (would need to be implemented)
- **Settings:**
  - Max items to show (number, 5-10)
  - Activity types to show (multi-select)

#### 13. **Upcoming Milestones Widget**
- **Type:** `upcoming_milestones`
- **Size:** Medium (2x1)
- **Description:** Important upcoming dates
- **Features:**
  - Protocol end dates
  - Washout period starts
  - Expiration dates
  - Order delivery dates
- **Data Source:** Protocols, stockpile, orders
- **Settings:**
  - Days ahead to show (number, default: 14)
  - Max items to show (number, default: 5)

#### 14. **Protocol History Widget**
- **Type:** `protocol_history`
- **Size:** Medium (2x1) or Large (2x2)
- **Description:** Recent protocol completions
- **Features:**
  - Last 3-5 completed protocols
  - Completion dates
  - Completion status
  - Link to history details
- **Data Source:** Protocol history
- **Settings:**
  - Max items to show (number, 3-5)
  - Show completion status (boolean)

#### 15. **Tracking Updates Widget**
- **Type:** `tracking_updates`
- **Size:** Medium (2x1)
- **Description:** Orders with recent tracking updates
- **Features:**
  - Orders with new tracking info
  - Status changes
  - Delivery updates
  - Link to order details
- **Data Source:** Orders with tracking numbers
- **Settings:**
  - Max items to show (number, 3-5)
  - Show only status changes (boolean)

---

## 🎨 Widget Design Considerations

### **Widget Size Guidelines**
- **Small (1x1):** Single metric, simple status, quick info
- **Medium (2x1):** Lists, summaries, moderate detail
- **Tall (1x2):** Vertical lists, detailed single-item views
- **Large (2x2):** Rich content, multiple metrics, charts
- **Wide (3x1):** Horizontal lists, timelines
- **Full (4x2):** Full-featured widgets, complex interfaces

### **Widget Interaction Patterns**
- **Click to expand:** Small widgets that open modals
- **Inline actions:** Buttons within widgets for quick actions
- **Link to full page:** "View all" links to full feature pages
- **Real-time updates:** Widgets that refresh automatically

### **Data Refresh Strategies**
- **On-demand:** Refresh when widget becomes visible
- **Periodic:** Refresh every X minutes
- **Event-driven:** Refresh on data changes
- **Manual:** User-triggered refresh button

---

## 📊 Implementation Priority Matrix

### **High Impact, Low Effort** (Quick Wins)
1. ✅ Today's Schedule Widget
2. ✅ Active Protocols Summary Widget
3. ✅ Expiring Items Widget
4. ✅ Order Status Summary Widget
5. ✅ Recent Reconstitutions Widget

### **High Impact, Medium Effort** (High Value)
6. ✅ Research Streak Widget
7. ✅ Protocol Progress Widget
8. ✅ Top Vendors Widget
9. ✅ Stockpile Value Widget
10. ✅ Upcoming Milestones Widget

### **Medium Impact, Low Effort** (Nice to Have)
11. ✅ Quick Calculator Widget
12. ✅ Protocol History Widget
13. ✅ Tracking Updates Widget

### **Medium Impact, Medium Effort** (Future Enhancements)
14. ✅ Weekly Summary Widget
15. ✅ Recent Activity Widget (requires activity log system)

---

## 🔧 Technical Implementation Notes

### **Data Access Patterns**
- Most widgets can use existing `useAppContext()` hooks
- Calendar data may need new utility functions
- Activity log would require new tracking system

### **Widget Factory Integration**
- Add new widget types to `WIDGET_TYPES` in `dashboardCustomization.js`
- Add metadata to `WIDGET_METADATA`
- Create widget component in `src/components/dashboard/widgets/`
- Register in `WidgetFactory.jsx`

### **Performance Considerations**
- Lazy load widget data
- Cache calculations (compliance, streaks, etc.)
- Debounce refresh operations
- Virtualize long lists

### **Accessibility**
- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management

---

## 📝 Summary

### **Current State**
- **23 widgets** available
- **10 major feature pages** with rich functionality
- **Good coverage** of core features (tasks, orders, inventory, goals, metrics)

### **Gaps Identified**
- **Calendar integration** - Limited widget coverage
- **Protocol management** - Missing summary/progress widgets
- **Reconstitution** - No quick access widgets
- **Analytics** - Missing streak and summary widgets
- **Quick tools** - No calculator or search widgets

### **Recommended Next Steps**
1. **Phase 1:** Implement Priority 1 widgets (5 widgets)
2. **Phase 2:** Implement Priority 2 widgets (5 widgets)
3. **Phase 3:** Implement Priority 3 widgets (5 widgets)
4. **Phase 4:** Evaluate user feedback and iterate

### **Expected Impact**
- **Improved dashboard utility** - More actionable information at a glance
- **Reduced navigation** - Quick access to common tasks
- **Better insights** - Analytics and progress tracking
- **Enhanced user engagement** - More interactive dashboard experience

---

*Last Updated: [Current Date]*
*Audit Version: 1.0*

