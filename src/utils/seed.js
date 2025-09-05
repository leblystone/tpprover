import { generateId } from './string';

// Use numeric IDs and isMock flag to distinguish from user-created data
export const MOCK_VENDORS = [
    { id: 1, name: 'Example Labs', isMock: true },
    { id: 2, name: 'Demo Pharma', isMock: true },
];

export const MOCK_ORDERS = [
    { 
        id: 101, 
        vendorId: 1, 
        type: 'domestic', 
        status: 'Delivered', 
        date: new Date(Date.now() - 10 * 86400000).toISOString(),
        items: [
            { id: 1, name: 'BPC-157', mg: 5, quantity: 2, price: 55 },
            { id: 2, name: 'TB-500', mg: 5, quantity: 1, price: 60 }
        ],
        cost: 170,
        isMock: true 
    },
    { 
        id: 102, 
        vendorId: 2, 
        type: 'international', 
        status: 'Shipped', 
        date: new Date(Date.now() - 5 * 86400000).toISOString(),
        items: [
            { id: 1, name: 'Semaglutide', mg: 5, quantity: 1, price: 120 }
        ],
        cost: 120,
        isMock: true 
    }
];

export const MOCK_SCHEDULED_BUYS = [
    { id: 201, item: 'Tirzepatide Bulk', openDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), closeDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10), vendor: 'Demo Pharma', notes: 'Community Interest Check', isMock: true },
];

export const MOCK_PROTOCOLS = [
    {
        id: 301,
        protocolName: 'Introductory Protocol',
        peptides: [{ name: 'BPC-157', dosage: { amount: '250', unit: 'mcg' }, frequency: { type: 'daily', time: ['Morning', 'Evening'] } }],
        startDate: new Date().toISOString().slice(0, 10),
        duration: { count: '4', unit: 'week' },
        washout: { enabled: true, count: '2', unit: 'week' },
        active: true,
        isMock: true
    }
];

export const MOCK_SUPPLEMENTS = [
    { id: 401, name: 'Magnesium Glycinate', dose: '400mg', schedule: 'Nightly', isMock: true },
    { id: 402, name: 'Vitamin D3', dose: '2000 IU', schedule: 'Daily', isMock: true },
];

export const MOCK_RECON_ITEMS = [
    {
        id: 501,
        peptide: 'BPC-157',
        mg: 5,
        dose: 250, // mcg
        vendor: 'Example Labs',
        water: 2,
        deliveryMethod: 'syringe',
        cost: 55,
        date: new Date().toISOString(),
        notes: 'Demo vial',
        isMock: true,
    }
];

export const MOCK_METRICS = [
    { id: 601, type: 'weight', value: 180, unit: 'lb', date: new Date().toISOString(), isMock: true }
];

export const MOCK_NOTES = {
    [new Date().toISOString().slice(0,10)]: 'Demo note: calendar entries will appear here.'
};

const DATA_KEYS = {
    vendors: 'tpprover_vendors',
    orders: 'tpprover_orders',
    scheduled_buys: 'tpprover_scheduled_buys',
    protocols: 'tpprover_protocols',
};

export function seedInitialData() {
    try {
        // FAILSAFE: Check if any non-mock data exists. If so, abort immediately.
        const vendorsRaw = localStorage.getItem('tpprover_vendors');
        if (vendorsRaw && JSON.parse(vendorsRaw).some(v => !v.isMock)) return;
        const ordersRaw = localStorage.getItem('tpprover_orders');
        if (ordersRaw && JSON.parse(ordersRaw).some(o => !o.isMock)) return;

        const hasSeeded = localStorage.getItem('tpprover_has_seeded');
        // Seed if not seeded or if stores are empty (e.g., user cleared demo data only)
        const protocolsRaw = localStorage.getItem('tpprover_protocols');
        const alreadyHasData = [vendorsRaw, ordersRaw, protocolsRaw].some(r => {
            try { return Array.isArray(JSON.parse(r)) && JSON.parse(r).length > 0 } catch { return false }
        });
        if (hasSeeded === 'true' && alreadyHasData) return;

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
        const ALL_MOCK_KEYS = [
            'tpprover_vendors',
            'tpprover_orders',
            'tpprover_scheduled_buys',
            'tpprover_protocols',
            'tpprover_supplements',
            'tpprover_recon_items',
            'tpprover_metrics',
            'tpprover_stockpile',
        ];

        ALL_MOCK_KEYS.forEach(key => {
            const raw = localStorage.getItem(key);
            if (raw) {
                try {
                    const data = JSON.parse(raw);
                    if (Array.isArray(data)) {
                        const filteredData = data.filter(item => !item.isMock);
                        localStorage.setItem(key, JSON.stringify(filteredData));
                    }
                } catch {}
            }
        });

        // Special handling for calendar notes (object, not array)
        const notesRaw = localStorage.getItem('tpprover_calendar_notes');
        if (notesRaw) {
            localStorage.setItem('tpprover_calendar_notes', JSON.stringify({}));
        }

        console.log('All mock data cleared.');
    } catch (e) {
        console.error("Failed to clear mock data:", e);
    }
}


