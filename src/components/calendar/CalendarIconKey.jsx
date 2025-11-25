import React from 'react';
import { Pill, ShoppingCart, Target, CheckCircle, Beaker, Pipette, Droplet } from 'lucide-react';

// Helper function to get supplement icon based on delivery method
function getSupplementIcon(delivery, className = "h-4 w-4") {
    switch (String(delivery || '').toLowerCase()) {
        case 'injection': return <Pipette className={className} />;
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
            icon: <CheckCircle className="h-4 w-4" style={{ color: '#4CAF50' }} />,
            label: 'All Research Completed',
            description: 'Circle check mark shows all research for the day has been completed'
        },
        {
            icon: <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#73796D' }} />,
            label: 'Research Incomplete',
            description: 'Grey dot indicates there is still research to be completed'
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
            icon: <ShoppingCart className="h-4 w-4" />,
            label: 'Orders & Buys',
            description: 'Scheduled purchases or group buys'
        },
        {
            icon: <span className="text-xs font-bold px-1.5 py-0.5 rounded border-2 border-gray-600 text-white bg-gray-600">W</span>,
            label: 'Washout Period',
            description: 'Protocol washout or break period',
            color: 'secondary'
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
            </div>
        </div>
    );
}
