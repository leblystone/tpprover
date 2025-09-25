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
import useLocalStorage from '../utils/hooks'

export default function Vendors() {
	const { theme } = useOutletContext()
	const { vendors, addVendor, updateVendor, deleteVendor } = useAppContext();
	const [editingVendor, setEditingVendor] = useState(null)
	const [activeTab, setActiveTab] = useLocalStorage('tpprover_vendors_tab', 'domestic')
	const [showAddModal, setShowAddModal] = useState(false)
	const [filters, setFilters] = useState({ payment: [], contact: [], label: [] })

	// DISABLED: Dangerous cleanup function that caused data loss
	// This function has been permanently disabled due to critical data loss incident
	// Manual cleanup can be done through UI if needed
	const cleanupDuplicateVendors = () => {
		console.warn('⚠️ Automatic cleanup disabled for safety. Use manual cleanup if needed.');
		return false;
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
					console.log('📝 Vendor save callback triggered:', { editingVendor, data }); // Debug log
					if (editingVendor?.id) {
						console.log('🔄 Updating existing vendor:', editingVendor.id);
						updateVendor({ ...editingVendor, ...data });
					} else {
						console.log('➕ Adding new vendor');
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


