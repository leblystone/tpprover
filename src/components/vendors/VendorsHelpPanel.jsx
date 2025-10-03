import React, { useState } from 'react';
import { 
	HelpCircle, 
	X, 
	ChevronDown, 
	Store, 
	PlusCircle, 
	Globe, 
	Users, 
	FileText, 
	Phone, 
	CreditCard, 
	Package, 
	AlertCircle,
	CheckCircle
} from 'lucide-react';

export default function VendorsHelpPanel({ theme }) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isDismissed, setIsDismissed] = useState(
		localStorage.getItem('vendorsHelpDismissed') === 'true'
	);

	const handleDismiss = () => {
		setIsDismissed(true);
		localStorage.setItem('vendorsHelpDismissed', 'true');
	};

	if (isDismissed) return null;

	const steps = [
		{
			icon: PlusCircle,
			title: 'Add Vendors',
			description: 'Create vendor profiles with contact information, payment methods, and shipping details.'
		},
		{
			icon: Store,
			title: 'Organize by Type',
			description: 'Categorize vendors as domestic, international, or group buy for better organization.'
		},
		{
			icon: FileText,
			title: 'Track Information',
			description: 'Store contact details, payment preferences, shipping methods, and order history.'
		},
		{
			icon: Package,
			title: 'Link to Orders',
			description: 'Connect vendors to your orders for seamless tracking and management.'
		},
		{
			icon: CheckCircle,
			title: 'Manage Relationships',
			description: 'Keep track of trusted suppliers, preferred payment methods, and shipping preferences.'
		}
	];

	const features = [
		{ label: 'Contact Management', color: 'blue' },
		{ label: 'Payment Tracking', color: 'green' },
		{ label: 'Shipping Info', color: 'purple' },
		{ label: 'Order History', color: 'orange' },
		{ label: 'Type Organization', color: 'pink' },
		{ label: 'Quick Access', color: 'teal' }
	];

	const getFeatureColor = (color) => {
		const colors = {
			blue: 'bg-blue-100 text-blue-800',
			green: 'bg-green-100 text-green-800',
			purple: 'bg-purple-100 text-purple-800',
			orange: 'bg-orange-100 text-orange-800',
			pink: 'bg-pink-100 text-pink-800',
			teal: 'bg-teal-100 text-teal-800'
		};
		return colors[color] || 'bg-gray-100 text-gray-800';
	};

	if (!isExpanded) {
		return (
			<div className="mb-6 flex justify-center">
				<div className="flex items-center gap-2">
					<button
						onClick={() => setIsExpanded(true)}
						className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all hover:shadow-md hover:scale-105"
						style={{ 
							borderColor: theme.primary + '40', 
							color: theme.primary,
							backgroundColor: theme.primary + '08'
						}}
					>
						<HelpCircle size={18} />
						<span>How does vendor management work?</span>
						<ChevronDown size={16} />
					</button>
					<button
						onClick={handleDismiss}
						className="p-2 rounded-full hover:bg-gray-100 transition-colors"
						style={{ color: theme.textLight }}
						title="Dismiss permanently"
					>
						<X size={18} />
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="mb-6 flex justify-center">
			<div className="w-full max-w-4xl rounded-xl border-2 p-4 md:p-6 shadow-lg" style={{ backgroundColor: theme.cardBackground, borderColor: theme.primary + '20' }}>
				<div className="flex items-center justify-between mb-4 md:mb-6">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg" style={{ backgroundColor: theme.primary + '15' }}>
							<Store size={20} className="md:w-6 md:h-6" style={{ color: theme.primary }} />
						</div>
						<h3 className="text-base md:text-lg font-bold" style={{ color: theme.text }}>
							How Vendor Management Works
						</h3>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setIsExpanded(false)}
							className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
							style={{ color: theme.textLight }}
							title="Collapse"
						>
							<ChevronDown size={18} className="md:w-5 md:h-5 rotate-180" />
						</button>
						<button
							onClick={handleDismiss}
							className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
							style={{ color: theme.textLight }}
							title="Dismiss permanently"
						>
							<X size={18} className="md:w-5 md:h-5" />
						</button>
					</div>
				</div>

				<div className="space-y-2 md:space-y-4">
					{steps.map((step, index) => (
						<div key={index} className="flex items-start gap-3 p-2 md:p-3 rounded-lg" style={{ backgroundColor: theme.background + '50' }}>
							<div className="flex-shrink-0 p-1.5 md:p-2 rounded-lg" style={{ backgroundColor: theme.primary + '15' }}>
								<step.icon size={16} className="md:w-5 md:h-5" style={{ color: theme.primary }} />
							</div>
							<div className="flex-1 min-w-0">
								<h4 className="text-sm md:text-base font-semibold mb-0.5 md:mb-1" style={{ color: theme.text }}>
									{step.title}
								</h4>
								<p className="text-xs md:text-sm" style={{ color: theme.textLight }}>
									{step.description}
								</p>
							</div>
						</div>
					))}
				</div>

				<div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t" style={{ borderColor: theme.primary + '20' }}>
					<h4 className="text-sm md:text-base font-semibold mb-3" style={{ color: theme.text }}>
						Key Features
					</h4>
					<div className="flex flex-wrap gap-1.5 md:gap-2">
						{features.map((feature, index) => (
							<span
								key={index}
								className={`px-2 py-1 rounded-full text-xs font-medium ${getFeatureColor(feature.color)}`}
							>
								{feature.label}
							</span>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
