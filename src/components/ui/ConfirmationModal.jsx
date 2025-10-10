import React from 'react';
import Modal from '../common/Modal';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function ConfirmationModal({ 
    open, 
    onClose, 
    onConfirm, 
    title = "Confirm Action", 
    message, 
    confirmText = "Confirm", 
    cancelText = "Cancel",
    type = "warning",
    theme 
}) {
    const getIcon = () => {
        switch (type) {
            case 'danger':
            case 'delete':
                return <Trash2 size={24} style={{ color: theme?.danger || '#DC2626' }} />;
            case 'warning':
            default:
                return <AlertTriangle size={24} style={{ color: theme?.warning || '#F59E0B' }} />;
        }
    };

    const getButtonStyle = () => {
        switch (type) {
            case 'danger':
            case 'delete':
                return {
                    backgroundColor: theme?.danger || '#DC2626',
                    color: theme?.textOnPrimary || '#FFFFFF'
                };
            case 'warning':
            default:
                return {
                    backgroundColor: theme?.warning || '#F59E0B',
                    color: theme?.textOnPrimary || '#FFFFFF'
                };
        }
    };

    return (
        <Modal 
            open={open} 
            onClose={onClose} 
            title="" 
            theme={theme}
            variant="modern"
            maxWidth="max-w-md"
        >
            <div className="text-center py-6 px-4">
                {/* Icon */}
                <div className="mx-auto mb-4">
                    <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                        style={{ backgroundColor: `${theme?.warning || '#F59E0B'}20` }}
                    >
                        {getIcon()}
                    </div>
                </div>

                {/* Title */}
                <h3 
                    className="text-xl font-bold mb-3"
                    style={{ color: theme?.primaryDark || '#344E41' }}
                >
                    {title}
                </h3>

                {/* Message */}
                <p 
                    className="text-base leading-relaxed mb-6"
                    style={{ color: theme?.text || '#374151' }}
                >
                    {message}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80 border"
                        style={{ 
                            backgroundColor: theme?.border || '#E5E7EB',
                            color: theme?.text || '#374151',
                            borderColor: theme?.border || '#E5E7EB'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-90"
                        style={getButtonStyle()}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}


