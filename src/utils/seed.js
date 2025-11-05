import { generateId } from './string.js';

// Use numeric IDs and isMock flag to distinguish from user-created data
export const MOCK_VENDORS = [
    { id: 1, name: 'Peptide Research Co', isMock: true, rating: 4.8, notes: 'Fast shipping, quality products' },
    { id: 2, name: 'BioTech Solutions', isMock: true, rating: 4.5, notes: 'Great for bulk orders' },
    { id: 3, name: 'Research Labs Pro', isMock: true, rating: 4.9, notes: 'Premium quality, higher prices' },
    { id: 4, name: 'Elite Bio Research', isMock: true, rating: 4.9, notes: 'Premium quality, third-party tested' },
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
            { id: 2, name: 'TB-500', mg: 5, quantity: 2, price: 55 }
        ],
        cost: 245,
        trackingNumber: 'PRC123456789',
        notes: 'Recovery protocol - testing quality',
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
        trackingNumber: 'EBR456789123',
        notes: 'Growth hormone research',
        isMock: true 
    },
    { 
        id: 105, 
        vendorId: 1, 
        type: 'domestic', 
        status: 'Delivered', 
        date: new Date(Date.now() - 20 * 86400000).toISOString(),
        items: [
            { id: 1, name: 'Semax', mg: 30, quantity: 1, price: 65 },
            { id: 2, name: 'Selank', mg: 30, quantity: 1, price: 60 }
        ],
        cost: 125,
        trackingNumber: 'PRC789456123',
        notes: 'Cognitive enhancement research',
        isMock: true 
    },
    { 
        id: 106, 
        vendorId: 2, 
        type: 'domestic', 
        status: 'Delivered', 
        date: new Date(Date.now() - 25 * 86400000).toISOString(),
        items: [
            { id: 1, name: 'NAD+', mg: 500, quantity: 1, price: 150 },
            { id: 2, name: 'GHK-Cu', mg: 75, quantity: 2, price: 85 }
        ],
        cost: 320,
        trackingNumber: 'BTS321654987',
        notes: 'Anti-aging and regeneration research',
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
        item: 'Epithalon + Thymalin Stack', 
        openDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), 
        closeDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10), 
        vendor: 'Research Labs Pro', 
        notes: 'Longevity protocol bundle - save 15% on combo', 
        isMock: true 
    }
];

