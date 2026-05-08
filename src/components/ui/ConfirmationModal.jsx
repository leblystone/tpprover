import React from 'react';
import Modal from '../common/Modal';
import { Trash, Warning } from '@phosphor-icons/react';

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
                return <Trash size={20} weight="duotone" style={{ color: getIconColor() }} />;
            case 'primary':
            case 'warning':
            default:
                return <Warning size={20} weight="duotone" style={{ color: getIconColor() }} />;
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
            maxWidth="max-w-sm"
        >
            <div className="py-3 px-4">
                {/* Icon */}
                {!hideIcon && (
                    <div className="mx-auto mb-3">
                        <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center mx-auto"
                            style={{ backgroundColor: getIconBg() }}
                        >
                            {getIcon()}
                        </div>
                    </div>
                )}

                {/* Message */}
                {message && (
                    <p 
                        className="text-sm leading-relaxed mb-3 text-center"
                        style={{ color: theme?.text || theme?.textLight || '#374151' }}
                    >
                        {message}
                    </p>
                )}

                {/* Action Buttons */}
                <div className={`flex gap-2 mt-4 ${!cancelText ? 'justify-center' : ''}`}>
                    {cancelText && (
                        <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); }}
                            onTouchStart={(e) => { e.preventDefault(); }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onClose();
                            }}
                            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80 border touch-manipulation"
                            style={{ 
                                backgroundColor: theme?.cardBackground || theme?.background || '#FFFFFF',
                                color: theme?.text || '#374151',
                                borderColor: theme?.border || '#E5E7EB',
                                WebkitTapHighlightColor: 'transparent'
                            }}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); }}
                        onTouchStart={(e) => { e.preventDefault(); }}
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
                        className={`${cancelText ? 'flex-1' : 'w-full'} px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-90 touch-manipulation`}
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



