import React from 'react';
import { Info, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearMockData } from '../../utils/seed';

export default function DemoDataBanner({ theme, sticky = false }) {
    const navigate = useNavigate();

    const handleDismiss = () => {
        // Only allow dismissing when not sticky
        if (sticky) return;
        try { localStorage.setItem('tpprover_demo_banner_dismissed', 'true'); } catch {}
    };

    const handleClearData = () => {
        if (window.confirm("Are you sure you want to remove the sample demo data? Your own entries will not be affected.")) {
            clearMockData();
            localStorage.setItem('tpprover_demo_data_cleared', 'true');
            localStorage.setItem('tpprover_demo_banner_dismissed', 'true');
            window.location.reload();
        }
    };

    const handleNavigate = () => {
        navigate('/settings');
    }

    return (
        <div 
            className="p-3 text-sm flex items-center justify-center gap-4 relative"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        >
            <Info size={20} />
            <p>
                You are viewing <strong>demo data</strong>. 
                <button onClick={handleClearData} className="font-semibold underline hover:opacity-80 ml-2">
                    Remove Now
                </button>
                 <span className="mx-1">|</span> 
                <button onClick={handleNavigate} className="font-semibold underline hover:opacity-80">
                    Manage in Settings
                </button>
            </p>
            {!sticky && (
                <button onClick={handleDismiss} className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-80">
                    <X size={18} />
                </button>
            )}
        </div>
    )
}