export const MOCK_PROTOCOLS = [
    {
        id: 301,
        protocolName: 'Recovery & Healing Protocol',
        peptides: [
            { 
                name: 'BPC-157', 
                dosage: { amount: 'XXX', unit: 'mcg' }, 
                frequency: { type: 'daily', time: ['AM', 'PM'] },
                deliveryMethod: 'injection',
                administrationRoute: 'subcutaneous'
            },
            { 
                name: 'TB-500', 
                dosage: { amount: 'XXX', unit: 'mg' }, 
                frequency: { type: 'weekly', days: ['Monday', 'Thursday'], time: ['AM'] },
                deliveryMethod: 'injection',
                administrationRoute: 'subcutaneous'
            }
        ],
        startDate: new Date().toISOString().slice(0, 10),
        duration: { count: '8', unit: 'week' },
        washout: { enabled: true, count: '4', unit: 'week' },
        active: true,
        notes: 'Post-injury recovery and tissue healing. Subcutaneous injections for optimal bioavailability.',
        isMock: true
    },
    {
        id: 302,
        protocolName: 'Cognitive Enhancement Stack',
        peptides: [
            { 
                name: 'Semax', 
                dosage: { amount: 'XXX', unit: 'mcg' }, 
                frequency: { type: 'daily', time: ['AM'] },
                deliveryMethod: 'nasal',
                administrationRoute: 'intranasal'
            },
            { 
                name: 'Selank', 
                dosage: { amount: 'XXX', unit: 'mcg' }, 
                frequency: { type: 'daily', time: ['PM'] },
                deliveryMethod: 'nasal',
                administrationRoute: 'intranasal'
            }
        ],
        startDate: new Date().toISOString().slice(0, 10),
        duration: { count: '12', unit: 'week' },
        washout: { enabled: true, count: '4', unit: 'week' },
        active: true,
        notes: 'Focus, memory, and neuroprotection research. Intranasal delivery for direct brain access.',
        isMock: true
    },
    {
        id: 303,
        protocolName: 'Longevity Research Protocol',
        peptides: [
            { 
                name: 'Epithalon', 
                dosage: { amount: 'XXX', unit: 'mg' }, 
                frequency: { type: 'cycle', onDays: '10', offDays: '5', time: ['PM'] },
                deliveryMethod: 'injection',
                administrationRoute: 'subcutaneous'
            },
            { 
                name: 'Thymalin', 
                dosage: { amount: 'XXX', unit: 'mg' }, 
                frequency: { type: 'daily', time: ['AM'] },
                deliveryMethod: 'injection',
                administrationRoute: 'subcutaneous'
            }
        ],
        startDate: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
        duration: { count: '20', unit: 'day' },
        washout: { enabled: true, count: '3', unit: 'month' },
        active: true,
        notes: 'Telomere length and immune system optimization. Cyclic dosing pattern for optimal results.',
        isMock: true
    },
    {
        id: 304,
        protocolName: 'Performance Enhancement Stack',
        peptides: [
            { 
                name: 'Ipamorelin', 
                dosage: { amount: 'XXX', unit: 'mcg' }, 
                frequency: { type: 'daily', time: ['AM', 'PM'] },
                deliveryMethod: 'injection',
                administrationRoute: 'subcutaneous'
            },
            { 
                name: 'CJC-1295', 
                dosage: { amount: 'XXX', unit: 'mcg' }, 
                frequency: { type: 'daily', time: ['AM', 'PM'] },
                deliveryMethod: 'injection',
                administrationRoute: 'subcutaneous'
            }
        ],
        startDate: new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10),
        duration: { count: '6', unit: 'week' },
        washout: { enabled: true, count: '2', unit: 'week' },
        active: true,
        notes: 'Muscle growth and recovery enhancement. Dual daily dosing for sustained GH release.',
        isMock: true
    },
    {
        id: 305,
        protocolName: 'Weight Management Protocol',
        peptides: [
            { 
                name: 'Semaglutide', 
                dosage: { amount: 'XXX', unit: 'mg' }, 
                frequency: { type: 'weekly', days: ['Sunday'], time: ['AM'] },
                deliveryMethod: 'injection',
                administrationRoute: 'subcutaneous'
            },
            { 
                name: 'Tirzepatide', 
                dosage: { amount: 'XXX', unit: 'mg' }, 
                frequency: { type: 'weekly', days: ['Wednesday'], time: ['AM'] },
                deliveryMethod: 'injection',
                administrationRoute: 'subcutaneous'
            }
        ],
        startDate: new Date().toISOString().slice(0, 10),
        duration: { count: '12', unit: 'week' },
        washout: { enabled: true, count: '6', unit: 'week' },
        active: true,
        notes: 'Metabolic optimization and appetite control. Weekly dosing for sustained effects.',
        isMock: true
    },
    {
        id: 306,
        protocolName: 'Sleep & Recovery Protocol',
        peptides: [
            { 
                name: 'DSIP', 
                dosage: { amount: 'XXX', unit: 'mcg' }, 
                frequency: { type: 'daily', time: ['PM'] },
                deliveryMethod: 'injection',
                administrationRoute: 'subcutaneous'
            },
            { 
                name: 'Delta Sleep Inducing Peptide', 
                dosage: { amount: 'XXX', unit: 'mcg' }, 
                frequency: { type: 'cycle', onDays: '5', offDays: '2', time: ['PM'] },
                deliveryMethod: 'injection',
                administrationRoute: 'subcutaneous'
            }
        ],
        startDate: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        duration: { count: '4', unit: 'week' },
        washout: { enabled: false, count: '0', unit: 'week' },
        active: true,
        notes: 'Deep sleep optimization and recovery. Evening dosing for natural sleep cycle alignment.',
        isMock: true
    },
    {
        id: 307,
        protocolName: 'Anti-Aging Research Stack',
        peptides: [
            { 
                name: 'Epitalon', 
                dosage: { amount: 'XXX', unit: 'mg' }, 
                frequency: { type: 'daily', time: ['PM'] },
                deliveryMethod: 'injection',
                administrationRoute: 'subcutaneous'
            },
            { 
                name: 'Thymalin', 
                dosage: { amount: 'XXX', unit: 'mg' }, 
                frequency: { type: 'weekly', days: ['Monday', 'Wednesday', 'Friday'], time: ['AM'] },
                deliveryMethod: 'injection',
                administrationRoute: 'subcutaneous'
            }
        ],
        startDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
        duration: { count: '16', unit: 'week' },
        washout: { enabled: true, count: '8', unit: 'week' },
        active: true,
        notes: 'Cellular rejuvenation and immune system support. Long-term protocol for comprehensive benefits.',
        isMock: true
    }
];

