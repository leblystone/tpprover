import { useMemo } from 'react';

export function useBadgeStats() {
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
      { category: 'Program', name: 'The Catalyst', description: 'Participate as a beta tester.', check: (s) => s.isTester, progress: s => s.isTester ? 1 : 0 },
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
        
        const isTester = (() => { try { const v = localStorage.getItem('tpprover_is_tester'); return v === '1' || v === 'true' } catch { return false } })()
        const isFounder = (() => { try { const v = localStorage.getItem('tpprover_is_founder'); return v === '1' || v === 'true' } catch { return false } })()
        
        const delivered = orders.filter(o => o.status === 'Delivered').length
        const internationalOrders = orders.filter(o => o.category === 'international').length
        const groupBuys = orders.filter(o => o.category === 'group').length
        const activeProtocols = protocols.filter(p => p.active !== false).length
        const lowStock = stockpile.filter(s => Number(s.quantity) <= 1).length
        const supplementCount = supplements.length
        const totalSpend = orders.reduce((acc, o) => acc + (Number(String(o.cost).replace(/[^0-9.]/g,'')) || 0), 0)
        
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

        return { delivered, internationalOrders, groupBuys, activeProtocols, stockpile, lowStock, supplementCount, totalSpend, streak, isTester, isFounder, vendors, stacks, accountAgeDays };
    }, []);

    const earnedBadges = useMemo(() => {
        return allBadges.filter(b => b.check(stats));
    }, [allBadges, stats]);

    const totalBadges = allBadges.length;
    const earnedCount = earnedBadges.length;
    const progressPercentage = Math.round((earnedCount / totalBadges) * 100);

    return { allBadges, earnedBadges, totalBadges, earnedCount, progressPercentage };
}
