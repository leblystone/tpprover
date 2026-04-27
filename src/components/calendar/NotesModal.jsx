import React, { useState, useEffect } from 'react'
import BottomSheet from '../common/BottomSheet'

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
        <BottomSheet
            open={open}
            onClose={onClose}
            title="Day Note"
            theme={theme}
            fitContent
            seamlessContent={false}
        >
            <div className="px-4 pb-4 pt-2 space-y-3">
                <textarea
                    rows={4}
                    className="w-full px-3.5 py-3 rounded-xl border transition-all duration-200 resize-none focus:outline-none text-sm"
                    style={{
                        borderColor: theme.border,
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.secondary,
                        color: theme.text,
                    }}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="How did you feel today? Any side effects, dose changes, observations…"
                    autoFocus
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = theme.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.primary}20`;
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.border;
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                />
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-[0.98]"
                        style={{ borderColor: theme.border, color: theme.text, backgroundColor: 'transparent' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
                        style={{ backgroundColor: theme.primary, boxShadow: `0 2px 8px ${theme.primary}40` }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </BottomSheet>
    )
}
