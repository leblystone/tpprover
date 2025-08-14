export function seedDemoData() {
  try {
    if (localStorage.getItem('tpprover_seed_all')) return

    // Vendors list for autosuggest
    const vendorSet = new Set(['Acme Research', 'BioLabs', 'PeptideHouse', 'Community Round'])
    try { (JSON.parse(localStorage.getItem('tpprover_vendors')||'[]')||[]).forEach(v => vendorSet.add(v)) } catch {}
    localStorage.setItem('tpprover_vendors', JSON.stringify(Array.from(vendorSet)))

    // Orders
    const today = new Date()
    const fmt = (d) => d.toISOString().slice(0,10)
    const addDays = (n) => new Date(today.getFullYear(), today.getMonth(), today.getDate()+n)
    const demoOrders = [
      { id: Date.now()-5, vendor: 'Acme Research', peptide: 'BPC-157', mg: 10, cost: '120', status: 'Delivered', date: fmt(addDays(-15)), shipDate: fmt(addDays(-14)), deliveryDate: fmt(addDays(-10)) },
      { id: Date.now()-4, vendor: 'BioLabs', peptide: 'TB-500', mg: 5, cost: '150', status: 'Shipped', date: fmt(addDays(-7)), shipDate: fmt(addDays(-6)) },
      { id: Date.now()-3, vendor: 'PeptideHouse', peptide: 'CJC-1295', mg: 2, cost: '95', status: 'Order Placed', date: fmt(addDays(2)) },
      { id: Date.now()-2, vendor: 'Community Round', peptide: 'BPC-157', mg: 10, cost: '200', status: 'Order Placed', date: fmt(addDays(3)), group: { title: 'BPC-157 Round', participants: ['alice','bob'], notes: 'Demo' } },
      { id: Date.now()-1, vendor: 'Acme Research', peptide: 'Ipamorelin', mg: 2, cost: '85', status: 'Order Placed', date: fmt(addDays(6)) },
    ]
    const existingOrders = JSON.parse(localStorage.getItem('tpprover_orders') || '[]')
    if (existingOrders.length === 0) localStorage.setItem('tpprover_orders', JSON.stringify(demoOrders))

    // Stockpile
    const demoStock = [
      { id: Date.now()+101, name: 'BPC-157', mg: '10', quantity: 1, vendor: 'Acme Research', capColor: 'Blue', batchNumber: 'BPC-001', minQty: '1' },
      { id: Date.now()+102, name: 'TB-500', mg: '5', quantity: 2, vendor: 'BioLabs', capColor: 'Red', batchNumber: 'TB-010', minQty: '1' },
      { id: Date.now()+103, name: 'CJC-1295', mg: '2', quantity: 0, vendor: 'PeptideHouse', capColor: 'Green', batchNumber: 'CJC-100', minQty: '1' },
    ]
    const existingStock = JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]')
    if (existingStock.length === 0) localStorage.setItem('tpprover_stockpile', JSON.stringify(demoStock))

    // Protocols
    const demoProtocols = [
      { id: Date.now()+201, name: 'Recovery Stack', category: 'Recovery', purpose: 'Tissue support', notes: '', startDate: fmt(addDays(-3)), endDate: '', activeDays: ['monday','wednesday','friday','sunday'], active: true, frequency: { count: 1, per: 'Day', time: ['Morning','Evening'] } },
      { id: Date.now()+202, name: 'Sleep Support', category: 'Wellness', purpose: 'Sleep quality', notes: '', startDate: '', endDate: '', activeDays: ['tuesday','thursday','saturday'], active: true, frequency: { count: 1, per: 'Day', time: ['Night'] } },
    ]
    const existingProt = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]')
    if (existingProt.length === 0) localStorage.setItem('tpprover_protocols', JSON.stringify(demoProtocols))

    // Supplements
    const demoSupps = [
      { id: Date.now()+301, name: 'Vitamin D3', dose: '5000 IU', schedule: 'AM', form: 'Oral', days: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] },
      { id: Date.now()+302, name: 'Magnesium Glycinate', dose: '200 mg', schedule: 'PM', form: 'Oral', days: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] },
      { id: Date.now()+303, name: 'Fish Oil', dose: '1 g', schedule: 'BOTH', form: 'Oral', days: ['monday','wednesday','friday'] },
    ]
    const existingSupps = JSON.parse(localStorage.getItem('tpprover_supplements') || '[]')
    if (existingSupps.length === 0) localStorage.setItem('tpprover_supplements', JSON.stringify(demoSupps))

    // Recon
    const demoRecon = [
      { id: Date.now()+401, peptide: 'BPC-157', vendor: 'Acme Research', mg: '10', water: '2', dose: '250', date: fmt(addDays(-1)) },
      { id: Date.now()+402, peptide: 'TB-500', vendor: 'BioLabs', mg: '5', water: '1', dose: '250', date: fmt(addDays(-2)) },
    ]
    const existingRecon = JSON.parse(localStorage.getItem('tpprover_recon') || '[]')
    if (existingRecon.length === 0) localStorage.setItem('tpprover_recon', JSON.stringify(demoRecon))

    // Calendar notes sample
    const notes = JSON.parse(localStorage.getItem('tpprover_calendar_notes') || '{}')
    if (Object.keys(notes).length === 0) {
      notes[fmt(today)] = 'Kickoff – test planner features.'
      notes[fmt(addDays(1))] = 'Light workout + protocol dose.'
      localStorage.setItem('tpprover_calendar_notes', JSON.stringify(notes))
    }

    localStorage.setItem('tpprover_seed_all', '1')
  } catch {}
}