export const MOCK_SUPPLEMENTS = [
    { id: 401, name: 'Magnesium Glycinate', dose: 'XXXmg', schedule: ['PM'], delivery: 'oral', isMock: true },
    { id: 402, name: 'Vitamin D3', dose: 'XXX IU', schedule: ['AM'], delivery: 'oral', isMock: true },
    { id: 403, name: 'Omega-3 Fish Oil', dose: 'XXXmg', schedule: ['AM', 'PM'], delivery: 'oral', isMock: true },
    { id: 404, name: 'NMN', dose: 'XXXmg', schedule: ['AM'], delivery: 'powder', isMock: true },
    { id: 405, name: 'Creatine Monohydrate', dose: 'XXXg', schedule: ['AM'], delivery: 'powder', isMock: true },
    { id: 406, name: 'Ashwagandha', dose: 'XXXmg', schedule: ['PM'], delivery: 'oral', isMock: true },
    { id: 407, name: 'L-Theanine', dose: 'XXXmg', schedule: ['AM', 'PM'], delivery: 'oral', isMock: true },
    { id: 408, name: 'Lions Mane', dose: 'XXXmg', schedule: ['AM'], delivery: 'powder', isMock: true },
    { id: 409, name: 'Melatonin', dose: 'XXXmg', schedule: ['PM'], delivery: 'oral', isMock: true },
    { id: 410, name: 'Zinc Picolinate', dose: 'XXXmg', schedule: ['AM'], delivery: 'oral', isMock: true },
    { id: 411, name: 'B-Complex', dose: 'XXXmg', schedule: ['AM'], delivery: 'oral', isMock: true },
    { id: 412, name: 'Vitamin C', dose: 'XXXmg', schedule: ['AM', 'PM'], delivery: 'oral', isMock: true }
];

export const MOCK_RECON_ITEMS = [
    {
        id: 501,
        peptide: 'BPC-157',
        mg: 5,
        dose: 'XXX',
        vendor: 'Peptide Research Co',
        water: 2,
        deliveryMethod: 'syringe',
        penColor: 'blue',
        administrationRoute: 'subcutaneous',
        cost: 45,
        date: new Date(Date.now() - 2 * 86400000).toISOString(),
        notes: 'Subcutaneous injection - dual daily dosing',
        isMock: true,
    },
    {
        id: 502,
        peptide: 'TB-500',
        mg: 5,
        dose: 'XXX',
        vendor: 'Peptide Research Co',
        water: 2,
        deliveryMethod: 'syringe',
        penColor: 'green',
        administrationRoute: 'subcutaneous',
        cost: 55,
        date: new Date(Date.now() - 1 * 86400000).toISOString(),
        notes: 'Weekly subcutaneous injection protocol',
        isMock: true,
    },
    {
        id: 503,
        peptide: 'Semaglutide',
        mg: 5,
        dose: 'XXX',
        vendor: 'BioTech Solutions',
        water: 2,
        deliveryMethod: 'pen',
        penColor: 'red',
        administrationRoute: 'subcutaneous',
        cost: 110,
        date: new Date(Date.now() - 5 * 86400000).toISOString(),
        notes: 'Weekly weight management - pen delivery',
        isMock: true,
    },
    {
        id: 504,
        peptide: 'Ipamorelin',
        mg: 5,
        dose: 'XXX',
        vendor: 'Elite Bio Research',
        water: 2.5,
        deliveryMethod: 'syringe',
        penColor: 'purple',
        administrationRoute: 'subcutaneous',
        cost: 65,
        date: new Date(Date.now() - 10 * 86400000).toISOString(),
        notes: 'Growth hormone enhancement - dual daily',
        isMock: true,
    },
    {
        id: 505,
        peptide: 'CJC-1295',
        mg: 5,
        dose: 'XXX',
        vendor: 'Elite Bio Research',
        water: 2.5,
        deliveryMethod: 'syringe',
        penColor: 'orange',
        administrationRoute: 'subcutaneous',
        cost: 70,
        date: new Date(Date.now() - 10 * 86400000).toISOString(),
        notes: 'Growth hormone releasing hormone - dual daily',
        isMock: true,
    },
    {
        id: 506,
        peptide: 'Epithalon',
        mg: 10,
        dose: 'XXX',
        vendor: 'Research Labs Pro',
        water: 1,
        deliveryMethod: 'syringe',
        penColor: 'yellow',
        administrationRoute: 'subcutaneous',
        cost: 95,
        date: new Date(Date.now() - 12 * 86400000).toISOString(),
        notes: 'Telomere length optimization - cyclic dosing',
        isMock: true,
    },
    {
        id: 507,
        peptide: 'Semax',
        mg: 30,
        dose: 'XXX',
        vendor: 'Peptide Research Co',
        water: 3,
        deliveryMethod: 'nasal',
        penColor: 'indigo',
        administrationRoute: 'intranasal',
        cost: 65,
        date: new Date(Date.now() - 18 * 86400000).toISOString(),
        notes: 'Cognitive enhancement - nasal spray delivery',
        isMock: true,
    },
    {
        id: 508,
        peptide: 'Selank',
        mg: 30,
        dose: 'XXX',
        vendor: 'BioTech Solutions',
        water: 3,
        deliveryMethod: 'nasal',
        penColor: 'pink',
        administrationRoute: 'intranasal',
        cost: 60,
        date: new Date(Date.now() - 20 * 86400000).toISOString(),
        notes: 'Anxiety support - evening nasal spray',
        isMock: true,
    }
];

