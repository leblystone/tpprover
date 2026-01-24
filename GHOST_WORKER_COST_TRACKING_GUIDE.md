# 💰 Ghost Worker Cost Tracking Guide

## Overview

Every time Ghost Worker processes a ticket, it logs detailed cost information to the `ai_worker_logs` collection in Firestore. This guide shows you how to query and analyze your AI costs.

---

## 📊 Collection: `ai_worker_logs`

### Document Structure

```javascript
{
  // Ticket Info
  ticketId: "abc123",
  ticketNumber: "Z005",
  ticketType: "bug",
  timestamp: Timestamp(2026-01-21 10:30:00),
  
  // Triage Phase (Always Gemini Flash)
  triageModel: "gemini-2.0-flash-exp",
  triageTokensTotal: 450,
  triageCostPer1M: 0.075,        // $0.075 per 1M tokens
  triageCost: 0.000034,          // $0.000034 for this ticket
  triageBilledTo: "Google Cloud (Gemini)",
  
  // Routing Decision
  route: "gemini-pro",
  confidence: 92,
  reasoning: "Simple UI text change",
  complexity: "low",
  urgency: "medium",
  
  // Execution Phase (Gemini Pro or Claude)
  executionModel: "gemini-1.5-pro",
  executionTokensTotal: 2847,
  executionCostPer1M: 1.25,      // $1.25 per 1M tokens
  executionCost: 0.003559,       // $0.003559 for this ticket
  executionBilledTo: "Google Cloud (Gemini)",
  
  // Total Cost
  totalTokens: 3297,
  totalCost: 0.003593,           // $0.003593 total
  
  // Billing Breakdown
  billingBreakdown: {
    googleCloud: 0.003593,       // All costs went to Google
    anthropic: 0                 // $0 to Anthropic (used Gemini)
  },
  
  // Response Info
  responseGenerated: true,
  responsePosted: true,
  responseLength: 1247
}
```

---

## 🔍 Query Examples

### 1. Total Costs This Month

```javascript
import { collection, query, where, getDocs } from 'firebase/firestore';

async function getTotalCostsThisMonth() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const logsRef = collection(db, 'ai_worker_logs');
  const q = query(
    logsRef,
    where('timestamp', '>=', startOfMonth),
    where('timestamp', '<=', endOfMonth)
  );
  
  const snapshot = await getDocs(q);
  
  let totalCost = 0;
  let googleCloudCost = 0;
  let anthropicCost = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    totalCost += data.totalCost || 0;
    googleCloudCost += data.billingBreakdown?.googleCloud || 0;
    anthropicCost += data.billingBreakdown?.anthropic || 0;
  });
  
  return {
    totalCost: `$${totalCost.toFixed(4)}`,
    googleCloudCost: `$${googleCloudCost.toFixed(4)}`,
    anthropicCost: `$${anthropicCost.toFixed(4)}`,
    ticketCount: snapshot.size,
    avgCostPerTicket: `$${(totalCost / snapshot.size).toFixed(4)}`
  };
}

// Usage
const costs = await getTotalCostsThisMonth();
console.log(costs);
// {
//   totalCost: "$0.2847",
//   googleCloudCost: "$0.1624",
//   anthropicCost: "$0.1223",
//   ticketCount: 42,
//   avgCostPerTicket: "$0.0068"
// }
```

---

### 2. Cost Breakdown by Model

