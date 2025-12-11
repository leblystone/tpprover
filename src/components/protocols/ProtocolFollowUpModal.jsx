import React, { useState } from 'react';
import Modal from '../common/Modal';
import { FileText, Star, X, Save, Calendar } from 'lucide-react';
import { formatMMDDYYYY, getLocalDateString } from '../../utils/date';
import { addNoteToProtocolHistory } from '../../utils/protocolHistory';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';

const QUICK_TAGS = [
    { id: 'met_goals', label: 'Met Goals' },
    { id: 'side_effects', label: 'Side Effects' },
    { id: 'will_repeat', label: 'Will Repeat' },
    { id: 'adjustments_needed', label: 'Adjustments Needed' },
    { id: 'positive_results', label: 'Positive Results' }
];

export default function ProtocolFollowUpModal({ open, onClose, protocol, historyEntryId, theme, onSave }) {
    const [content, setContent] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [rating, setRating] = useState(0);
    const [linkedDate, setLinkedDate] = useState(getLocalDateString());
    const [showLinkedDate, setShowLinkedDate] = useState(false);

    const handleTagToggle = (tagId) => {
        setSelectedTags(prev => 
            prev.includes(tagId) 
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const handleSave = () => {
        if (!content.trim() && selectedTags.length === 0 && rating === 0) {
            // Allow saving empty if user just wants to close
            onClose();
            return;
        }

        if (historyEntryId) {
            const noteData = {
                type: 'follow_up',
                content: content.trim(),
                tags: selectedTags,
                linkedDate: showLinkedDate ? linkedDate : null,
                rating: rating > 0 ? rating : null
            };

            if (addNoteToProtocolHistory(historyEntryId, noteData)) {
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'Follow-up notes saved successfully.', type: 'success' } 
                }));
                window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
                
                if (onSave) onSave();
                handleClose();
            } else {
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'Failed to save follow-up notes.', type: 'error' } 
                }));
            }
        } else {
            onClose();
        }
    };

    const handleClose = () => {
        setContent('');
        setSelectedTags([]);
        setRating(0);
        setLinkedDate(getLocalDateString());
        setShowLinkedDate(false);
        onClose();
    };

    if (!open || !protocol) return null;

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title={`Protocol Follow-Up: ${protocol.protocolName || 'Unnamed Protocol'}`}
            theme={theme}
            variant="modern"
            maxWidth="max-w-2xl"
        >
            <div className="space-y-6">
                {/* Rating Section */}
                <div>
                    <label className="block text-sm font-semibold mb-3" style={{ color: theme.text }}>
                        Overall Assessment
                    </label>
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map(num => (
                            <button
                                key={num}
                                type="button"
                                onClick={() => setRating(num)}
                                className="p-2 rounded-lg transition-all hover:scale-110"
                                style={{
                                    backgroundColor: rating >= num 
                                        ? (theme.isDark ? '#3c4e3a' : '#607c5c')
                                        : (theme.isDark ? '#374151' : '#f3f4f6'),
                                    color: rating >= num ? '#dcfce7' : theme.textLight
                                }}
                            >
                                <Star 
                                    size={24} 
                                    fill={rating >= num ? '#dcfce7' : 'none'}
                                    style={{ color: rating >= num ? '#dcfce7' : theme.textLight }}
                                />
                            </button>
                        ))}
                        {rating > 0 && (
                            <span className="ml-2 text-sm" style={{ color: theme.textLight }}>
                                {rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Below Average' : 'Poor'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Quick Tags */}
                <div>
                    <label className="block text-sm font-semibold mb-3" style={{ color: theme.text }}>
                        Quick Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_TAGS.map(tag => (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => handleTagToggle(tag.id)}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                style={{
                                    backgroundColor: selectedTags.includes(tag.id)
                                        ? theme.primary
                                        : (theme.isDark ? '#374151' : '#f3f4f6'),
                                    color: selectedTags.includes(tag.id)
                                        ? theme.textOnPrimary
                                        : theme.text,
                                    border: `1px solid ${selectedTags.includes(tag.id) ? theme.primary : theme.border}`
                                }}
                            >
                                {tag.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notes Content */}
                <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: theme.text }}>
                        Notes & Observations
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Add your overall assessment, outcomes, side effects, future considerations, or any other notes about this protocol..."
                        className="w-full p-3 rounded-lg text-sm resize-none"
                        rows={8}
                        style={{
                            backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                            border: `1px solid ${theme.border}`,
                            color: theme.text
                        }}
                    />
                </div>

                {/* Link to Calendar */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: theme.text }}>
                        <input
                            type="checkbox"
                            checked={showLinkedDate}
                            onChange={(e) => setShowLinkedDate(e.target.checked)}
                            className="rounded"
                            style={{ accentColor: theme.primary }}
                        />
                        <Calendar size={16} />
                        <span>Show this note in calendar</span>
                    </label>
                    {showLinkedDate && (
                        <div className="mt-2">
                            <GlassmorphismDatePicker
                                value={linkedDate}
                                onChange={setLinkedDate}
                                theme={theme}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 mt-6" style={{
                borderTop: theme.isDark ? '1px solid #374151' : `1px solid ${theme.border}`
            }}>
                <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg font-medium transition-all"
                    style={{ 
                        backgroundColor: theme.isDark ? '#374151' : '#f3f4f6',
                        color: theme.text
                    }}
                >
                    Skip for Now
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
                    style={{ 
                        backgroundColor: theme.primary, 
                        color: theme.textOnPrimary 
                    }}
                >
                    <Save size={16} />
                    Save Follow-Up
                </button>
            </div>
        </Modal>
    );
}

