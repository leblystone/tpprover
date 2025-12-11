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
    theme,
    hideIcon = false
}) {
    const getIconColor = () => {
        switch (type) {
            case 'primary':
                return theme?.primary || theme?.primaryDark || '#7F9E95';
            case 'danger':
            case 'delete':
                return theme?.error || theme?.warning || '#DC2626';
            case 'warning':
            default:
                return theme?.warning || '#F59E0B';
        }
    };

    const getIconBg = () => {
        switch (type) {
            case 'primary':
                return theme?.primary ? `${theme.primary}20` : (theme?.secondary || '#EFF2EE');
            case 'danger':
            case 'delete':
                return theme?.error ? `${theme.error}20` : (theme?.warning ? `${theme.warning}20` : '#DC262620');
            case 'warning':
            default:
                return theme?.warningBg ? `${theme.warningBg}` : (theme?.warning ? `${theme.warning}20` : '#F59E0B20');
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'danger':
            case 'delete':
                return <Trash2 size={24} style={{ color: getIconColor() }} />;
            case 'primary':
            case 'warning':
            default:
                return <AlertTriangle size={24} style={{ color: getIconColor() }} />;
        }
    };

    const getButtonStyle = () => {
        switch (type) {
            case 'primary':
                return {
                    backgroundColor: theme?.primary || '#7F9E95',
                    color: theme?.textOnPrimary || '#FFFFFF'
                };
            case 'danger':
            case 'delete':
                return {
                    background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                    color: '#FFFFFF'
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
            title={title || ""} 
            theme={theme}
            variant="modern"
            maxWidth="max-w-md"
        >
            <div className="py-4 px-6">
                {/* Icon */}
                {!hideIcon && (
                    <div className="mx-auto mb-4">
                        <div 
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                            style={{ backgroundColor: getIconBg() }}
                        >
                            {getIcon()}
                        </div>
                    </div>
                )}

                {/* Message */}
                {message && (
                    <p 
                        className="text-base leading-relaxed mb-4 text-center"
                        style={{ color: theme?.text || theme?.textLight || '#374151' }}
                    >
                        {message}
                    </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onMouseDown={(e) => {
                            // Prevent blur events on mobile
                            e.preventDefault();
                        }}
                        onTouchStart={(e) => {
                            // Prevent blur events on touch devices
                            e.preventDefault();
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                        className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:opacity-80 border touch-manipulation"
                        style={{ 
                            backgroundColor: theme?.cardBackground || theme?.background || '#FFFFFF',
                            color: theme?.text || '#374151',
                            borderColor: theme?.border || '#E5E7EB',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => {
                            // Prevent blur events on mobile
                            e.preventDefault();
                        }}
                        onTouchStart={(e) => {
                            // Prevent blur events on touch devices
                            e.preventDefault();
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onConfirm();
                            onClose();
                        }}
                        onMouseEnter={(e) => {
                            if (type === 'delete' || type === 'danger') {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (type === 'delete' || type === 'danger') {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
                            }
                        }}
                        className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:opacity-90 touch-manipulation"
                        style={{
                            ...getButtonStyle(),
                            WebkitTapHighlightColor: 'transparent'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}