```javascript
async function getCostsByModel() {
  const logsRef = collection(db, 'ai_worker_logs');
  const snapshot = await getDocs(logsRef);
  
  const modelCosts = {
    'gemini-2.0-flash-exp': 0,
    'gemini-1.5-pro': 0,
    'claude-sonnet-4': 0
  };
  
  const modelTickets = {
    'gemini-1.5-pro': 0,
    'claude-sonnet-4': 0
  };
  
  snapshot.forEach(doc => {
    const data = doc.data();
    
    // Triage cost (always Gemini Flash)
    modelCosts['gemini-2.0-flash-exp'] += data.triageCost || 0;
    
    // Execution cost
    const execModel = data.executionModel;
    if (execModel) {
      modelCosts[execModel] += data.executionCost || 0;
      modelTickets[execModel]++;
    }
  });
  
  return {
    costs: {
      geminiFlash: `$${modelCosts['gemini-2.0-flash-exp'].toFixed(4)}`,
      geminiPro: `$${modelCosts['gemini-1.5-pro'].toFixed(4)}`,
      claudeSonnet: `$${modelCosts['claude-sonnet-4'].toFixed(4)}`
    },
    tickets: {
      geminiPro: modelTickets['gemini-1.5-pro'],
      claudeSonnet: modelTickets['claude-sonnet-4']
    }
  };
}

// Usage
const modelBreakdown = await getCostsByModel();
console.log(modelBreakdown);
// {
//   costs: {
//     geminiFlash: "$0.0042",
//     geminiPro: "$0.1782",
//     claudeSonnet: "$0.1223"
//   },
//   tickets: {
//     geminiPro: 28,
//     claudeSonnet: 14
//   }
// }
```

---

### 3. Most Expensive Tickets

```javascript
async function getMostExpensiveTickets(limit = 10) {
  const logsRef = collection(db, 'ai_worker_logs');
  const snapshot = await getDocs(logsRef);
  
  const tickets = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    tickets.push({
      ticketNumber: data.ticketNumber,
      ticketType: data.ticketType,
      cost: data.totalCost,
      model: data.executionModel,
      route: data.route,
      timestamp: data.timestamp
    });
  });
  
  // Sort by cost descending
  tickets.sort((a, b) => b.cost - a.cost);
  
  return tickets.slice(0, limit).map(t => ({
    ...t,
    cost: `$${t.cost.toFixed(4)}`
  }));
}

// Usage
const expensive = await getMostExpensiveTickets(5);
console.log(expensive);
// [
//   { ticketNumber: "Z023", cost: "$0.0184", model: "claude-sonnet-4", ... },
//   { ticketNumber: "Z018", cost: "$0.0156", model: "claude-sonnet-4", ... },
//   { ticketNumber: "Z012", cost: "$0.0089", model: "gemini-1.5-pro", ... },
//   ...
// ]
```

---

### 4. Daily Cost Report

```javascript
async function getDailyCosts(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const logsRef = collection(db, 'ai_worker_logs');
  const q = query(
    logsRef,
    where('timestamp', '>=', startOfDay),
    where('timestamp', '<=', endOfDay)
  );
  
  const snapshot = await getDocs(q);
  
  let totalCost = 0;
  let geminiProTickets = 0;
  let claudeTickets = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    totalCost += data.totalCost || 0;
    
    if (data.route === 'gemini-pro') {
      geminiProTickets++;
    } else if (data.route === 'claude-sonnet') {
      claudeTickets++;
    }
  });
  
  return {
    date: date.toISOString().split('T')[0],
    totalCost: `$${totalCost.toFixed(4)}`,
    ticketsProcessed: snapshot.size,
    routeBreakdown: {
      geminiPro: geminiProTickets,
      claudeSonnet: claudeTickets
    },
    avgCostPerTicket: snapshot.size > 0 
      ? `$${(totalCost / snapshot.size).toFixed(4)}` 
      : '$0.0000'
  };
}

// Usage
const today = await getDailyCosts(new Date());
console.log(today);
// {
//   date: "2026-01-21",
//   totalCost: "$0.0847",
//   ticketsProcessed: 12,
//   routeBreakdown: { geminiPro: 8, claudeSonnet: 4 },
//   avgCostPerTicket: "$0.0071"
// }
```

---

### 5. Verify Billing Matches API Provider

