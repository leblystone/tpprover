import React from 'react';
import { Info, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DemoDataBanner({ theme, sticky = false }) {
    const navigate = useNavigate();

    const handleDismiss = () => {
        // Only allow dismissing when not sticky
        if (sticky) return;
        try { localStorage.setItem('tpprover_demo_banner_dismissed', 'true'); } catch {}
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
                You are viewing <strong>demo data</strong>. This content is fake and for exploration only.
                <button onClick={handleNavigate} className="font-semibold underline hover:opacity-80 ml-2">
                    Manage demo data in Settings
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