export const MOCK_METRICS = [
    { id: 601, type: 'weight', value: 180, unit: 'lb', date: new Date(Date.now() - 60 * 86400000).toISOString(), notes: 'Research protocol baseline', isMock: true },
    { id: 602, type: 'weight', value: 175, unit: 'lb', date: new Date(Date.now() - 30 * 86400000).toISOString(), notes: 'One month progress', isMock: true },
    { id: 603, type: 'weight', value: 170, unit: 'lb', date: new Date().toISOString(), notes: 'Current weight - excellent progress', isMock: true },
    { id: 604, type: 'body_fat', value: 20.2, unit: '%', date: new Date(Date.now() - 60 * 86400000).toISOString(), notes: 'DEXA scan baseline', isMock: true },
    { id: 605, type: 'body_fat', value: 16.2, unit: '%', date: new Date().toISOString(), notes: 'Current body composition', isMock: true },
    { id: 606, type: 'energy', value: 5, unit: '/10', date: new Date(Date.now() - 60 * 86400000).toISOString(), notes: 'Low energy baseline', isMock: true },
    { id: 607, type: 'energy', value: 8, unit: '/10', date: new Date().toISOString(), notes: 'Sustained high energy', isMock: true },
    { id: 608, type: 'sleep_quality', value: 5.5, unit: '/10', date: new Date(Date.now() - 60 * 86400000).toISOString(), notes: 'Poor sleep baseline', isMock: true },
    { id: 609, type: 'sleep_quality', value: 8.5, unit: '/10', date: new Date().toISOString(), notes: 'Deep restorative sleep', isMock: true },
    { id: 610, type: 'recovery', value: 6, unit: '/10', date: new Date(Date.now() - 60 * 86400000).toISOString(), notes: 'Slow recovery baseline', isMock: true },
    { id: 611, type: 'recovery', value: 9, unit: '/10', date: new Date().toISOString(), notes: 'Rapid recovery between sessions', isMock: true },
];