```javascript
async function verifyBillingAccounts() {
  const logsRef = collection(db, 'ai_worker_logs');
  const snapshot = await getDocs(logsRef);
  
  let googleCloudTotal = 0;
  let anthropicTotal = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    googleCloudTotal += data.billingBreakdown?.googleCloud || 0;
    anthropicTotal += data.billingBreakdown?.anthropic || 0;
  });
  
  return {
    googleCloud: {
      totalCost: `$${googleCloudTotal.toFixed(4)}`,
      checkAgainst: 'Google Cloud Console → Generative AI API'
    },
    anthropic: {
      totalCost: `$${anthropicTotal.toFixed(4)}`,
      checkAgainst: 'Anthropic Console → Usage Dashboard'
    },
    combined: `$${(googleCloudTotal + anthropicTotal).toFixed(4)}`
  };
}

// Usage
const billing = await verifyBillingAccounts();
console.log(billing);
// {
//   googleCloud: {
//     totalCost: "$0.1624",
//     checkAgainst: "Google Cloud Console → Generative AI API"
//   },
//   anthropic: {
//     totalCost: "$0.1223",
//     checkAgainst: "Anthropic Console → Usage Dashboard"
//   },
//   combined: "$0.2847"
// }
```

---

## 📈 Admin Dashboard Integration

Add these queries to your Ghost Worker Dashboard:

```jsx
// In GhostWorkerDashboard.jsx

const [monthlyCosts, setMonthlyCosts] = useState(null);

useEffect(() => {
  const loadMonthlyCosts = async () => {
    const costs = await getTotalCostsThisMonth();
    setMonthlyCosts(costs);
  };
  
  loadMonthlyCosts();
}, []);

// Then display in UI:
<div className="bg-white rounded-lg shadow p-6">
  <h3 className="text-lg font-semibold mb-4">This Month's AI Costs</h3>
  <div className="space-y-2">
    <div className="flex justify-between">
      <span>Total Cost:</span>
      <span className="font-bold">{monthlyCosts?.totalCost}</span>
    </div>
    <div className="flex justify-between text-sm text-gray-600">
      <span>Google Cloud (Gemini):</span>
      <span>{monthlyCosts?.googleCloudCost}</span>
    </div>
    <div className="flex justify-between text-sm text-gray-600">
      <span>Anthropic (Claude):</span>
      <span>{monthlyCosts?.anthropicCost}</span>
    </div>
    <div className="flex justify-between text-sm text-gray-500">
      <span>Avg per Ticket:</span>
      <span>{monthlyCosts?.avgCostPerTicket}</span>
    </div>
  </div>
</div>
```

---

## 🚨 Cost Alerts

Set up automatic alerts when costs exceed a threshold:

```javascript
// functions/costAlerts.js

const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const emailService = require('./emailService');

exports.checkDailyCostLimit = onSchedule(
  {
    schedule: 'every day 23:00',
    timeZone: 'America/New_York'
  },
  async (event) => {
    const db = admin.firestore();
    
    // Get today's costs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const logsRef = db.collection('ai_worker_logs');
    const q = logsRef.where('timestamp', '>=', today);
    const snapshot = await q.get();
    
    let totalCost = 0;
    snapshot.forEach(doc => {
      totalCost += doc.data().totalCost || 0;
    });
    
    // Alert if over $1 per day
    const DAILY_LIMIT = 1.00;
    
    if (totalCost > DAILY_LIMIT) {
      await emailService.sendEmail(
        'admin@thepepplanner.com',
        '⚠️ Ghost Worker Cost Alert',
        `
          <h2>Daily Cost Limit Exceeded</h2>
          <p>Ghost Worker AI costs exceeded the daily limit.</p>
          <ul>
            <li>Today's cost: $${totalCost.toFixed(4)}</li>
            <li>Limit: $${DAILY_LIMIT.toFixed(2)}</li>
            <li>Tickets processed: ${snapshot.size}</li>
          </ul>
          <p>Review the ai_worker_logs collection for details.</p>
        `
      );
    }
  }
);
```

