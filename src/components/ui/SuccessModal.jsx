import React from 'react';
import Modal from '../common/Modal';
import { CheckCircle, Sparkles } from 'lucide-react';

export default function SuccessModal({ open, onClose, title, message, theme }) {
    return (
        <Modal 
            open={open} 
            onClose={onClose} 
            title={title || "Success!"} 
            theme={theme}
            maxWidth="max-w-md"
        >
            <div className="text-center py-6">
                {/* Success Icon with Animation */}
                <div className="mx-auto mb-6 relative">
                    <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-pulse"
                        style={{ backgroundColor: `${theme.success}20` }}
                    >
                        <CheckCircle 
                            size={48} 
                            style={{ color: theme.success }}
                            className="animate-bounce"
                        />
                    </div>
                    {/* Sparkle effects */}
                    <Sparkles 
                        size={16} 
                        style={{ color: theme.success }} 
                        className="absolute top-2 right-2 animate-ping"
                    />
                    <Sparkles 
                        size={12} 
                        style={{ color: theme.success, animationDelay: '0.5s' }} 
                        className="absolute bottom-3 left-3 animate-ping"
                    />
                </div>

                {/* Success Message */}
                <div className="space-y-3">
                    <p 
                        className="text-lg font-semibold"
                        style={{ color: theme.text }}
                    >
                        {message || "Operation completed successfully!"}
                    </p>
                    
                    {/* Subtle success indicator */}
                    <div 
                        className="w-16 h-1 rounded-full mx-auto"
                        style={{ backgroundColor: theme.success }}
                    />
                </div>

                {/* Action Button */}
                <div className="mt-8">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg"
                        style={{ 
                            backgroundColor: theme.success,
                            boxShadow: `0 4px 12px ${theme.success}30`
                        }}
                    >
                        Perfect!
                    </button>
                </div>
            </div>
        </Modal>
    );
}
