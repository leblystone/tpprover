import { generateId } from './string.js';

// Use numeric IDs and isMock flag to distinguish from user-created data
export const MOCK_VENDORS = [
    { id: 1, name: 'Peptide Research Co', isMock: true, rating: 4.8, notes: 'Fast shipping, quality products' },
    { id: 2, name: 'BioTech Solutions', isMock: true, rating: 4.5, notes: 'Great for bulk orders' },
    { id: 3, name: 'Research Labs Pro', isMock: true, rating: 4.9, notes: 'Premium quality, higher prices' },
    { id: 4, name: 'Peptide Depot', isMock: true, rating: 4.2, notes: 'Good variety, international shipping' },
];

export const MOCK_ORDERS = [
    { 
        id: 101, 
        vendorId: 1, 
        type: 'domestic', 
        status: 'Delivered', 
        date: new Date(Date.now() - 3 * 86400000).toISOString(),
        items: [
            { id: 1, name: 'BPC-157', mg: 5, quantity: 3, price: 45 },
            { id: 2, name: 'TB-500', mg: 5, quantity: 2, price: 55 },
            { id: 3, name: 'Thymalin', mg: 10, quantity: 1, price: 75 }
        ],
        cost: 320,
        trackingNumber: 'PRC123456789',
        notes: 'First order - testing quality',
        isMock: true 
    },
    { 
        id: 102, 
        vendorId: 2, 
        type: 'international', 
        status: 'Shipped', 
        date: new Date(Date.now() - 7 * 86400000).toISOString(),
        items: [
            { id: 1, name: 'Semaglutide', mg: 5, quantity: 2, price: 110 },
            { id: 2, name: 'Tirzepatide', mg: 5, quantity: 1, price: 180 }
        ],
        cost: 400,
        trackingNumber: 'BTS987654321',
        notes: 'Weight management protocol',
        isMock: true 
    },
    { 
        id: 103, 
        vendorId: 3, 
        type: 'domestic', 
        status: 'Processing', 
        date: new Date(Date.now() - 1 * 86400000).toISOString(),
        items: [
            { id: 1, name: 'Epithalon', mg: 10, quantity: 1, price: 95 },
            { id: 2, name: 'Thymalin', mg: 10, quantity: 1, price: 85 }
        ],
        cost: 180,
        notes: 'Longevity research stack',
        isMock: true 
    },
    { 
        id: 104, 
        vendorId: 4, 
        type: 'international', 
        status: 'Delivered', 
        date: new Date(Date.now() - 14 * 86400000).toISOString(),
        items: [
            { id: 1, name: 'Ipamorelin', mg: 5, quantity: 2, price: 65 },
            { id: 2, name: 'CJC-1295', mg: 5, quantity: 2, price: 70 }
        ],
        cost: 270,
        trackingNumber: 'PD456789123',
        notes: 'Growth hormone research',
        isMock: true 
    }
];

export const MOCK_SCHEDULED_BUYS = [
    { 
        id: 201, 
        item: 'Tirzepatide Bulk Order', 
        openDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), 
        closeDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), 
        vendor: 'BioTech Solutions', 
        notes: 'Community group buy - 20% discount for 10+ participants', 
        isMock: true 
    },
    { 
        id: 202, 
        item: 'BPC-157 Research Batch', 
        openDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), 
        closeDate: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10), 
        vendor: 'Peptide Research Co', 
        notes: 'High purity batch for injury recovery studies', 
        isMock: true 
    },
    { 
        id: 203, 
        item: 'Semaglutide Pre-Order', 
        openDate: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10), 
        closeDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), 
        vendor: 'Research Labs Pro', 
        notes: 'Limited quantity - premium grade', 
        isMock: true 
    }
];

