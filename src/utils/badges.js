import { useMemo, useState, useEffect } from 'react';
import { checkLifetimeAccessFirestore } from '../services/firebase';

// Define all beta testing periods
// To add a new beta period for future testing rounds, simply add a new object to this array:
// {
//   name: 'Beta Round X',
//   startDate: new Date('YYYY-MM-DDTHH:mm:ssZ'), // UTC timestamp
//   endDate: new Date('YYYY-MM-DDTHH:mm:ssZ')    // UTC timestamp
// }
const BETA_PERIODS = [
  {
    name: 'Beta Round 1',
    startDate: new Date('2024-09-10T00:00:00Z'), // September 10th, 2024
    endDate: new Date('2024-09-18T00:00:00Z')    // September 17th, 2024 (end of day)
  }
  // Future beta rounds will be added here automatically
  // Example for Beta Round 2:
  // {
  //   name: 'Beta Round 2', 
  //   startDate: new Date('2024-12-01T00:00:00Z'),
  //   endDate: new Date('2024-12-15T00:00:00Z')
  // }
];

// Check if a user signed up during any beta testing period
function isBetaTester(userCreatedAt) {
  if (!userCreatedAt) return false;
  
  const createdDate = new Date(userCreatedAt);
  
  // Check if user signed up during any beta period
  return BETA_PERIODS.some(period => {
    return createdDate >= period.startDate && createdDate <= period.endDate;
  });
}

// Utility function to add new beta periods (for future use)
export function addBetaPeriod(name, startDate, endDate) {
  BETA_PERIODS.push({
    name,
    startDate: new Date(startDate),
    endDate: new Date(endDate)
  });
}

// Get all current beta periods (for admin reference)
export function getBetaPeriods() {
  return [...BETA_PERIODS];
}

