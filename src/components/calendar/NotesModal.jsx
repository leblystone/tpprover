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
                    <button className="px-3 py-2 rounded-md border" style={{ borderColor: theme.border }} onClick={onClose}>Cancel</button>
                    <button className="px-3 py-2 rounded-md" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={handleSave}>Save</button>
                </>
            }
        >
            <textarea
                className="w-full p-2 rounded-md border"
                style={{ borderColor: theme.border, minHeight: '150px', backgroundColor: theme.secondary, color: theme.text }}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Enter your notes for this day..."
            />
        </Modal>
    )
}