export const MOCK_PROTOCOLS = [
    {
        id: 301,
        protocolName: 'Recovery & Healing Protocol',
        peptides: [
            { name: 'BPC-157', dosage: { amount: '250', unit: 'mcg' }, frequency: { type: 'daily', time: ['Morning', 'Evening'] } },
            { name: 'TB-500', dosage: { amount: '2.5', unit: 'mg' }, frequency: { type: 'weekly', time: ['Monday', 'Thursday'] } }
        ],
        startDate: new Date().toISOString().slice(0, 10),
        duration: { count: '8', unit: 'week' },
        washout: { enabled: true, count: '4', unit: 'week' },
        active: true,
        notes: 'Post-injury recovery and tissue healing',
        isMock: true
    },
    {
        id: 302,
        protocolName: 'Weight Management Stack',
        peptides: [
            { name: 'Semaglutide', dosage: { amount: '0.25', unit: 'mg' }, frequency: { type: 'weekly', time: ['Sunday'] } },
            { name: 'Tirzepatide', dosage: { amount: '2.5', unit: 'mg' }, frequency: { type: 'weekly', time: ['Wednesday'] } }
        ],
        startDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        duration: { count: '12', unit: 'week' },
        washout: { enabled: true, count: '6', unit: 'week' },
        active: false,
        notes: 'Metabolic optimization and appetite control',
        isMock: true
    },
    {
        id: 303,
        protocolName: 'Longevity Research Protocol',
        peptides: [
            { name: 'Epithalon', dosage: { amount: '10', unit: 'mg' }, frequency: { type: 'daily', time: ['Evening'] } },
            { name: 'Thymalin', dosage: { amount: '10', unit: 'mg' }, frequency: { type: 'daily', time: ['Morning'] } }
        ],
        startDate: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
        duration: { count: '20', unit: 'day' },
        washout: { enabled: true, count: '3', unit: 'month' },
        active: true,
        notes: 'Telomere length and immune system optimization',
        isMock: true
    },
    {
        id: 304,
        protocolName: 'Growth Hormone Enhancement',
        peptides: [
            { name: 'Ipamorelin', dosage: { amount: '200', unit: 'mcg' }, frequency: { type: 'daily', time: ['Morning', 'Evening'] } },
            { name: 'CJC-1295', dosage: { amount: '200', unit: 'mcg' }, frequency: { type: 'daily', time: ['Morning', 'Evening'] } }
        ],
        startDate: new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10),
        duration: { count: '6', unit: 'week' },
        washout: { enabled: true, count: '2', unit: 'week' },
        active: true,
        notes: 'Muscle growth and recovery enhancement',
        isMock: true
    }
];

export const MOCK_SUPPLEMENTS = [
    { id: 401, name: 'Magnesium Glycinate', dose: '400mg', schedule: 'Nightly', notes: 'Sleep quality and muscle recovery', isMock: true },
    { id: 402, name: 'Vitamin D3', dose: '5000 IU', schedule: 'Daily', notes: 'Immune support and bone health', isMock: true },
    { id: 403, name: 'Omega-3 Fish Oil', dose: '1000mg', schedule: 'Twice Daily', notes: 'Anti-inflammatory and heart health', isMock: true },
    { id: 404, name: 'Zinc Picolinate', dose: '15mg', schedule: 'Daily', notes: 'Immune function and wound healing', isMock: true },
    { id: 405, name: 'NAC (N-Acetyl Cysteine)', dose: '600mg', schedule: 'Twice Daily', notes: 'Antioxidant and liver support', isMock: true },
    { id: 406, name: 'CoQ10', dose: '100mg', schedule: 'Daily', notes: 'Cellular energy and heart health', isMock: true },
];

