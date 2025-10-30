import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'

export default function NotesModal({ open, onClose, theme, notes, onSave }) {
    const [text, setText] = useState('')

    useEffect(() => {
        if (open) {
            setText(notes || '')
        }
    }, [open, notes])

    const handleSave = () => {
        onSave(text)
        onClose()
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Add/Edit Note"
            theme={theme}
            footer={
                <>
                    <button 
                        className="px-4 py-2 rounded-lg border transition-all duration-200 action-button-hover" 
                        style={{ 
                            borderColor: theme.border, 
                            backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                            color: theme.text
                        }} 
                        onClick={onClose}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.secondary;
                            e.currentTarget.style.borderColor = theme.primary;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.cardBackground;
                            e.currentTarget.style.borderColor = theme.border;
                        }}
                    >
                        Cancel
                    </button>
                    <button 
                        className="px-4 py-2 rounded-lg transition-all duration-200 action-button-hover" 
                        style={{ 
                            backgroundColor: theme.primary, 
                            color: theme.textOnPrimary 
                        }} 
                        onClick={handleSave}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.primaryDark || theme.primary;
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${theme.primary}40`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = theme.primary;
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        Save
                    </button>
                </>
            }
        >
            <textarea
                className="w-full p-3 rounded-lg border transition-all duration-200 resize-none focus:outline-none focus:ring-2"
                style={{ 
                    borderColor: theme.border, 
                    minHeight: '150px', 
                    backgroundColor: theme.isDark ? '#1f2937' : theme.secondary, 
                    color: theme.text,
                    outline: 'none',
                    '::placeholder': { color: theme.textLight }
                }}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Enter your notes for this day..."
                onFocus={(e) => {
                    e.currentTarget.style.borderColor = theme.primary;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.primary}20`;
                }}
                onBlur={(e) => {
                    e.currentTarget.style.borderColor = theme.border;
                    e.currentTarget.style.boxShadow = 'none';
                }}
            />
        </Modal>
    )
}
