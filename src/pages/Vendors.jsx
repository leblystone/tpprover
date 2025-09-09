import React, { useMemo, useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import Tabs from '../components/common/Tabs'
import Modal from '../components/common/Modal'
import TextInput from '../components/common/inputs/TextInput'
import { PlusCircle } from 'lucide-react'
import VendorDetailsModal from '../components/vendors/VendorDetailsModal'
import VendorCard from '../components/vendors/VendorCard'
import ViewContainer from '../components/ui/ViewContainer'
import { useAppContext } from '../context/AppContext'

// Local lightweight useLocalStorage helper
function useLocalStorage(key, initialValue) {
  const [value, setValue] = React.useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })
  React.useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
  }, [key, value])
  return [value, setValue]
}

export default function Vendors() {
	const { theme } = useOutletContext()
	const { vendors, addVendor, updateVendor, deleteVendor } = useAppContext();
	const [editingVendor, setEditingVendor] = useState(null)
	const [activeTab, setActiveTab] = useLocalStorage('tpprover_vendors_tab', 'domestic')
	const [showAddModal, setShowAddModal] = useState(false)
	const [filters, setFilters] = useState({ payment: [], contact: [], label: [] })

	// Helper function to identify and clean up duplicate vendors
	const cleanupDuplicateVendors = () => {
		const vendorsByName = {};
		const duplicates = [];
		
		// Group vendors by name (case-insensitive)
		vendors.forEach(vendor => {
			const name = vendor.name.toLowerCase();
			if (!vendorsByName[name]) {
				vendorsByName[name] = [];
			}
			vendorsByName[name].push(vendor);
		});
		
		// Find duplicates
		Object.entries(vendorsByName).forEach(([name, vendorGroup]) => {
			if (vendorGroup.length > 1) {
				duplicates.push({ name, vendors: vendorGroup });
			}
		});
		
		if (duplicates.length > 0) {
			console.log('🔍 Found duplicate vendors:', duplicates);
			// Auto-merge: keep the complete vendor, remove the stub
			duplicates.forEach(({ name, vendors: vendorGroup }) => {
				const completeVendor = vendorGroup.find(v => !v.isStub);
				const stubVendors = vendorGroup.filter(v => v.isStub);
				
				if (completeVendor && stubVendors.length > 0) {
					console.log(`🧹 Cleaning up ${stubVendors.length} stub vendor(s) for "${completeVendor.name}"`);
					stubVendors.forEach(stub => deleteVendor(stub.id));
				}
			});
		} else {
			console.log('✅ No duplicate vendors found');
		}
	};

	const filteredVendors = vendors.filter(v => (v.type || 'domestic') === activeTab)

	// DISABLED: Auto-cleanup on component mount - caused data loss
	// useEffect(() => {
	// 	if (vendors.length > 0) {
	// 		cleanupDuplicateVendors();
	// 	}
	// }, [vendors.length]); // Only run when vendors are first loaded

	return (
		<section>
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>Vendors</h1>
			</div>

			<div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
				<Tabs
					value={activeTab}
					onChange={v => setActiveTab(v)}
					theme={theme}
					stretch
					options={[
						{ value: 'domestic', label: 'Domestic' },
						{ value: 'international', label: 'International' },
						{ value: 'groupbuy', label: 'Group Buy' },
					]}
				/>
				<button onClick={() => { setEditingVendor({}); setShowAddModal(true); }} className="w-full sm:w-auto px-3 py-2 rounded-md text-sm font-semibold inline-flex items-center justify-center gap-2" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}><PlusCircle className="h-4 w-4" /> New Vendor</button>
			</div>

			<div className="mt-6">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredVendors.map((v, idx) => (
						<VendorCard
							key={v.id || `${v.name || 'vendor'}-${idx}`}
							vendor={v}
							theme={theme}
							onEditClick={(vendor) => { setEditingVendor(vendor); setShowAddModal(true) }}
							onManageProtocolClick={(vendor) => { alert(`Manage protocol for ${vendor.name}`) }}
						/>
					))}
				</div>
			</div>
			
			<VendorDetailsModal 
				open={showAddModal}
				onClose={() => { setShowAddModal(false); setEditingVendor(null) }}
				theme={theme}
				vendor={editingVendor}
                activeTab={activeTab}
				onSave={(data) => {
					if (editingVendor?.id) {
						updateVendor({ ...editingVendor, ...data });
					} else {
						addVendor({ id: Date.now(), ...data });
					}
					setShowAddModal(false)
					setEditingVendor(null)
				}}
				onDelete={(id) => {
					deleteVendor(id);
					setShowAddModal(false)
					setEditingVendor(null)
				}}
			/>
		</section>
	)
}


