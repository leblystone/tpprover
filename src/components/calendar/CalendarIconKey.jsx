import React from 'react';
import { Droplet, Pill, ShoppingCart, Target, CheckCircle, Syringe, Beaker } from 'lucide-react';

// Helper function to get supplement icon based on delivery method
function getSupplementIcon(delivery, className = "h-4 w-4") {
    switch (String(delivery || '').toLowerCase()) {
        case 'injection': return <Syringe className={className} />;
        case 'powder': return <Beaker className={className} />;
        case 'pill':
        case 'oral':
        default: return <Pill className={className} />;
    }
}

export default function CalendarIconKey({ theme, isVisible, onClose }) {
    if (!isVisible) return null;

    const iconItems = [
        {
            icon: <div className="inline-flex relative"><Droplet className="h-4 w-4" /><Droplet className="h-4 w-4 -ml-1.5" /></div>,
            label: 'Peptides',
            description: 'Number indicates how many peptides scheduled'
        },
        {
            icon: getSupplementIcon('pill', 'h-4 w-4'),
            label: 'Oral Supplements',
            description: 'Pills, capsules, or oral medications'
        },
        {
            icon: getSupplementIcon('injection', 'h-4 w-4'),
            label: 'Injections',
            description: 'Injectable supplements or peptides'
        },
        {
            icon: getSupplementIcon('powder', 'h-4 w-4'),
            label: 'Powder/Research',
            description: 'Powder forms or research compounds'
        },
        {
            icon: <ShoppingCart className="h-4 w-4" />,
            label: 'Orders & Buys',
            description: 'Scheduled purchases or group buys'
        },
        {
            icon: <Target className="h-4 w-4" />,
            label: 'Goals (Incomplete)',
            description: 'Daily goals not yet completed',
            color: 'warning'
        },
        {
            icon: <CheckCircle className="h-4 w-4" />,
            label: 'Goals (Complete)',
            description: 'All daily goals completed',
            color: 'success'
        },
        {
            icon: <span className="text-xs font-bold px-1 py-0.5 rounded">W</span>,
            label: 'Washout Period',
            description: 'Protocol washout or break period',
            color: 'secondary'
        },
        {
            icon: <span className="text-green-500 text-base">✓</span>,
            label: 'All Done',
            description: 'All tasks completed for the day',
            color: 'success'
        }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto" style={{ backgroundColor: theme.cardBackground }}>
                <div className="p-4 border-b" style={{ borderColor: theme.border }}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
                            Calendar Icon Guide
                        </h2>
                        <button 
                            onClick={onClose}
                            className="p-1 rounded-full hover:opacity-70"
                            style={{ color: theme.textLight }}
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                        Learn what each icon means in the monthly calendar view
                    </p>
                </div>

                <div className="p-4 space-y-3">
                    {iconItems.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:opacity-90" style={{ backgroundColor: theme.background }}>
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded" style={{ 
                                backgroundColor: theme.primary + '10',
                                color: item.color ? theme[item.color] : theme.primary 
                            }}>
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm" style={{ color: theme.primaryDark }}>
                                    {item.label}
                                </div>
                                <div className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                                    {item.description}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                    <div className="text-xs" style={{ color: theme.textLight }}>
                        <p className="mb-2"><strong>Mobile vs Desktop:</strong></p>
                        <p className="mb-1">📱 <strong>Mobile:</strong> Shows essential icons and compact counts</p>
                        <p>🖥️ <strong>Desktop:</strong> Shows all icons and detailed peptide names</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