---

## 📊 Export to CSV

Export all costs for external analysis:

```javascript
async function exportCostsToCSV(startDate, endDate) {
  const logsRef = collection(db, 'ai_worker_logs');
  const q = query(
    logsRef,
    where('timestamp', '>=', startDate),
    where('timestamp', '<=', endDate)
  );
  
  const snapshot = await getDocs(q);
  
  let csv = 'Ticket,Date,Type,Route,Model,Tokens,Cost,Billed To\n';
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const date = data.timestamp.toDate().toISOString().split('T')[0];
    
    csv += `${data.ticketNumber},${date},${data.ticketType},${data.route},${data.executionModel},${data.totalTokens},${data.totalCost},${data.executionBilledTo}\n`;
  });
  
  return csv;
}

// Usage
const csv = await exportCostsToCSV(
  new Date('2026-01-01'),
  new Date('2026-01-31')
);

// Download as file
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'ghost-worker-costs-jan-2026.csv';
a.click();
```

---

## 🎯 Budget Planning

### Estimate Monthly Costs

Based on your expected ticket volume:

```javascript
function estimateMonthlyBudget(ticketsPerMonth, geminiProRatio = 0.7) {
  // Average costs per ticket
  const COST_PER_GEMINI_TICKET = 0.005;  // $0.005
  const COST_PER_CLAUDE_TICKET = 0.015;  // $0.015
  
  const geminiProTickets = Math.round(ticketsPerMonth * geminiProRatio);
  const claudeTickets = ticketsPerMonth - geminiProTickets;
  
  const geminiCost = geminiProTickets * COST_PER_GEMINI_TICKET;
  const claudeCost = claudeTickets * COST_PER_CLAUDE_TICKET;
  
  return {
    tickets: {
      total: ticketsPerMonth,
      geminiPro: geminiProTickets,
      claudeSonnet: claudeTickets
    },
    costs: {
      geminiPro: `$${geminiCost.toFixed(2)}`,
      claudeSonnet: `$${claudeCost.toFixed(2)}`,
      total: `$${(geminiCost + claudeCost).toFixed(2)}`
    },
    savingsVsHuman: {
      humanCost: `$${(ticketsPerMonth * 5).toFixed(2)}`,  // $5 per ticket
      aiCost: `$${(geminiCost + claudeCost).toFixed(2)}`,
      savings: `$${((ticketsPerMonth * 5) - (geminiCost + claudeCost)).toFixed(2)}`
    }
  };
}

// Usage
const budget = estimateMonthlyBudget(100);
console.log(budget);
// {
//   tickets: { total: 100, geminiPro: 70, claudeSonnet: 30 },
//   costs: { geminiPro: "$0.35", claudeSonnet: "$0.45", total: "$0.80" },
//   savingsVsHuman: { 
//     humanCost: "$500.00", 
//     aiCost: "$0.80", 
//     savings: "$499.20" 
//   }
// }
```

---

## 🔗 Verify Against Provider Invoices

### Google Cloud

1. Go to https://console.cloud.google.com/billing
2. Navigate to your project
3. Find "Generative Language API" charges
4. Compare to your `ai_worker_logs` sum for `googleCloud`

### Anthropic

1. Go to https://console.anthropic.com/settings/billing
2. View usage details
3. Compare to your `ai_worker_logs` sum for `anthropic`

**They should match exactly!**

---

## 📝 Summary

The `ai_worker_logs` collection gives you:

- ✅ **Real-time cost tracking** (per ticket)
- ✅ **Model-level breakdown** (which AI you used)
- ✅ **Billing account separation** (Google vs Anthropic)
- ✅ **Full audit trail** (every API call logged)
- ✅ **Budget forecasting** (plan ahead)
- ✅ **ROI calculation** (savings vs human support)

**You control everything.** No hidden costs, no surprises. 🎯
