import React, { useState, useEffect, useMemo } from 'react';
import { FlaskConical, Plus, FileText, X, Calendar, Clock, Pipette, PenTool } from 'lucide-react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { findActiveProtocolHistoryEntry, addNoteToProtocolHistory, saveProtocolHistoryEntry } from '../../utils/protocolHistory';
import { formatMMDDYYYY, getLocalDateString } from '../../utils/date';
import ExpandableTooltip from '../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../utils/widgetTooltips';

const NOTE_TAGS = [
    { id: 'progress', label: 'Progress', color: '#10b981' },
    { id: 'side_effects', label: 'Side Effects', color: '#ef4444' },
    { id: 'adjustment', label: 'Adjustment', color: '#f59e0b' },
    { id: 'observation', label: 'Observation', color: '#3b82f6' },
    { id: 'question', label: 'Question', color: '#8b5cf6' }
];

export default function ActiveProtocolsNotes({ protocols = [], theme, onAddNote }) {
    const [selectedProtocol, setSelectedProtocol] = useState(null);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [protocolsWithNotes, setProtocolsWithNotes] = useState([]);

    // Filter to only active protocols
    const activeProtocols = useMemo(() => {
        return protocols.filter(p => {
            if (p?.active !== true) return false;
            if (!p?.startDate) return false;
            const today = new Date();
            const s = new Date(p.startDate);
            if (today < new Date(s.getFullYear(), s.getMonth(), s.getDate())) return false;
            if (p.endDate) {
                const e = new Date(p.endDate);
                return today <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
            }
            const d = p.duration || {};
            if (d.noEnd || !d.count || !d.unit) return true;
            const e = new Date(s);
            if (String(d.unit).toLowerCase() === 'day') e.setDate(e.getDate() + Number(d.count));
            else if (String(d.unit).toLowerCase() === 'week') e.setDate(e.getDate() + Number(d.count) * 7);
            else if (String(d.unit).toLowerCase() === 'month') e.setMonth(e.getMonth() + Number(d.count));
            return today <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
        });
    }, [protocols]);

    // Load notes count for each active protocol
    useEffect(() => {
        const protocolsWithData = activeProtocols.map(protocol => {
            const activeEntry = findActiveProtocolHistoryEntry(protocol.id);
            const notes = activeEntry?.notes || [];
            const duringNotes = notes.filter(n => n.type === 'during');
            const latestNote = duringNotes.length > 0 
                ? duringNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
                : null;
            
            return {
                ...protocol,
                notesCount: duringNotes.length,
                latestNote
            };
        });
        setProtocolsWithNotes(protocolsWithData);
    }, [activeProtocols]);

    const handleAddNoteClick = (protocol) => {
        setSelectedProtocol(protocol);
        setNoteContent('');
        setSelectedTags([]);
        setShowNoteModal(true);
    };

    const handleTagToggle = (tagId) => {
        setSelectedTags(prev => 
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const handleSaveNote = () => {
        if (!selectedProtocol || (!noteContent.trim() && selectedTags.length === 0)) {
            return;
        }

        let activeEntry = findActiveProtocolHistoryEntry(selectedProtocol.id);
        
        // If no history entry exists but protocol is active, create one
        if (!activeEntry && selectedProtocol.active && selectedProtocol.startDate) {
            const protocolName = selectedProtocol.name || selectedProtocol.protocolName || 'Unnamed Protocol';
            const historyId = saveProtocolHistoryEntry({
                protocolId: selectedProtocol.id,
                protocolName: protocolName,
                startDate: selectedProtocol.startDate,
                protocolData: {
                    protocolName: protocolName,
                    peptides: selectedProtocol.peptides || [],
                    duration: selectedProtocol.duration || {},
                    purpose: selectedProtocol.purpose || '',
                    linkedItems: selectedProtocol.linkedItems || {}
                },
                vials: [],
                reconstitutionData: null,
                skippedReconstitution: null
            });
            
            if (historyId) {
                // Reload the entry
                activeEntry = findActiveProtocolHistoryEntry(selectedProtocol.id);
                window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
            }
        }
        
        if (!activeEntry) {
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                detail: { message: 'Protocol must be started to add notes.', type: 'error' } 
            }));
            setShowNoteModal(false);
            return;
        }

        const noteData = {
            type: 'during',
            content: noteContent.trim(),
            tags: selectedTags,
            linkedDate: getLocalDateString() // Automatically link to today's date so it appears in calendar
        };

        if (addNoteToProtocolHistory(activeEntry.id, noteData)) {
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                detail: { message: 'Note added successfully.', type: 'success' } 
            }));
            window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
            
            // Refresh notes count
            const updatedEntry = findActiveProtocolHistoryEntry(selectedProtocol.id);
            const notes = updatedEntry?.notes || [];
            const duringNotes = notes.filter(n => n.type === 'during');
            const latestNote = duringNotes.length > 0 
                ? duringNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
                : null;
            
            setProtocolsWithNotes(prev => prev.map(p => 
                p.id === selectedProtocol.id 
                    ? { ...p, notesCount: duringNotes.length, latestNote }
                    : p
            ));
            
            setShowNoteModal(false);
            setNoteContent('');
            setSelectedTags([]);
            if (onAddNote) onAddNote(selectedProtocol.id);
        } else {
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                detail: { message: 'Failed to add note.', type: 'error' } 
            }));
        }
    };

    // Format protocol duration
    const formatDuration = (protocol) => {
        if (protocol.duration?.noEnd) return null; // Don't show "Ongoing" - it's redundant in active research
        if (protocol.duration?.count && protocol.duration?.unit) {
            const count = protocol.duration.count;
            const unit = protocol.duration.unit;
            return `${count} ${unit}${count > 1 ? 's' : ''}`;
        }
        return null; // Don't show "Duration not set" - it's not essential info
    };

    // Get delivery method icon for protocol
    const getDeliveryMethodIcon = (protocol) => {
        if (!protocol.peptides || protocol.peptides.length === 0) {
            return <Pipette size={14} style={{ color: theme.textLight }} />;
        }
        
        // Check if any peptide uses pen delivery
        const hasPenDelivery = protocol.peptides.some(pep => {
            const deliveryMethod = pep.deliveryMethod || 'pipette';
            return deliveryMethod === 'pen';
        });
        
        if (hasPenDelivery) {
            return <PenTool size={14} style={{ color: theme.textLight }} />;
        }
        
        // Default to pipette/syringe
        return <Pipette size={14} style={{ color: theme.textLight }} />;
    };

    // Calculate days active
    const getDaysActive = (protocol) => {
        if (!protocol.startDate) return null;
        const start = new Date(protocol.startDate);
        const today = new Date();
        const diffTime = Math.abs(today - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Format peptides list with proper pluralization
    const formatPeptidesList = (protocol) => {
        if (!protocol.peptides || protocol.peptides.length === 0) {
            return null;
        }
        
        const peptideNames = protocol.peptides
            .map(pep => pep.name || 'Unnamed Peptide')
            .filter(name => name && name.trim() !== '');
        
        if (peptideNames.length === 0) {
            return null;
        }
        
        if (peptideNames.length === 1) {
            return `Includes ${peptideNames[0]}`;
        } else if (peptideNames.length === 2) {
            return `Includes ${peptideNames[0]} and ${peptideNames[1]}`;
        } else {
            const lastPeptide = peptideNames[peptideNames.length - 1];
            const otherPeptides = peptideNames.slice(0, -1).join(', ');
            return `Includes ${otherPeptides}, and ${lastPeptide}`;
        }
    };

    if (activeProtocols.length === 0) {
        return (
            <div className="h-full flex flex-col p-4 lg:p-6 rounded-xl content-card w-full" style={{ backgroundColor: theme.white }}>
                <h3 className="text-sm lg:text-base font-semibold mb-3 lg:mb-4 border-b pb-2 lg:pb-3 flex-shrink-0 flex items-center justify-between" style={{ color: theme.text, borderColor: theme.border }}>
                    <span className="flex items-center gap-2">
                        Active Research
                        <FlaskConical size={18} className="lg:w-5 lg:h-5" style={{ color: theme.primary }} />
                    </span>
                    <ExpandableTooltip content={WIDGET_TOOLTIPS.active_protocols_notes} theme={theme} position="left" />
                </h3>
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm lg:text-base text-center" style={{ color: theme.textLight }}>
                        No active protocols. Start a protocol to begin tracking.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="h-full flex flex-col p-4 lg:p-6 rounded-xl content-card w-full overflow-hidden" style={{ backgroundColor: theme.white }}>
                <h3 className="text-sm lg:text-base font-semibold mb-3 lg:mb-4 border-b pb-2 lg:pb-3 flex-shrink-0 flex items-center justify-between" style={{ color: theme.text, borderColor: theme.border }}>
                    <span className="flex items-center gap-2">
                        Active Research
                        <FlaskConical size={18} className="lg:w-5 lg:h-5" style={{ color: theme.primary }} />
                    </span>
                    <div className="flex items-center gap-2">
                        <ExpandableTooltip content={WIDGET_TOOLTIPS.active_protocols_notes} theme={theme} position="left" />
                    </div>
                </h3>
                
                <div className="flex-1 overflow-y-auto min-h-0 space-y-3 lg:space-y-4">
                    {protocolsWithNotes.map((protocol) => {
                        const protocolName = protocol.name || protocol.protocolName || 'Unnamed Protocol';
                        const duration = formatDuration(protocol);
                        const daysActive = getDaysActive(protocol);
                        const startDate = protocol.startDate ? formatMMDDYYYY(new Date(protocol.startDate)) : null;
                        const deliveryIcon = getDeliveryMethodIcon(protocol);
                        
                        return (
                            <div 
                                key={protocol.id} 
                                className="p-3 lg:p-4 rounded-lg border transition-all hover:opacity-90"
                                style={{ 
                                    borderColor: theme.border,
                                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
                                }}
                            >
                                <div className="space-y-2 lg:space-y-3">
                                    {/* Protocol Header */}
                                    <div className="flex items-center justify-between gap-2 lg:gap-3">
                                        <div className="flex items-center gap-2 lg:gap-2.5 flex-1 min-w-0">
                                            {deliveryIcon}
                                            <div className="font-semibold text-sm lg:text-base truncate" style={{ color: theme.text }}>
                                                {protocolName}
                                            </div>
                                        </div>
                                        {daysActive !== null && (
                                            <span className="flex items-center gap-1 text-xs lg:text-sm flex-shrink-0" style={{ color: theme.textLight }}>
                                                <Clock size={11} className="lg:w-3.5 lg:h-3.5" />
                                                Day {daysActive}
                                            </span>
                                        )}
                                    </div>

                                    {/* Protocol Details */}
                                    <div className="flex items-center justify-between gap-2 lg:gap-3 text-xs lg:text-sm" style={{ color: theme.textLight }}>
                                        <div className="flex flex-wrap items-center gap-2 lg:gap-3 min-w-0 overflow-hidden">
                                            {startDate && (
                                                <span className="flex items-center gap-1 whitespace-nowrap">
                                                    <Calendar size={11} className="flex-shrink-0 lg:w-3.5 lg:h-3.5" />
                                                    {startDate}
                                                </span>
                                            )}
                                            {duration && (
                                                <span className="flex items-center gap-1 whitespace-nowrap">
                                                    <Clock size={11} className="flex-shrink-0 lg:w-3.5 lg:h-3.5" />
                                                    {duration}
                                                </span>
                                            )}
                                            {formatPeptidesList(protocol) && (
                                                <span className="flex items-center gap-1 whitespace-nowrap">
                                                    <FlaskConical size={11} className="flex-shrink-0 lg:w-3.5 lg:h-3.5" />
                                                    {formatPeptidesList(protocol)}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddNoteClick(protocol);
                                            }}
                                            className="px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors flex items-center gap-1.5 lg:gap-2 flex-shrink-0 hover:opacity-90 whitespace-nowrap"
                                            style={{ 
                                                backgroundColor: theme.primary,
                                                color: '#ffffff'
                                            }}
                                        >
                                            <Plus size={12} className="lg:w-3.5 lg:h-3.5" strokeWidth={2.5} />
                                            Add Note
                                        </button>
                                    </div>

                                    {/* Latest Note Preview */}
                                    {protocol.latestNote && (
                                        <div 
                                            className="p-2 lg:p-3 rounded border text-xs lg:text-sm"
                                            style={{ 
                                                borderColor: theme.border,
                                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                            }}
                                        >
                                            <div className="flex items-center gap-2 lg:gap-2.5 mb-1 lg:mb-1.5">
                                                <FileText size={11} className="lg:w-3.5 lg:h-3.5" style={{ color: theme.primary }} />
                                                <span className="font-medium" style={{ color: theme.text }}>
                                                    Latest Note
                                                </span>
                                                <span className="text-xs lg:text-sm" style={{ color: theme.textLight }}>
                                                    {formatMMDDYYYY(protocol.latestNote.createdAt)}
                                                </span>
                                            </div>
                                            <div className="line-clamp-2" style={{ color: theme.textLight }}>
                                                {protocol.latestNote.content}
                                            </div>
                                            {protocol.notesCount > 1 && (
                                                <div className="mt-1 lg:mt-1.5 text-xs lg:text-sm" style={{ color: theme.textLight }}>
                                                    +{protocol.notesCount - 1} more note{protocol.notesCount - 1 !== 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Add Note Modal */}
            <Modal
                open={showNoteModal}
                onClose={() => {
                    setShowNoteModal(false);
                    setNoteContent('');
                    setSelectedTags([]);
                }}
                title={`Add Note: ${selectedProtocol?.name || selectedProtocol?.protocolName || 'Protocol'}`}
                theme={theme}
                maxWidth="max-w-2xl"
                variant="modern"
            >
                <div className="space-y-4">
                    <TextInput
                        label="Research Note"
                        value={noteContent}
                        onChange={setNoteContent}
                        placeholder="Record observations, progress, side effects, or adjustments..."
                        theme={theme}
                        outlined={true}
                        multiline={true}
                        rows={5}
                        customTextColor={theme.isDark ? null : "#181A18"}
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />

                    <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: theme.textLight }}>
                            Tags (optional)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {NOTE_TAGS.map(tag => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleTagToggle(tag.id)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                    style={{
                                        backgroundColor: selectedTags.includes(tag.id)
                                            ? tag.color
                                            : (theme.isDark ? '#374151' : '#f3f4f6'),
                                        color: selectedTags.includes(tag.id)
                                            ? '#ffffff'
                                            : theme.text,
                                        border: `1px solid ${selectedTags.includes(tag.id) ? tag.color : theme.border}`
                                    }}
                                >
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: theme.border }}>
                        <button
                            onClick={() => {
                                setShowNoteModal(false);
                                setNoteContent('');
                                setSelectedTags([]);
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 border"
                            style={{ 
                                borderColor: theme.border,
                                color: theme.text
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveNote}
                            disabled={!noteContent.trim() && selectedTags.length === 0}
                            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ 
                                backgroundColor: theme.primary,
                                color: theme.textOnPrimary || '#ffffff',
                                border: 'none',
                                boxShadow: theme?.isDark ? '0 4px 10px rgba(0,0,0,0.35)' : '0 4px 10px rgba(0,0,0,0.15)'
                            }}
                        >
                            Save Note
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