export const MOCK_NOTES = {
    [new Date(Date.now() - 60 * 86400000).toISOString().slice(0,10)]: { text: 'Research program initiation. Baseline metrics established. Starting with recovery and longevity focus.', isMock: true },
    [new Date(Date.now() - 45 * 86400000).toISOString().slice(0,10)]: { text: 'Two weeks in - recovery time between workouts significantly reduced. Inflammation markers improving.', isMock: true },
    [new Date(Date.now() - 35 * 86400000).toISOString().slice(0,10)]: { text: 'One month milestone! Weight down 5 lbs, energy up significantly. Body composition improving.', isMock: true },
    [new Date(Date.now() - 20 * 86400000).toISOString().slice(0,10)]: { text: 'Six week checkpoint - all protocols synergizing well. No side effects, only positive outcomes.', isMock: true },
    [new Date(Date.now() - 10 * 86400000).toISOString().slice(0,10)]: { text: 'Added anti-inflammatory protocol with KPV and LL-37. Joint health and mobility improving.', isMock: true },
    [new Date(Date.now() - 5 * 86400000).toISOString().slice(0,10)]: { text: 'Eight week progress review - exceeded all baseline goals. Energy, recovery, and cognition all optimized.', isMock: true },
    [new Date(Date.now() - 1 * 86400000).toISOString().slice(0,10)]: { text: 'Comprehensive research program showing outstanding results across all metrics. Documentation invaluable.', isMock: true },
    [new Date().toISOString().slice(0,10)]: { text: 'Demo data demonstrates the power of systematic peptide research tracking. All protocols optimized and documented.', isMock: true },
};

const DATA_KEYS = {
    vendors: 'tpprover_vendors',
    orders: 'tpprover_orders',
    scheduled_buys: 'tpprover_scheduled_buys',
    protocols: 'tpprover_protocols',
};

export function seedInitialData() {
    try {
        console.log('🔍 seedInitialData: Starting seed process...');
        
        // Check if user has explicitly cleared sample data - if so, never re-seed
        const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared');
        if (sampleDataCleared === 'true') {
            console.log('❌ Seed aborted: Sample data was explicitly cleared');
            return;
        }

        // FAILSAFE: Check if any non-mock data exists. If so, abort immediately.
        const vendorsRaw = localStorage.getItem('tpprover_vendors');
        if (vendorsRaw && JSON.parse(vendorsRaw).some(v => !v.isMock)) {
            console.log('❌ Seed aborted: Real vendor data exists');
            return;
        }
        const ordersRaw = localStorage.getItem('tpprover_orders');
        if (ordersRaw && JSON.parse(ordersRaw).some(o => !o.isMock)) {
            console.log('❌ Seed aborted: Real order data exists');
            return;
        }

        const hasSeeded = localStorage.getItem('tpprover_has_seeded');
        console.log(`🔍 Has seeded flag: ${hasSeeded}`);
        
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
        if (alreadyHasRealData) {
            console.log('❌ Seed aborted: User has real data');
            return;
        }
        
        // If already seeded and user hasn't explicitly cleared sample data, don't re-seed
        if (hasSeeded === 'true') {
            console.log('❌ Seed aborted: Already seeded (hasSeeded=true)');
            return;
        }
        
        console.log('✅ All checks passed - proceeding with seed...');

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
                    const beforeCount = data.length;
                    filteredData = data.filter(item => {
                        // Remove items with isMock: true
                        if (item.isMock) {
                            return false;
                        }
                        
                        // For scheduled buys, also check for known mock vendors/items
                        if (key === 'tpprover_scheduled_buys') {
                            // Check for known mock vendors
                            const mockVendors = ['BioTech Solutions', 'Peptide Research Co', 'Research Labs Pro'];
                            if (mockVendors.includes(item.vendor)) {
                                return false;
                            }
                            // Check for known mock IDs (201, 202, 203)
                            if (item.id === 201 || item.id === 202 || item.id === 203) {
                                return false;
                            }
                            // Check for known mock items
                            const mockItems = ['Tirzepatide Bulk Order', 'BPC-157 Research Batch', 'Epithalon + Thymalin Stack'];
                            if (mockItems.includes(item.item)) {
                                return false;
                            }
                        }
                        
                        // Also remove items that are clearly mock data based on content
                        if (item.vendor === 'Community Round' && item.peptide === 'BPC-157' && item.cost === '200') {
                            return false;
                        }
                        
                        return true;
                    });
                    const removedCount = beforeCount - filteredData.length;
                    if (removedCount > 0) {
                        const keyName = key.replace('tpprover_', '').replace(/_/g, ' ');
                        console.log(`✅ Cleared ${removedCount} mock ${keyName} from localStorage`);
                    }
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

        console.log('✅ All mock data cleared');
    } catch (e) {
        console.error("Failed to clear mock data:", e);
    }
}


