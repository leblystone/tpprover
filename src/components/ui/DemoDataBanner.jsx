import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { clearMockData } from '../../utils/seed';

export default function DemoDataBanner({ theme, sticky = false }) {
    const [isRemoving, setIsRemoving] = useState(false);

    const handleDismiss = () => {
        // Only allow dismissing when not sticky
        if (sticky) return;
        try { localStorage.setItem('tpprover_demo_banner_dismissed', 'true'); } catch {}
    };

    const handleRemoveDemoData = async () => {
        if (isRemoving) return;
        
        const confirmed = window.confirm(
            'Are you sure you want to remove all demo data? This will clear all sample protocols, orders, vendors, and other demo content. This action cannot be undone.'
        );
        
        if (!confirmed) return;
        
        setIsRemoving(true);
        try {
            clearMockData();
            // Dispatch event to notify AppContext instead of reloading
            window.dispatchEvent(new CustomEvent('demo-data-cleared'));
        } catch (error) {
            console.error('Error removing demo data:', error);
            alert('Failed to remove demo data. Please try again or use the Settings page.');
            setIsRemoving(false);
        }
    };

    // Warm botanical colors inspired by the research planner aesthetic
    const bannerStyle = {
        backgroundColor: '#F5F1EB', // Warm cream background
        color: '#8B5A3C', // Rich brown text (from the vials/labels)
        borderBottom: '2px solid #A67B5B', // Warm brown border
        borderTop: '1px solid #A67B5B',
    };

    // Dark mode adjustments with warm tones
    if (theme.mode === 'dark' || theme.background === '#1a1a1a') {
        bannerStyle.backgroundColor = '#3D2F26'; // Dark warm brown
        bannerStyle.color = '#E8DDD4'; // Warm light cream
        bannerStyle.borderBottom = '2px solid #A67B5B';
        bannerStyle.borderTop = '1px solid #A67B5B';
    }

    return (
        <div 
            className="px-3 py-2 text-xs flex items-center justify-between gap-3 relative shadow-sm"
            style={bannerStyle}
        >
            <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <p className="font-medium">
                    Viewing <strong>demo data</strong> • Remove when ready to add your own data.
                </p>
            </div>
            
            <div className="flex items-center gap-1">
                <button 
                    onClick={handleRemoveDemoData}
                    disabled={isRemoving}
                    className="px-2 py-1 text-xs rounded font-medium transition-all duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        backgroundColor: '#8B5A3C',
                        color: '#F5F1EB',
                        border: '1px solid #A67B5B'
                    }}
                    onMouseEnter={(e) => {
                        if (!isRemoving) {
                            e.target.style.backgroundColor = '#6D4428';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isRemoving) {
                            e.target.style.backgroundColor = '#8B5A3C';
                        }
                    }}
                    title="Remove all demo data"
                >
                    <Trash2 size={12} />
                    {isRemoving ? 'Removing...' : 'Remove'}
                </button>
                
                {!sticky && (
                    <button 
                        onClick={handleDismiss} 
                        className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-all duration-200"
                        title="Dismiss banner"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>
        </div>
    )
}