export function useBadgeStats() {
    // State to track Firestore beta tester status
    const [firestoreBetaTester, setFirestoreBetaTester] = useState(null);

    // Sync beta tester status from Firestore
    useEffect(() => {
        const syncBetaTesterFromFirestore = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('tpprover_user') || '{}');
                if (!user?.uid) return;

                // Check Firestore for beta tester status
                const lifetimeAccess = await checkLifetimeAccessFirestore(user.uid);
                const isBetaTesterInFirestore = lifetimeAccess?.metadata?.isBetaTester === true || 
                                                (lifetimeAccess?.reason && lifetimeAccess.reason.toLowerCase().includes('beta'));
                
                if (isBetaTesterInFirestore) {
                    // Sync to localStorage for badge logic
                    localStorage.setItem('tpprover_is_tester', 'true');
                    setFirestoreBetaTester(true);
                    console.log('✅ Beta tester badge synced from Firestore');
                } else {
                    setFirestoreBetaTester(false);
                }
            } catch (error) {
                console.error('Error syncing beta tester status from Firestore:', error);
                setFirestoreBetaTester(false);
            }
        };

        syncBetaTesterFromFirestore();
    }, []);

    const allBadges = useMemo(() => {
    return [
      // Core
      { category: 'Core', name: 'First Delivery', description: 'Receive your first delivered order.', check: (s) => s.delivered >= 1, progress: s => s.delivered / 1 },
      { category: 'Core', name: 'Protocol Planner', description: 'Create at least 3 active research protocols.', check: (s) => s.activeProtocols >= 3, progress: s => s.activeProtocols / 3 },
      { category: 'Core', name: 'Well Stocked', description: 'Have no items marked as low stock.', check: (s) => s.stockpile.length > 0 && s.lowStock === 0, progress: s => (s.stockpile.length > 0 && s.lowStock === 0) ? 1 : 0 },
      { category: 'Core', name: 'Supplement Scholar', description: 'Track at least 5 different supplements.', check: (s) => s.supplementCount >= 5, progress: s => s.supplementCount / 5 },
      { category: 'Core', name: 'Archivist', description: 'Log over 50 items in your stockpile.', check: s => s.stockpile.length >= 50, progress: s => s.stockpile.length / 50 },
      { category: 'Core', name: 'Globetrotter', description: 'Make at least 5 international orders.', check: s => s.internationalOrders >= 5, progress: s => s.internationalOrders / 5 },
      
      // Community
      { category: 'Community', name: 'Community Pillar', description: 'Participate in 3+ group buys.', check: s => s.groupBuys >= 3, progress: s => s.groupBuys / 3 },
      { category: 'Community', name: 'Vendor Scout', description: 'Add 5+ new vendors.', check: s => s.vendors.length >= 5, progress: s => s.vendors.length / 5 },
      { category: 'Community', name: 'The Alchemist', description: 'Create and share 3+ protocol stacks.', check: s => s.stacks >= 3, progress: s => s.stacks / 3 },

      // Streaks
      { category: 'Streaks', name: 'Lab Rat', description: 'Log research for 30 consecutive days.', check: s => s.streak >= 30, progress: s => s.streak / 30 },
      { category: 'Streaks', name: 'Streak I – The Apprentice', description: 'Maintain a 7-day perfect compliance streak.', check: (s) => s.streak >= 7, progress: s => s.streak / 7 },
      { category: 'Streaks', name: 'Streak II – The Vector', description: 'Maintain a 14-day perfect compliance streak.', check: (s) => s.streak >= 14, progress: s => s.streak / 14 },
      { category: 'Streaks', name: 'Streak III – The Artisan', description: 'Maintain a 30-day perfect compliance streak.', check: (s) => s.streak >= 30, progress: s => s.streak / 30 },
      { category: 'Streaks', name: 'Streak IV – The Progenitor', description: 'Maintain a 90-day perfect compliance streak.', check: (s) => s.streak >= 90, progress: s => s.streak / 90 },
      { category: 'Streaks', name: 'Streak V – The Axiom', description: 'Maintain a 180-day perfect compliance streak.', check: (s) => s.streak >= 180, progress: s => s.streak / 180 },
      
      // Milestones
      { category: 'Milestones', name: 'The Homeostat', description: 'Spend over $2,500 on research supplies.', check: (s) => s.totalSpend >= 2500, progress: s => s.totalSpend / 2500 },
      { category: 'Milestones', name: 'The Investor', description: 'Spend over $5,000 on research supplies.', check: (s) => s.totalSpend >= 5000, progress: s => s.totalSpend / 5000 },
      { category: 'Milestones', name: 'Centurion', description: 'Complete 100 total orders.', check: s => s.delivered >= 100, progress: s => s.delivered / 100 },
      { category: 'Milestones', name: 'Veteran Researcher', description: 'One year of app usage from account creation.', check: s => s.accountAgeDays >= 365, progress: s => s.accountAgeDays / 365 },

      // Program
      { category: 'Program', name: 'The Catalyst', description: 'An early supporter who helped shape the app.', check: (s) => s.isBetaTester, progress: s => s.isBetaTester ? 1 : 0 },
      { category: 'Program', name: 'The Founders Circle', description: 'Be one of the first 100 users.', check: (s) => s.isFounder, progress: s => s.isFounder ? 1 : 0 }
    ];
    }, []);

    const stats = useMemo(() => {
        const protocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]')
        const orders = JSON.parse(localStorage.getItem('tpprover_orders') || '[]')
        const stockpile = JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]')
        const supplements = JSON.parse(localStorage.getItem('tpprover_supplements') || '[]')
        const suppDone = JSON.parse(localStorage.getItem('tpprover_supp_completions') || '{}')
        const vendors = JSON.parse(localStorage.getItem('tpprover_vendors') || '[]')
        const stacks = JSON.parse(localStorage.getItem('tpprover_stacks') || '[]').length
        const user = JSON.parse(localStorage.getItem('tpprover_user') || '{}')
        
        // Legacy tester flag (for existing beta testers)
        const legacyTester = (() => { try { const v = localStorage.getItem('tpprover_is_tester'); return v === '1' || v === 'true' } catch { return false } })()
        
        // Check if user is a beta tester based on signup date during beta periods
        const isBetaTesterByDate = isBetaTester(user.createdAt)
        
        // Include Firestore beta tester status
        // Priority: Firestore true > localStorage/date checks > Firestore false
        // If Firestore explicitly says true, grant badge
        // Otherwise, fall back to localStorage/date checks (for legacy users or during Firestore check)
        const isBetaTesterFinal = firestoreBetaTester === true || 
                                  (firestoreBetaTester !== true && (legacyTester || isBetaTesterByDate))
        
        const isFounder = (() => { try { const v = localStorage.getItem('tpprover_is_founder'); return v === '1' || v === 'true' } catch { return false } })()
        
        const delivered = orders.filter(o => o.status === 'Delivered').length
        const internationalOrders = orders.filter(o => o.category === 'international').length
        const groupBuys = orders.filter(o => (o.category === 'group' || o.category === 'groupbuy' || o.type === 'group' || o.type === 'groupbuy')).length
        const activeProtocols = protocols.filter(p => p.active !== false).length
        const lowStock = stockpile.filter(s => Number(s.quantity) <= 1).length
        const supplementCount = supplements.length
        const totalSpend = orders.reduce((acc, o) => {
          // Handle new order structure with items array
          if (o.items && o.items.length > 0) {
            const itemsCost = o.items.reduce((sum, item) => {
              const price = parseFloat(item.price) || 0;
              const quantity = parseInt(item.quantity, 10) || 1;
              return sum + (price * quantity);
            }, 0);
            
            // Check if shipping costs should be included
            const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
            const includeShipping = settings.orders?.includeShippingInCosts ?? true;
            const shippingCost = includeShipping ? (parseFloat(o.shippingCost) || 0) : 0;
            
            return acc + itemsCost + shippingCost;
          }
          // Fallback for old order structure
          return acc + (Number(String(o.cost).replace(/[^0-9.]/g,'')) || 0);
        }, 0)
        
        let streak = 0;
        for (let i = 0; i < 180; i++) {
            const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
            const weekday = new Date(day).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            let planned = 0, done = 0;
            for (const s of supplements) {
                if (!s.days?.includes(weekday)) continue;
                if (s.schedule === 'AM') { planned++; if (suppDone?.[day]?.[`${s.id}_AM`]) done++; }
                else if (s.schedule === 'PM') { planned++; if (suppDone?.[day]?.[`${s.id}_PM`]) done++; }
                else if (s.schedule === 'BOTH') { planned += 2; if (suppDone?.[day]?.[`${s.id}_AM`]) done++; if (suppDone?.[day]?.[`${s.id}_PM`]) done++; }
            }
            if (planned > 0 && done === planned) streak++;
            else if (planned > 0) break;
        }

        const accountAgeDays = user.createdAt ? Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) : 0;

        return { delivered, internationalOrders, groupBuys, activeProtocols, stockpile, lowStock, supplementCount, totalSpend, streak, isBetaTester: isBetaTesterFinal, isFounder, vendors, stacks, accountAgeDays };
    }, [firestoreBetaTester]);

    const earnedBadges = useMemo(() => {
        return allBadges.filter(b => b.check(stats));
    }, [allBadges, stats]);

    const totalBadges = allBadges.length;
    const earnedCount = earnedBadges.length;
    const progressPercentage = Math.round((earnedCount / totalBadges) * 100);

    return { allBadges, earnedBadges, totalBadges, earnedCount, progressPercentage, stats };
}