export const MOCK_RECON_ITEMS = [
    {
        id: 501,
        peptide: 'BPC-157',
        mg: 5,
        dose: 250,
        vendor: 'Peptide Research Co',
        water: 2,
        deliveryMethod: 'syringe',
        cost: 45,
        date: new Date(Date.now() - 2 * 86400000).toISOString(),
        notes: 'Reconstituted for morning/evening dosing',
        isMock: true,
    },
    {
        id: 502,
        peptide: 'TB-500',
        mg: 5,
        dose: 2500,
        vendor: 'Peptide Research Co',
        water: 2,
        deliveryMethod: 'syringe',
        cost: 55,
        date: new Date(Date.now() - 1 * 86400000).toISOString(),
        notes: 'Weekly injection protocol',
        isMock: true,
    },
    {
        id: 503,
        peptide: 'Semaglutide',
        mg: 5,
        dose: 250,
        vendor: 'BioTech Solutions',
        water: 2,
        deliveryMethod: 'syringe',
        cost: 110,
        date: new Date(Date.now() - 5 * 86400000).toISOString(),
        notes: 'Weekly weight management dose',
        isMock: true,
    },
    {
        id: 504,
        peptide: 'Ipamorelin',
        mg: 5,
        dose: 200,
        vendor: 'Peptide Depot',
        water: 2.5,
        deliveryMethod: 'syringe',
        cost: 65,
        date: new Date(Date.now() - 10 * 86400000).toISOString(),
        notes: 'Twice daily growth hormone support',
        isMock: true,
    }
];

export const MOCK_METRICS = [
    { id: 601, type: 'weight', value: 175, unit: 'lb', date: new Date(Date.now() - 7 * 86400000).toISOString(), notes: 'Starting weight', isMock: true },
    { id: 602, type: 'weight', value: 172, unit: 'lb', date: new Date(Date.now() - 3 * 86400000).toISOString(), notes: 'After 1 week protocol', isMock: true },
    { id: 603, type: 'weight', value: 170, unit: 'lb', date: new Date().toISOString(), notes: 'Current weight', isMock: true },
    { id: 604, type: 'body_fat', value: 18.5, unit: '%', date: new Date(Date.now() - 7 * 86400000).toISOString(), notes: 'DEXA scan baseline', isMock: true },
    { id: 605, type: 'body_fat', value: 16.2, unit: '%', date: new Date().toISOString(), notes: 'Current body fat', isMock: true },
    { id: 606, type: 'energy', value: 8, unit: '/10', date: new Date().toISOString(), notes: 'Daily energy level', isMock: true },
    { id: 607, type: 'sleep_quality', value: 7.5, unit: '/10', date: new Date().toISOString(), notes: 'Sleep quality rating', isMock: true },
];

export const MOCK_NOTES = {
    [new Date(Date.now() - 7 * 86400000).toISOString().slice(0,10)]: { text: 'Started recovery protocol - BPC-157 and TB-500. Feeling optimistic about healing timeline.', isMock: true },
    [new Date(Date.now() - 5 * 86400000).toISOString().slice(0,10)]: { text: 'First week down. Noticed improved sleep quality and reduced inflammation in target areas.', isMock: true },
    [new Date(Date.now() - 3 * 86400000).toISOString().slice(0,10)]: { text: 'Weight management protocol started. Semaglutide injection went smoothly. Appetite already reduced.', isMock: true },
    [new Date(Date.now() - 1 * 86400000).toISOString().slice(0,10)]: { text: 'Added longevity stack - Epithalon and Thymalin. Excited to track telomere length changes.', isMock: true },
    [new Date().toISOString().slice(0,10)]: { text: 'Demo data shows comprehensive research tracking. All protocols running smoothly with good progress metrics.', isMock: true },
};

const DATA_KEYS = {
    vendors: 'tpprover_vendors',
    orders: 'tpprover_orders',
    scheduled_buys: 'tpprover_scheduled_buys',
    protocols: 'tpprover_protocols',
};

export function seedInitialData() {
    try {
        // Check if user has explicitly cleared demo data - if so, never re-seed
        const demoDataCleared = localStorage.getItem('tpprover_demo_data_cleared');
        if (demoDataCleared === 'true') return;

        // FAILSAFE: Check if any non-mock data exists. If so, abort immediately.
        const vendorsRaw = localStorage.getItem('tpprover_vendors');
        if (vendorsRaw && JSON.parse(vendorsRaw).some(v => !v.isMock)) return;
        const ordersRaw = localStorage.getItem('tpprover_orders');
        if (ordersRaw && JSON.parse(ordersRaw).some(o => !o.isMock)) return;

        const hasSeeded = localStorage.getItem('tpprover_has_seeded');
        // CRITICAL FIX: Always check if user has real data first, regardless of seeding status
        const protocolsRaw = localStorage.getItem('tpprover_protocols');
        const alreadyHasRealData = [vendorsRaw, ordersRaw, protocolsRaw].some(r => {
            try { 
                const data = JSON.parse(r);
                return Array.isArray(data) && data.some(item => !item.isMock);
            } catch { 
                return false 
            }
        });
        
        // If user has any real data, never seed
        if (alreadyHasRealData) return;
        
        // If already seeded and user hasn't explicitly cleared demo data, don't re-seed
        if (hasSeeded === 'true') return;

        localStorage.setItem(DATA_KEYS.vendors, JSON.stringify(MOCK_VENDORS));
        localStorage.setItem(DATA_KEYS.orders, JSON.stringify(MOCK_ORDERS));
        localStorage.setItem(DATA_KEYS.scheduled_buys, JSON.stringify(MOCK_SCHEDULED_BUYS));
        localStorage.setItem(DATA_KEYS.protocols, JSON.stringify(MOCK_PROTOCOLS));
        localStorage.setItem('tpprover_supplements', JSON.stringify(MOCK_SUPPLEMENTS));
        localStorage.setItem('tpprover_recon_items', JSON.stringify(MOCK_RECON_ITEMS));
        localStorage.setItem('tpprover_metrics', JSON.stringify(MOCK_METRICS));
        localStorage.setItem('tpprover_calendar_notes', JSON.stringify(MOCK_NOTES));
        
        // After seeding, create derived data like stockpile from mock orders
        let stockpile = [];
        MOCK_ORDERS.forEach(order => {
            if ((order.status || '').toLowerCase() === 'delivered') {
                const newItems = (order.items || []).map(item => ({
                    id: generateId(), // Stockpile items are unique entities
                    name: item.name,
                    mg: item.mg,
                    quantity: item.quantity,
                    vendorId: order.vendorId,
                    purchaseDate: order.date,
                    notes: `From sample order #${order.id}`,
                    orderId: order.id,
                    isMock: true,
                }));
                stockpile = [...stockpile, ...newItems];
            }
        });
        localStorage.setItem('tpprover_stockpile', JSON.stringify(stockpile));


        localStorage.setItem('tpprover_has_seeded', 'true');
        console.log('Mock data seeded.');

    } catch (e) {
        console.error("Failed to seed mock data:", e);
    }
}

export function clearMockData() {
    try {
        const ALL_DATA_KEYS = [
            'tpprover_vendors',
            'tpprover_orders',
            'tpprover_scheduled_buys',
            'tpprover_protocols',
            'tpprover_supplements',
            'tpprover_recon_items',
            'tpprover_recon_history',
            'tpprover_metrics',
            'tpprover_stockpile',
            'tpprover_calendar_notes',
        ];

        ALL_DATA_KEYS.forEach(key => {
            const raw = localStorage.getItem(key);
            if (!raw) return;

            try {
                const data = JSON.parse(raw);
                let filteredData;

                if (Array.isArray(data)) {
                    filteredData = data.filter(item => !item.isMock);
                } else if (typeof data === 'object' && data !== null) {
                    // Handle calendar notes and other object structures
                    filteredData = Object.entries(data).reduce((acc, [itemKey, value]) => {
                        // For calendar notes, check if the value has isMock property
                        if (typeof value === 'object' && value !== null && value.isMock) {
                            // Skip mock calendar entries
                            return acc;
                        } else if (typeof value === 'object' && value !== null && !value.isMock) {
                            // Keep non-mock objects
                            acc[itemKey] = value;
                        } else if (typeof value !== 'object') {
                            // Keep primitive values (strings, etc.)
                            acc[itemKey] = value;
                        }
                        return acc;
                    }, {});
                } else {
                    // For simple values, if we need to handle them, we would, but for now, we leave them.
                    filteredData = data;
                }
                
                localStorage.setItem(key, JSON.stringify(filteredData));

            } catch (e) {
                console.error(`Failed to process key ${key}:`, e);
            }
        });

        console.log('All mock data cleared.');
    } catch (e) {
        console.error("Failed to clear mock data:", e);
    }
}


