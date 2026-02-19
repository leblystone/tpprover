import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext, useLocation } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import { formatMMDDYYYY, getLocalDateString, parseDateString, normalizeToMidnight } from '../utils/date'
import BottomSheet from '../components/common/BottomSheet'
import Modal from '../components/common/Modal'
import TextInput from '../components/common/inputs/TextInput'
import ProtocolEditorModal from '../components/protocols/ProtocolEditorModal'
import QuickStartProtocolModal from '../components/protocols/QuickStartProtocolModal'
import { exportToCSV } from '../utils/export'
import { PlusCircle, Plus, FileText, Clock, ChevronDown, ChevronRight, Pipette, Pen, Droplets, CalendarCheck, Target, History, CalendarX, SunDim, SunMedium, Sun, Moon, Calendar, Sunset, MoonStar, ClockPlus, Settings, TestTubes, Filter, CheckCircle2, XCircle, List, FlaskConical, BookOpenCheck, Edit as EditIcon, Share2, NotebookPen, Edit3, Trash2, X, Image, Copy, Check, Eye, Play, Zap, Download } from 'lucide-react'
import SearchableDropdown from '../components/common/SearchableDropdown'
import VendorSuggestInput from '../components/vendors/VendorSuggestInput'
import ColorSwatchDropdown from '../components/common/inputs/ColorSwatchDropdown'
import GlassmorphismDatePicker from '../components/common/GlassmorphismDatePicker'
import TimePicker15Min from '../components/common/inputs/TimePicker15Min'
import { penColors } from '../utils/penColors'
import { formatCurrency } from '../utils/currencyUtils'
import ProtocolCard from '../components/protocols/ProtocolCard'
import ProtocolHistoryModal from '../components/protocols/ProtocolHistoryModal';
import ProtocolHistoryDetailModal from '../components/protocols/ProtocolHistoryDetailModal';
import StartProtocolWizard from '../components/protocols/StartProtocolWizard';
import ProtocolsTipsBanner from '../components/protocols/ProtocolsTipsBanner';
import EditActiveProtocolVials from '../components/protocols/EditActiveProtocolVials';
import ProtocolFollowUpModal from '../components/protocols/ProtocolFollowUpModal';
import EndProtocolAssessment from '../components/protocols/EndProtocolAssessment';
import ShareModal from '../components/common/ShareModal';
import ProtocolNotesModal from '../components/protocols/ProtocolNotesModal';
import VisualSchedulePreview from '../components/protocols/VisualSchedulePreview';
import { useAppContext } from '../context/AppContext';
import { generateId } from '../utils/string';
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess';
import UpgradeModal from '../components/common/UpgradeModal';
import Tabs from '../components/common/Tabs';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { saveProtocolHistoryEntry, updateProtocolHistoryEntry, findActiveProtocolHistoryEntry, migrateProtocolHistoryEntries, migrateProtocolHistoryCompletionStatus, addVialToActiveProtocol, getProtocolHistory, addNoteToProtocolHistory, updateNoteInProtocolHistory, deleteNoteFromProtocolHistory, getProtocolHistoryEntries } from '../utils/protocolHistory';
import { prepareItemForSave } from '../utils/userDataSave';
import CustomDropdown from '../components/common/inputs/CustomDropdown';
import { loadSettings, saveSettings, getDefaultSettings, syncNotificationSettingsToFirestore } from '../utils/settingsHelpers';
import pwaNotificationService from '../services/pwaNotifications';
import { Capacitor } from '@capacitor/core';
import { encodeShareData, SHARE_BASE_PATH } from '../utils/share';
import { toPng } from 'html-to-image';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import SharedProtocolCard from '../components/share/SharedProtocolCard';
import ReconCalculatorModal from '../components/recon/ReconCalculatorModal';
import { useRef, useMemo } from 'react';

export default function Protocols() {
  const { theme } = useOutletContext()
  const location = useLocation()
  const { protocols, setProtocols, addProtocol, updateProtocol, updateProtocolWithForceSync, deleteProtocol, stockpile, setStockpile, reconItems, setReconItems, reconHistory, setReconHistory, orders, vendors } = useAppContext();
  const { isReadOnly } = useSubscriptionAccess();
  const [activeTab, setActiveTab] = useState('protocols'); // 'protocols' | 'history' | 'reminders'
  const [openAdd, setOpenAdd] = useState(false)
  const [openQuickStart, setOpenQuickStart] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [editing, setEditing] = useState(null)
  const [startConfirm, setStartConfirm] = useState(null)
  const [historyProtocol, setHistoryProtocol] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [hoveredHistoryId, setHoveredHistoryId] = useState(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);
  const [startDate, setStartDate] = useState(() => getLocalDateString())
  const [manageConfirm, setManageConfirm] = useState(null);
  const [manageTab, setManageTab] = useState('manage'); // 'manage' | 'edit' | 'notes' | 'share' | 'history'
  const [expandedManageSections, setExpandedManageSections] = useState({
    settings: false, // Protocol Settings collapsed by default
    vials: false // Vials & Delivery Methods collapsed by default
  });
  const [editFromManage, setEditFromManage] = useState(null); // Track if editing from manage modal
  const [historyFromManage, setHistoryFromManage] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteFromEditor, setDeleteFromEditor] = useState(null);
  const [followUpProtocol, setFollowUpProtocol] = useState(null);
  const [followUpHistoryId, setFollowUpHistoryId] = useState(null);
  const [showProtocolEndedConfirm, setShowProtocolEndedConfirm] = useState(false);
  const [endedProtocolName, setEndedProtocolName] = useState(null);
  const [timeModalOpen, setTimeModalOpen] = useState({ am: false, pm: false });
  const [customTimeInput, setCustomTimeInput] = useState({ am: '', pm: '' });
  const [protocolFilter, setProtocolFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [reconModalOpen, setReconModalOpen] = useState(false);
  const [reconPrefill, setReconPrefill] = useState(null);
  const [showDateChangeTip, setShowDateChangeTip] = useState(false);
  const [dateTipPos, setDateTipPos] = useState(null);
  const dateChangeTipTimer = useRef(null);
  const dateRowRef = useRef(null);
  
  // Inline tab content state
  const [notes, setNotes] = useState([]);
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNote, setNewNote] = useState({ 
    content: '', 
    tags: [], 
    linkedDate: getLocalDateString() 
  });
  const [showLinkedDate, setShowLinkedDate] = useState(false);
  
  // Reset showLinkedDate when form opens/closes
  useEffect(() => {
    if (!showAddNoteForm) {
      setShowLinkedDate(false);
    }
  }, [showAddNoteForm]);
  const [notesHistoryEntryId, setNotesHistoryEntryId] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareSaving, setShareSaving] = useState(false);
  const [shareSaved, setShareSaved] = useState(false);
  const shareCardRef = useRef(null);
  const [selectedHistoryEntryForManage, setSelectedHistoryEntryForManage] = useState(null);
  const [followUpProtocolForManage, setFollowUpProtocolForManage] = useState(null);
  const [followUpHistoryIdForManage, setFollowUpHistoryIdForManage] = useState(null);
  
  const NOTE_TAGS = [
    { id: 'progress', label: 'Progress Update' },
    { id: 'side_effects', label: 'Side Effects' },
    { id: 'adjustment', label: 'Dosage Adjustment' },
    { id: 'observation', label: 'Observation' },
    { id: 'question', label: 'Question' }
  ];

  // Debug: log protocol state when Protocols page is viewing protocols
  useEffect(() => {
    const activeCount = (protocols || []).filter(p => p && p.active).length;
    if ((protocols || []).length > 0) {
      console.log('📋 [PROTOCOL-SYNC] Protocols page: protocols state', {
        total: (protocols || []).length,
        activeCount,
        path: location.pathname
      });
    }
  }, [protocols, location.pathname]);

  // Listen for history updates to refresh the modal
  useEffect(() => {
    const handleHistoryUpdate = () => {
      setHistoryRefreshKey(prev => prev + 1);
      // Reload notes if notes tab is active
      if (manageTab === 'notes' && manageConfirm) {
        loadNotesForManage();
      }
    };
    
    window.addEventListener('tpp:protocol-history-updated', handleHistoryUpdate);
    return () => {
      window.removeEventListener('tpp:protocol-history-updated', handleHistoryUpdate);
    };
  }, [manageTab, manageConfirm]);

  // Load notes when notes tab is active
  useEffect(() => {
    if (manageTab === 'notes' && manageConfirm) {
      loadNotesForManage();
    }
  }, [manageTab, manageConfirm]);


  // Load notes for manage modal
  const loadNotesForManage = () => {
    if (!manageConfirm?.id) return;
    
    const activeEntry = findActiveProtocolHistoryEntry(manageConfirm.id);
    if (activeEntry) {
      setNotesHistoryEntryId(activeEntry.id);
      setNotes(activeEntry.notes || []);
    } else {
      setNotesHistoryEntryId(null);
      setNotes([]);
    }
  };

  // Notes helper functions
  const handleTagToggle = (tagId, isEditing = false) => {
    if (isEditing && editingNote) {
      setEditingNote({
        ...editingNote,
        tags: editingNote.tags.includes(tagId)
          ? editingNote.tags.filter(id => id !== tagId)
          : [...editingNote.tags, tagId]
      });
    } else {
      setNewNote({
        ...newNote,
        tags: newNote.tags.includes(tagId)
          ? newNote.tags.filter(id => id !== tagId)
          : [...newNote.tags, tagId]
      });
    }
  };

  const handleAddNote = () => {
    if (!newNote.content.trim() && newNote.tags.length === 0) {
      setShowAddNoteForm(false);
      return;
    }

    if (!notesHistoryEntryId) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Protocol must be started to add notes.', type: 'error' } 
      }));
      return;
    }

    const noteData = {
      type: 'during',
      content: newNote.content.trim(),
      tags: newNote.tags,
      linkedDate: showLinkedDate ? newNote.linkedDate : null
    };

    if (addNoteToProtocolHistory(notesHistoryEntryId, noteData)) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Note added successfully.', type: 'success' } 
      }));
      window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
      loadNotesForManage();
      setNewNote({ content: '', tags: [], linkedDate: getLocalDateString() });
      setShowLinkedDate(false);
      setShowAddNoteForm(false);
    } else {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to add note.', type: 'error' } 
      }));
    }
  };

  const handleSaveEditNote = () => {
    if (!editingNote || !notesHistoryEntryId) return;

    if (!editingNote.content.trim() && editingNote.tags.length === 0) {
      handleDeleteNote(editingNote.id);
      return;
    }

    const updates = {
      content: editingNote.content.trim(),
      tags: editingNote.tags,
      linkedDate: editingNote.showLinkedDate ? editingNote.linkedDate : null
    };

    if (updateNoteInProtocolHistory(notesHistoryEntryId, editingNote.id, updates)) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Note updated successfully.', type: 'success' } 
      }));
      window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
      loadNotesForManage();
      setEditingNote(null);
    } else {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to update note.', type: 'error' } 
      }));
    }
  };

  const handleEditNote = (note) => {
    setEditingNote({ ...note });
  };

  const handleDeleteNote = (noteId) => {
    if (!notesHistoryEntryId) return;

    if (window.confirm('Are you sure you want to delete this note?')) {
      if (deleteNoteFromProtocolHistory(notesHistoryEntryId, noteId)) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Note deleted successfully.', type: 'success' } 
        }));
        window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
        loadNotesForManage();
        if (editingNote?.id === noteId) {
          setEditingNote(null);
        }
      } else {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Failed to delete note.', type: 'error' } 
        }));
      }
    }
  };

  // Share helper functions
  const getShareUrl = () => {
    if (!manageConfirm) return '';
    const shareData = {
      type: 'protocol',
      protocol: manageConfirm
    };
    const encodedData = encodeShareData(shareData);
    if (!encodedData) return '';
    return `${window.location.origin}${SHARE_BASE_PATH}/protocol/share/${encodedData}`;
  };

  const handleShareImage = async () => {
    if (shareCardRef.current === null) {
      console.error('Card ref is null');
      return;
    }

    const node = shareCardRef.current;

    try {
      const rect = node.getBoundingClientRect();
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await toPng(node, { 
        cacheBust: true,
        width: rect.width,
        height: rect.height,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        },
        skipFonts: false,
        skipAutoScale: true,
        useCORS: true,
        allowTaint: true,
        fontEmbedCSS: false,
        filter: (node) => {
          if (node.tagName === 'LINK' && node.href && node.href.includes('fonts.googleapis.com')) {
            return false;
          }
          return true;
        }
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "shared-card.png", { type: blob.type });

      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                      window.Capacitor || 
                      window.location.protocol === 'capacitor:';
      
      if (isMobile && window.Capacitor) {
        try {
          const base64Data = dataUrl.split(',')[1];
          const protocolName = (manageConfirm?.protocolName || manageConfirm?.name || 'Protocol').replace(/[/\\:*?"<>|]/g, '').trim() || 'Research';
          const d = new Date();
          const mmddyy = `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getFullYear()).slice(-2)}`;
          const fileName = `${protocolName} Research ${mmddyy}.png`;
          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });
          
          await Share.share({
            title: `Check out this Protocol`,
            text: `Shared from The Pep Planner`,
            url: result.uri,
            dialogTitle: 'Share Image',
          });
          
          setTimeout(async () => {
            try {
              await Filesystem.deleteFile({
                path: fileName,
                directory: Directory.Cache,
              });
            } catch (cleanupError) {
              console.log('Could not clean up temporary file:', cleanupError);
            }
          }, 5000);
        } catch (error) {
          console.error('Error with Capacitor native share:', error);
          // Fallback to download
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = 'shared-card.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Check out this Protocol`,
          text: `Shared from The Pep Planner`,
          files: [file],
        });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'shared-card.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Error generating share image:', err);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Could not generate image. Please try copying the link instead.', type: 'error' } 
      }));
    }
  };

  const copyShareLinkToClipboard = (text) => {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text).catch(() => fallbackCopyShareLink(text));
    }
    return Promise.resolve(fallbackCopyShareLink(text));
  };
  const fallbackCopyShareLink = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    if (!ok) throw new Error('Copy failed');
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    if (!url) return;
    copyShareLinkToClipboard(url)
      .then(() => {
        setShareCopied(true);
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: 'Link copied to clipboard!', type: 'success' },
          }));
        });
        setTimeout(() => setShareCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Copy failed:', err);
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: 'Could not copy link. Try Share instead.', type: 'error' },
        }));
      });
  };

  const SHARE_SAVE_FOLDER = 'PepPlannerResearch';
  const SHARE_SAVE_FOLDER_DISPLAY = 'Pep Planner Research';

  const handleSaveShareCardToDevice = async () => {
    if (shareCardRef.current === null) return;
    const node = shareCardRef.current;
    setShareSaving(true);
    try {
      const rect = node.getBoundingClientRect();
      await new Promise(resolve => setTimeout(resolve, 300));
      const dataUrl = await toPng(node, {
        cacheBust: true,
        width: rect.width,
        height: rect.height,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: { transform: 'scale(1)', transformOrigin: 'top left' },
        skipFonts: false,
        skipAutoScale: true,
        useCORS: true,
        allowTaint: true,
        fontEmbedCSS: false,
        filter: (n) => !(n.tagName === 'LINK' && n.href && n.href.includes('fonts.googleapis.com')),
      });
      const base64Data = dataUrl.split(',')[1];
      const protocolName = (manageConfirm?.protocolName || manageConfirm?.name || 'Protocol').replace(/[/\\:*?"<>|]/g, '').trim() || 'Research';
      const d = new Date();
      const mmddyy = `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getFullYear()).slice(-2)}`;
      const fileName = `${protocolName} Research ${mmddyy}.png`;
      const isCapacitor = window.Capacitor?.isNativePlatform?.() ?? !!window.Capacitor;
      if (isCapacitor) {
        try {
          await Filesystem.mkdir({ path: SHARE_SAVE_FOLDER, directory: Directory.Documents, recursive: true });
        } catch (e) {
          if (e?.message && !e.message.includes('exists')) throw e;
        }
        const { uri } = await Filesystem.writeFile({
          path: `${SHARE_SAVE_FOLDER}/${fileName}`,
          data: base64Data,
          directory: Directory.Documents,
        });
        setShareSaved(true);
        setTimeout(() => setShareSaved(false), 2500);
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: `Saved to ${SHARE_SAVE_FOLDER_DISPLAY}`, type: 'success' },
        }));
        try {
          await Share.share({
            title: 'Check out this Protocol',
            text: 'Shared from The Pep Planner',
            url: uri,
            dialogTitle: 'Share image',
          });
        } catch (shareErr) {
          console.warn('Share sheet failed after save:', shareErr);
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: 'Saved. Use Share button to send it.', type: 'info' },
          }));
        }
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: 'Image downloaded', type: 'success' },
        }));
      }
    } catch (err) {
      console.error('Error saving share card:', err);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Could not save image. Try Share instead.', type: 'error' },
      }));
    } finally {
      setShareSaving(false);
    }
  };

  // History helper functions and data
  const historyEntriesForManage = useMemo(() => {
    if (!manageConfirm?.id) return [];
    const entries = getProtocolHistoryEntries(manageConfirm.id);
    return entries.sort((a, b) => {
      const aTimestamp = a.updatedAt ? new Date(a.updatedAt) : (a.createdAt ? new Date(a.createdAt) : new Date(a.startDate));
      const bTimestamp = b.updatedAt ? new Date(b.updatedAt) : (b.createdAt ? new Date(b.createdAt) : new Date(b.startDate));
      return bTimestamp.getTime() - aTimestamp.getTime();
    });
  }, [manageConfirm?.id, historyRefreshKey]);

  const timelineEntriesForManage = useMemo(() => {
    const entries = [];
    let currentMonthYear = null;
    
    // Filter for finished entries (must have endDate) for grouping, but include ongoing too
    const finishedEntries = historyEntriesForManage.filter(entry => entry.endDate);
    
    finishedEntries.forEach((entry) => {
      // Use endDate for grouping (like main history tab)
      const endDate = new Date(entry.endDate);
      const month = endDate.toLocaleDateString('en-US', { month: 'short' });
      const year = endDate.getFullYear();
      const monthYearKey = `${month} ${year}`;
      
      if (monthYearKey !== currentMonthYear) {
        entries.push({
          type: 'header',
          key: monthYearKey,
          month,
          year,
          date: endDate
        });
        currentMonthYear = monthYearKey;
      }
      
      const startDate = new Date(entry.startDate);
      let durationDays = 0;
      if (entry.endDate) {
        durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      }
      
      let completionStatus = 'unknown';
      if (entry.endDate) {
        if (entry.completionStatus === 'completed' || entry.completionStatus === 'ended_early' || entry.completionStatus === 'rescheduled') {
          completionStatus = entry.completionStatus;
        } else {
          const protocolData = entry.protocolData || {};
          let duration = protocolData.duration || manageConfirm?.duration;
          
          let expectedDurationDays = null;
          if (duration && !duration.noEnd && duration.count > 0 && duration.unit) {
            const unit = String(duration.unit).toLowerCase();
            const count = Number(duration.count) || 0;
            
            if (unit.includes('day')) {
              expectedDurationDays = count;
            } else if (unit.includes('week')) {
              expectedDurationDays = count * 7;
            } else if (unit.includes('month')) {
              expectedDurationDays = count * 30;
            }
          }
          
          if (expectedDurationDays !== null && durationDays > 0) {
            const diffDays = durationDays - expectedDurationDays;
            if (Math.abs(diffDays) <= 2) {
              completionStatus = 'completed';
            } else if (diffDays < -2) {
              completionStatus = 'ended_early';
            } else {
              completionStatus = 'completed';
            }
          } else {
            if (entry.endType === 'completed') {
              completionStatus = 'completed';
            } else if (entry.endType === 'manual') {
              completionStatus = durationDays <= 2 ? 'completed' : 'ended_early';
            } else {
              completionStatus = 'ended_early';
            }
          }
        }
      }
      
      entries.push({
        type: 'protocol',
        historyEntry: entry,
        durationDays,
        startDate: formatMMDDYYYY(entry.startDate),
        endDate: formatMMDDYYYY(entry.endDate),
        completionStatus
      });
    });
    
    return entries;
  }, [historyEntriesForManage, manageConfirm]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return {
          icon: CalendarCheck,
          label: 'Completed',
          bgColor: theme.isDark ? '#3c4e3a' : '#607c5c',
          textColor: '#dcfce7'
        };
      case 'ended_early':
        return {
          icon: CalendarX,
          label: 'Ended Early',
          bgColor: theme.isDark ? '#6D2B2C' : '#A14D4D',
          textColor: '#fee2e2'
        };
      case 'rescheduled':
        return {
          icon: Clock,
          label: 'Rescheduled',
          bgColor: theme.isDark ? '#78350f' : '#fef3c7',
          textColor: theme.isDark ? '#fcd34d' : '#92400e'
        };
      default:
        return null;
    }
  };

  const terracottaGradient = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
  const terracottaHoverGradient = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';

  // Migrate existing protocol history entries on mount (assign IDs, preserve all data)
  useEffect(() => {
    const migrationResult = migrateProtocolHistoryEntries();
    if (migrationResult.migrated > 0) {
    }
  }, []);

  // Migrate completion status for existing history entries (recalculate based on planned vs actual duration)
  useEffect(() => {
    const statusMigrationResult = migrateProtocolHistoryCompletionStatus();
    if (statusMigrationResult.updated > 0) {
    }
  }, [protocols]); // Include protocols in dependency to ensure we have protocol data for lookup

  // Listen for autosave events to update protocol cards in real-time
  useEffect(() => {
    const handleProtocolAutosaved = (event) => {
      const { storageKey, formData } = event.detail;
      
      // Only handle autosave events for existing protocols (not new ones)
      if (!storageKey.includes('protocol_draft_') || !formData?.id) return;
      // Don't overwrite when user is in embedded Edit tab - manual save handles it
      if (manageConfirm?.id === formData.id && manageTab === 'edit') return;
      
      updateProtocol(formData);
    };

    window.addEventListener('tpp:protocol-autosaved', handleProtocolAutosaved);
    return () => window.removeEventListener('tpp:protocol-autosaved', handleProtocolAutosaved);
  }, [updateProtocol, manageConfirm?.id, manageTab]);

  // Handle direct navigation to specific protocol (from search)
  useEffect(() => {
    if (location.state?.openProtocolId) {
      const protocolToOpen = protocols.find(p => p.id === location.state.openProtocolId);
      if (protocolToOpen) {
        setEditing(protocolToOpen);
        // Clear state after use
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, protocols]);

  // Check for pending follow-ups when page loads
  useEffect(() => {
    const checkPendingFollowUps = () => {
      try {
        const pending = JSON.parse(localStorage.getItem('tpprover_pending_followups') || '[]');
        if (pending.length > 0 && !followUpProtocol) {
          // Show the first pending follow-up
          const firstPending = pending[0];
          const protocol = protocols.find(p => p.id === firstPending.protocolId);
          if (protocol) {
            setFollowUpProtocol(protocol);
            setFollowUpHistoryId(firstPending.historyId);
            // Remove this one from the queue
            const remaining = pending.slice(1);
            localStorage.setItem('tpprover_pending_followups', JSON.stringify(remaining));
          } else {
            // Protocol not found, remove from queue
            const remaining = pending.slice(1);
            localStorage.setItem('tpprover_pending_followups', JSON.stringify(remaining));
          }
        }
      } catch (e) {
        console.error('Failed to check pending follow-ups:', e);
      }
    };

    // Check after a short delay to allow page to load
    const timer = setTimeout(checkPendingFollowUps, 500);
    return () => clearTimeout(timer);
  }, [protocols, followUpProtocol]);

  const buildProtocolLineage = (proto) => {
    const items = proto.linkedItems || {};
    const lineage = {};

    Object.entries(items).forEach(([peptideId, link]) => {
      const peptide = proto.peptides?.find(p => (p.id || `peptide-${proto.peptides.indexOf(p)}`) === peptideId);
      const entry = { peptideName: peptide?.name || 'Unknown' };

      if (link.vialId) {
        const stockItem = stockpile?.find(s => s.id === link.vialId);
        if (stockItem) {
          entry.vial = {
            stockpileId: stockItem.id,
            name: stockItem.name,
            mg: stockItem.mg,
            vendor: stockItem.vendor || null,
            vendorId: stockItem.vendorId || null,
            cost: stockItem.cost || null,
            purchaseDate: stockItem.purchaseDate || null,
            orderId: stockItem.orderId || null,
          };
          if (stockItem.orderId) {
            const order = orders?.find(o => o.id === stockItem.orderId);
            if (order) {
              entry.order = {
                id: order.id,
                orderNumber: order.publicOrderNumber || null,
                date: order.date || null,
                tracking: order.tracking || null,
                status: order.status || null,
                category: order.category || order.type || null,
              };
            }
          }
          if (stockItem.vendorId || stockItem.vendor) {
            const vendor = vendors?.find(v => v.id === (stockItem.vendorId) || v.name === stockItem.vendor);
            if (vendor) {
              entry.vendor = { id: vendor.id, name: vendor.name };
            }
          }
        }
      }

      if (link.reconId) {
        const reconItem = reconItems?.find(r => r.id === link.reconId);
        if (reconItem) {
          entry.recon = {
            id: reconItem.id,
            date: reconItem.date || null,
            reconStrategy: reconItem.reconStrategy || null,
            water: reconItem.water || null,
            deliveryMethod: reconItem.deliveryMethod || null,
            concentration: reconItem.concentration || null,
          };
        }
      }

      if (link.deliveryMethod) {
        entry.deliveryMethod = link.deliveryMethod;
      }
      entry.status = link.status || null;

      lineage[peptideId] = entry;
    });

    return lineage;
  };

  const endProtocol = (protocolToEnd) => {
    const today = getLocalDateString();
    const updatedProtocol = { ...protocolToEnd, active: false, endDate: today, endType: 'manual' };
    updateProtocolWithForceSync(updatedProtocol);
    
    const activeHistoryEntry = findActiveProtocolHistoryEntry(protocolToEnd.id);
    if (activeHistoryEntry) {
      const expectedEndDate = updatedProtocol.endDate || updatedProtocol.expectedEndDate;
      let completionStatus = 'ended_early';
      
      if (expectedEndDate) {
        const expected = new Date(expectedEndDate);
        const actual = new Date(today);
        const diffDays = Math.abs(actual - expected) / (1000 * 60 * 60 * 24);
        if (diffDays <= 2 && actual <= expected) {
          completionStatus = 'completed';
        }
      }
      
      const skippedReconstitution = {};
      const linkedItems = protocolToEnd.linkedItems || {};
      Object.entries(linkedItems).forEach(([peptideId, item]) => {
        if (item.status === 'skipped' && item.deliveryMethod) {
          const peptide = protocolToEnd.peptides?.find(p => (p.id || `peptide-${protocolToEnd.peptides.indexOf(p)}`) === peptideId);
          skippedReconstitution[peptideId] = {
            peptideName: peptide?.name || 'Unknown',
            deliveryMethod: item.deliveryMethod
          };
        }
      });
      
      const updatedProtocolData = {
        ...(activeHistoryEntry.protocolData || {}),
        linkedItems: linkedItems
      };

      const lineage = buildProtocolLineage(protocolToEnd);
      
      updateProtocolHistoryEntry(activeHistoryEntry.id, {
        endDate: today,
        completionStatus: completionStatus,
        endType: 'manual',
        protocolData: updatedProtocolData,
        skippedReconstitution: Object.keys(skippedReconstitution).length > 0 ? skippedReconstitution : null,
        lineage: Object.keys(lineage).length > 0 ? lineage : null
      });
      
      setFollowUpProtocol(protocolToEnd);
      setFollowUpHistoryId(activeHistoryEntry.id);
    } else {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Protocol has been ended.', type: 'success' } }));
    }
  };
  
  const handleFollowUpClose = () => {
    // Store protocol name before clearing
    const protocolName = followUpProtocol?.protocolName || followUpProtocol?.name || 'Protocol';
    setEndedProtocolName(protocolName);
    setFollowUpProtocol(null);
    setFollowUpHistoryId(null);
    window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
    // Show confirmation modal
    setShowProtocolEndedConfirm(true);
  };

  const handleRestoreProtocol = (protocolId, restoredHistoryEntry) => {
    const targetProtocol = protocols.find(p => p.id === protocolId);
    if (targetProtocol) {
      const reactivated = { ...targetProtocol, active: true, endDate: null, endType: null };
      updateProtocolWithForceSync(reactivated);
    }
    window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
    setHistoryRefreshKey(prev => prev + 1);
  };

  const handleEditFromHistory = (protocolToEdit) => {
    setEditing(protocolToEdit);
    setHistoryProtocol(null);
    setSelectedHistoryEntry(null);
    setSelectedHistoryEntryForManage(null);
  };

  // Check and auto-end protocols that have finished organically
  useEffect(() => {
    // Only run this check once per day to avoid excessive updates
    const checkKey = 'tpprover_last_auto_end_check';
    const lastCheck = localStorage.getItem(checkKey);
    const today = getLocalDateString();
    
    // Skip if we already checked today
    if (lastCheck === today) return;
    
    // Use centralized date normalization
    const todayOnly = normalizeToMidnight(new Date());
    let hasUpdates = false;
    const autoCompletedProtocols = [];
    
    protocols.forEach(p => {
      // Skip if already ended or doesn't have startDate
      if (p.active === false || p.endDate || !p.startDate) return;
      
      // Calculate expected end date
      // CRITICAL: Use centralized date parsing to avoid timezone issues
      let calculatedEndDate = null;
      const start = parseDateString(p.startDate);
      const startOnly = normalizeToMidnight(start);
      
      if (p.duration && !p.duration.noEnd && p.duration.count > 0 && p.duration.unit) {
        calculatedEndDate = new Date(startOnly);
        const unit = String(p.duration.unit).toLowerCase();
        const count = Number(p.duration.count) || 0;
        
        if (unit.includes('day')) {
          calculatedEndDate.setDate(calculatedEndDate.getDate() + count - 1);
        } else if (unit.includes('week')) {
          calculatedEndDate.setDate(calculatedEndDate.getDate() + (count * 7) - 1);
        } else if (unit.includes('month')) {
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + count);
          calculatedEndDate.setDate(calculatedEndDate.getDate() - 1);
        }
        
        // If today is past the calculated end date, mark as finished
        if (calculatedEndDate && todayOnly > calculatedEndDate) {
          const endDateString = getLocalDateString(calculatedEndDate);
          updateProtocolWithForceSync({ ...p, active: false, endDate: endDateString, endType: 'completed' }); // Use force sync for auto-end
          hasUpdates = true;
          
          // Update history entry for this protocol
          const activeHistoryEntry = findActiveProtocolHistoryEntry(p.id);
          if (activeHistoryEntry) {
            // Update protocolData with current linkedItems to preserve all data
            const linkedItems = p.linkedItems || {};
            const updatedProtocolData = {
              ...(activeHistoryEntry.protocolData || {}),
              linkedItems: linkedItems
            };
            
            // Capture skipped reconstitution data
            const skippedReconstitution = {};
            Object.entries(linkedItems).forEach(([peptideId, item]) => {
              if (item.status === 'skipped' && item.deliveryMethod) {
                const peptide = p.peptides?.find(pep => (pep.id || `peptide-${p.peptides.indexOf(pep)}`) === peptideId);
                skippedReconstitution[peptideId] = {
                  peptideName: peptide?.name || 'Unknown',
                  deliveryMethod: item.deliveryMethod
                };
              }
            });
            
            const lineage = buildProtocolLineage(p);

            updateProtocolHistoryEntry(activeHistoryEntry.id, {
              endDate: endDateString,
              completionStatus: 'completed',
              endType: 'completed',
              protocolData: updatedProtocolData,
              skippedReconstitution: Object.keys(skippedReconstitution).length > 0 ? skippedReconstitution : null,
              lineage: Object.keys(lineage).length > 0 ? lineage : null
            });
            
            autoCompletedProtocols.push({
              protocolId: p.id,
              historyId: activeHistoryEntry.id,
              protocolName: p.protocolName || 'Unnamed Protocol'
            });
          }
        }
      }
    });
    
    // Mark that we've checked today
    if (hasUpdates || !lastCheck) {
      localStorage.setItem(checkKey, today);
      
      // Store auto-completed protocols for follow-up prompts
      if (autoCompletedProtocols.length > 0) {
        const existingPending = JSON.parse(localStorage.getItem('tpprover_pending_followups') || '[]');
        const updated = [...existingPending, ...autoCompletedProtocols];
        localStorage.setItem('tpprover_pending_followups', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
      }
    }
  }, [protocols, updateProtocol]);

  // 🔧 MIGRATION: Fix endDate for ALL existing protocols (active & inactive) - runs once
  useEffect(() => {
    const migrationKey = 'tpprover_enddate_migration_v2';
    
    // Skip if already run (prevents re-running on every protocols change and overwriting just-started protocol)
    if (localStorage.getItem(migrationKey) === 'true') {
      return;
    }
    
    if (!protocols || protocols.length === 0) {
      return;
    }
    
    let migratedCount = 0;
    protocols.forEach((p, index) => {
      if (!p?.startDate) {
        return;
      }
      
      // Recalculate endDate using centralized date utilities
      const start = parseDateString(p.startDate);
      if (!start) {
        return;
      }
      const startNormalized = normalizeToMidnight(start);
      let newEndDate = null;
      
      // Check for cycle-based peptides
      const cyclePeptide = p.peptides?.find(pep => pep.frequency?.type === 'cycle');
      
      // SPECIAL CASE: Ongoing cycles - calculate far-future endDate for scheduling
      if (cyclePeptide && p.duration?.noEnd) {
        const onDays = Number(cyclePeptide.frequency.onDays) || 0;
        const offDays = Number(cyclePeptide.frequency.offDays) || 0;
        console.log('🔄 Ongoing cycle detected!', { onDays, offDays });
        
        if (onDays > 0) {
          // For ongoing cycles, schedule 1 year ahead for calendar purposes
          const end = new Date(startNormalized);
          end.setFullYear(end.getFullYear() + 1);
          newEndDate = getLocalDateString(end);
          console.log('🔄 Calculated ongoing cycle endDate (1 year ahead):', newEndDate);
        }
      }
      // Regular cycle with set duration
      else if (cyclePeptide && p.duration && p.duration.count > 0 && p.duration.unit && !p.duration.noEnd) {
        const onDays = Number(cyclePeptide.frequency.onDays) || 0;
        const offDays = Number(cyclePeptide.frequency.offDays) || 0;
        console.log('🔄 Cycle params:', { onDays, offDays, duration: p.duration });
        
        if (onDays > 0) {
          const durationInDays = (() => {
            const count = Number(p.duration.count);
            const unit = String(p.duration.unit).toLowerCase();
            if (unit.includes('day')) return count;
            if (unit.includes('week')) return count * 7;
            if (unit.includes('month')) return count * 30;
            return 0;
          })();
          
          const fullCycles = Math.floor(durationInDays / onDays);
          const remainingOn = durationInDays % onDays;
          let total = fullCycles * (onDays + offDays);
          if (remainingOn > 0) total += remainingOn;
          else if (fullCycles > 0) total -= offDays;
          
          const end = new Date(startNormalized);
          end.setDate(end.getDate() + total - 1);
          newEndDate = getLocalDateString(end);
          console.log('🔄 Calculated cycle endDate:', newEndDate, 'from', durationInDays, 'duration days');
        }
      }
      
      // Fallback to standard duration calculation
      if (!newEndDate && p.duration && !p.duration.noEnd && p.duration.count > 0 && p.duration.unit) {
        const end = new Date(startNormalized);
        const unit = String(p.duration.unit).toLowerCase();
        const count = Number(p.duration.count) || 0;
        
        if (unit.includes('day')) end.setDate(end.getDate() + count - 1);
        else if (unit.includes('week')) end.setDate(end.getDate() + (count * 7) - 1);
        else if (unit.includes('month')) {
          end.setMonth(end.getMonth() + count);
          end.setDate(end.getDate() - 1);
        }
        newEndDate = getLocalDateString(end);
        console.log('📅 Calculated standard endDate:', newEndDate);
      }
      
      // Check if current endDate might include washout (if washout is enabled)
      let needsFix = false;
      if (p.endDate && p.washout?.enabled && p.washout?.count > 0 && p.washout?.unit && newEndDate) {
        // Calculate what endDate would be WITH washout included
        const washoutDays = (() => {
          const count = Number(p.washout.count);
          const unit = String(p.washout.unit).toLowerCase();
          if (unit.includes('day')) return count;
          if (unit.includes('week')) return count * 7;
          if (unit.includes('month')) return count * 30;
          return 0;
        })();
        
        const endWithWashout = new Date(parseDateString(newEndDate));
        endWithWashout.setDate(endWithWashout.getDate() + washoutDays);
        const endWithWashoutStr = getLocalDateString(endWithWashout);
        
        // If current endDate matches "correct endDate + washout", it's wrong
        if (p.endDate === endWithWashoutStr) {
          console.log('⚠️ Detected washout incorrectly included in endDate for:', p.name);
          needsFix = true;
        }
      }
      
      // Update if endDate changed OR if washout was incorrectly included
      if (newEndDate && (newEndDate !== p.endDate || needsFix)) {
        console.log('✅ Updating protocol:', p.name || p.protocolName, 'from', p.endDate, 'to', newEndDate, needsFix ? '(fixing washout issue)' : '');
        updateProtocolWithForceSync({ ...p, endDate: newEndDate }); // Use force sync for migration
        migratedCount++;
      } else {
        console.log('  ℹ️ No update needed - endDate already correct or no new endDate calculated');
      }
    });
    
    localStorage.setItem(migrationKey, 'true');
    console.log(`✅ Migration complete: ${migratedCount} protocol(s) updated`);
    if (migratedCount > 0) {
      console.log(`✅ Migrated ${migratedCount} protocol(s) with corrected endDates`);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: `Fixed ${migratedCount} protocol date${migratedCount > 1 ? 's' : ''}!`, type: 'success' } 
      }));
    }
  }, [protocols, updateProtocol]);

  const projectedDates = React.useMemo(() => {
    if (!startConfirm || !startDate) return { protocolStartDate: null, protocolEndDate: null, washoutStartDate: null, washoutEndDate: null };

    const { duration, washout, peptides } = startConfirm;
    // CRITICAL: Use centralized date parsing to avoid timezone issues
    const start = parseDateString(startDate);
    if (!start) return { protocolStartDate: null, protocolEndDate: null, washoutStartDate: null, washoutEndDate: null };
    
    const startNormalized = normalizeToMidnight(start);
    let endDate = null;

    // Prioritize cycle-based calculation if available
    const cyclePeptide = peptides?.find(p => p.frequency?.type === 'cycle');
    if (cyclePeptide && duration?.count > 0 && duration?.unit) {
        const onDays = Number(cyclePeptide.frequency.onDays) || 0;
        const offDays = Number(cyclePeptide.frequency.offDays) || 0;
        
        if (onDays > 0) {
            const durationInDays = (() => {
                const count = Number(duration.count);
                if (duration.unit.toLowerCase().includes('day')) return count;
                if (duration.unit.toLowerCase().includes('week')) return count * 7;
                if (duration.unit.toLowerCase().includes('month')) return count * 30; // Approximation
                return 0;
            })();

            const fullCycles = Math.floor(durationInDays / onDays);
            const remainingOnDays = durationInDays % onDays;
            
            let totalDays = fullCycles * (onDays + offDays);
            if (remainingOnDays > 0) {
                totalDays += remainingOnDays;
            } else if (fullCycles > 0) {
                totalDays -= offDays; // Don't add last washout period if it ends on a full cycle
            }
            
            endDate = new Date(startNormalized);
            endDate.setDate(endDate.getDate() + totalDays - 1);
        }
    }
    
    // Fallback to original duration logic if no cycle is found
    if (!endDate && duration && !duration.noEnd && duration.count > 0 && duration.unit) {
        endDate = new Date(startNormalized);
        const count = Number(duration.count);
        if (duration.unit.toLowerCase().includes('day')) endDate.setDate(endDate.getDate() + count - 1);
        else if (duration.unit.toLowerCase().includes('week')) endDate.setDate(endDate.getDate() + (count * 7) - 1);
        else if (duration.unit.toLowerCase().includes('month')) {
          endDate.setMonth(endDate.getMonth() + count);
          endDate.setDate(endDate.getDate() - 1);
        }
    }

    let washoutStartDate = null;
    let washoutEndDate = null;
    if (endDate && washout && washout.enabled && washout.count > 0 && washout.unit) {
        washoutStartDate = new Date(endDate);
        washoutStartDate.setDate(washoutStartDate.getDate() + 1);

        washoutEndDate = new Date(washoutStartDate);
        const washoutCount = Number(washout.count);
        if(washout.unit.toLowerCase().includes('day')) washoutEndDate.setDate(washoutEndDate.getDate() + washoutCount - 1);
        else if(washout.unit.toLowerCase().includes('week')) washoutEndDate.setDate(washoutEndDate.getDate() + (washoutCount * 7) - 1);
        else if(washout.unit.toLowerCase().includes('month')) {
          washoutEndDate.setMonth(washoutEndDate.getMonth() + washoutCount);
          washoutEndDate.setDate(washoutEndDate.getDate() - 1);
        }
    }
    
    return {
      protocolStartDate: formatMMDDYYYY(startNormalized),
      protocolEndDate: endDate ? formatMMDDYYYY(endDate) : 'Ongoing',
      washoutStartDate: washoutStartDate ? formatMMDDYYYY(washoutStartDate) : null,
      washoutEndDate: washoutEndDate ? formatMMDDYYYY(washoutEndDate) : null,
    };
}, [startConfirm, startDate]);

  const isActiveNow = React.useCallback((p) => {
    try {
      if (p?.active !== true) return false
      if (!p?.startDate) return false
      const today = normalizeToMidnight(new Date());
      const s = parseDateString(p.startDate);
      if (!s) return false;
      const startNormalized = normalizeToMidnight(s);
      if (today < startNormalized) return false
      // explicit end date wins
      if (p.endDate) {
        const e = parseDateString(p.endDate);
        if (!e) return false;
        const endNormalized = normalizeToMidnight(e);
        return today <= endNormalized;
      }
      const d = p.duration || {}
      if (d.noEnd || !d.count || !d.unit) return true
      const e = new Date(startNormalized)
      if (String(d.unit).toLowerCase() === 'day') e.setDate(e.getDate() + Number(d.count))
      else if (String(d.unit).toLowerCase() === 'week') e.setDate(e.getDate() + Number(d.count) * 7)
      else if (String(d.unit).toLowerCase() === 'month') e.setMonth(e.getMonth() + Number(d.count))
      return today <= normalizeToMidnight(e)
    } catch { return false }
  }, [])

  React.useEffect(() => {
    const onOpenNew = () => setOpenAdd(true)
    window.addEventListener('tpp:open_protocol_new', onOpenNew)
    return () => window.removeEventListener('tpp:open_protocol_new', onOpenNew)
  }, [])

  const onImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      let rows = []
      if (file.name.toLowerCase().endsWith('.json')) {
        rows = JSON.parse(text)
      } else {
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
        if (lines.length <= 1) throw new Error('empty-csv')
        const delimiter = lines[0].includes('\t') ? '\t' : ','
        const split = (s) => s.split(new RegExp(`${delimiter}`))
        const header = split(lines[0]).map(h => h.trim().toLowerCase())
        const find = (alts) => header.findIndex(h => alts.some(a => h.includes(a)))
        const nameIdx = find(['name','peptide','protocol'])
        const purposeIdx = find(['purpose','goal','desc'])
        const countIdx = find(['count','times','#'])
        const perIdx = find(['per','period','day','week','month'])
        const timeIdx = find(['time','slot','am','pm'])
        const durCountIdx = find(['duration','dur count','duration count'])
        const durUnitIdx = find(['dur unit','duration unit','unit'])
        const noEndIdx = find(['no end','open'])
        for (let i=1;i<lines.length;i++) {
          const cols = split(lines[i]).map(c => c.trim())
          const name = nameIdx>=0 ? cols[nameIdx] : cols[0]
          const purpose = purposeIdx>=0 ? cols[purposeIdx] : ''
          const count = countIdx>=0 ? Number(cols[countIdx])||1 : 1
          const per = perIdx>=0 ? (cols[perIdx]||'Day') : 'Day'
          const timeVal = (timeIdx>=0 ? cols[timeIdx] : 'AM').toUpperCase()
          const times = timeVal.includes('AM') && timeVal.includes('PM') ? ['AM','PM'] : (timeVal.includes('PM') ? ['PM'] : ['AM'])
          const dCount = durCountIdx>=0 ? Number(cols[durCountIdx])||0 : 0
          const dUnit = durUnitIdx>=0 ? (cols[durUnitIdx]||'Week') : 'Week'
          const noEnd = noEndIdx>=0 ? /true|1|yes/i.test(cols[noEndIdx]) : false
          rows.push(prepareItemForSave({ // Add timestamps to imported protocols
            id: generateId(), 
            name, 
            purpose, 
            frequency: { count, per, time: times }, 
            duration: { count: dCount, unit: dUnit, noEnd }
          }, { isNew: true }));
        }
      }
      if (rows.length > 0) {
        // Add all protocols at once
        rows.forEach(row => addProtocol(row));
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: `Imported ${rows.length} peptides`, type: 'success' } }))
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Import failed. Use CSV/JSON with name, purpose, count, per, time, duration.', type: 'error' } }))
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Handle "Add Protocol" button click - show dropdown menu
  const handleAddClick = useCallback(() => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }
    setShowAddMenu(true);
  }, [isReadOnly]);

  const handleEditClick = useCallback((protocol) => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }
    setEditing(protocol);
    // Close any other open modals
    setStartConfirm(null);
    setManageConfirm(null);
    setOpenAdd(false);
  }, [isReadOnly]);

  const handleStartClick = useCallback((protocol, opts) => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }
    if (opts?.manage) {
      setManageConfirm(protocol);
      // Close any other open modals
      setStartConfirm(null);
      setEditing(null);
    } else {
      setStartConfirm(protocol);
      setStartDate(protocol.startDate || getLocalDateString());
      // Close any other open modals
      setManageConfirm(null);
      setEditing(null);
      setOpenAdd(false);
    }
  }, [isReadOnly]);

  // Allow deletion in read-only mode - users can manage their sensitive data
  const handleDeleteClick = (protocol) => {
    deleteProtocol(protocol.id);
  };

  // Load reminder settings
  const [reminderSettings, setReminderSettings] = useState(() => {
    const settings = loadSettings();
    const defaults = getDefaultSettings();
    return {
      amEnabled: settings?.notifications?.researchRemindersAM ?? defaults.notifications.researchRemindersAM ?? false,
      amTime: settings?.notifications?.researchReminderTimeAM ?? defaults.notifications.researchReminderTimeAM ?? '08:00',
      pmEnabled: settings?.notifications?.researchRemindersPM ?? defaults.notifications.researchRemindersPM ?? false,
      pmTime: settings?.notifications?.researchReminderTimePM ?? defaults.notifications.researchReminderTimePM ?? '18:00'
    };
  });

  // Push notification status
  const [pushNotificationStatus, setPushNotificationStatus] = useState({
    supported: false,
    enabled: false,
    loading: false
  });

  // Check push notification status on mount and when settings change
  useEffect(() => {
    const updatePushStatus = () => {
      const status = pwaNotificationService.getStatus();
      const isNative = Capacitor.isNativePlatform();
      const settings = loadSettings();
      
      const pushEnabled = status.enabled || settings?.notifications?.push === true;
      
      setPushNotificationStatus({
        supported: status.supported || isNative,
        enabled: pushEnabled,
        loading: false
      });
    };

    updatePushStatus();

    const handleEnabled = () => updatePushStatus();
    const handleDisabled = () => updatePushStatus();
    
    // Listen for settings changes (when user toggles push in settings page)
    const handleSettingsChange = () => {
      updatePushStatus();
    };
    window.addEventListener('storage', handleSettingsChange);

    window.addEventListener('pwa-notifications-enabled', handleEnabled);
    window.addEventListener('pwa-notifications-disabled', handleDisabled);

    // Also check periodically for changes
    const interval = setInterval(updatePushStatus, 2000);

    return () => {
      window.removeEventListener('pwa-notifications-enabled', handleEnabled);
      window.removeEventListener('pwa-notifications-disabled', handleDisabled);
      window.removeEventListener('storage', handleSettingsChange);
      clearInterval(interval);
    };
  }, []);

  // Sync reminder enabled state with push notification status
  useEffect(() => {
    if (!pushNotificationStatus.enabled && reminderSettings.enabled) {
      // If push is disabled but reminders are enabled, disable reminders
      setReminderSettings(prev => ({ ...prev, enabled: false }));
      const settings = loadSettings();
      const defaults = getDefaultSettings();
      const updatedSettings = {
        ...defaults,
        ...settings,
        notifications: {
          ...defaults.notifications,
          ...(settings?.notifications || {}),
          researchReminders: false
        }
      };
      saveSettings(updatedSettings);
      syncNotificationSettingsToFirestore();
    }
  }, [pushNotificationStatus.enabled]);

  // Update reminder settings
  const updateReminderSetting = async (key, value) => {
    // If enabling research reminders (AM or PM), check if push notifications are enabled
    if ((key === 'amEnabled' || key === 'pmEnabled') && value === true && !pushNotificationStatus.enabled) {
      // Clear cooldown period to allow permission request
      // User is actively trying to enable notifications, so override the 15-day cooldown
      localStorage.removeItem('tpprover_notification_prompt_last_shown');
      sessionStorage.removeItem('tpprover_notification_dismissed_this_session');
      
      // Set flag to bypass cooldown in NotificationPermissionPrompt
      localStorage.setItem('tpprover_user_requesting_permissions', 'true');
      
      // Request push notification permissions
      setPushNotificationStatus(prev => ({ ...prev, loading: true }));
      
      try {
        let permissionGranted = false;
        
        if (Capacitor.isNativePlatform()) {
          // Native app - use Capacitor
          try {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            const result = await LocalNotifications.requestPermissions();
            permissionGranted = result.display === 'granted';
            
            // Also request push notification permissions if available
            try {
              const { PushNotifications } = await import('@capacitor/push-notifications');
              
              // Add listener BEFORE registering to catch token immediately
              PushNotifications.addListener('registration', async (token) => {
                try {
                  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                  const { db } = await import('../config/firebase');
                  const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
                  const userId = user.uid || user.email?.toLowerCase();
                  
                  if (userId) {
                    const userRef = doc(db, 'users', userId);
                    await setDoc(userRef, {
                      fcmToken: token.value,
                      pushToken: token.value, // Backward compatibility
                      notificationSettings: {
                        push: true,
                        pushEnabled: true,
                        researchRemindersAM: reminderSettings.amEnabled,
                        researchReminderTimeAM: reminderSettings.amTime,
                        researchRemindersPM: reminderSettings.pmEnabled,
                        researchReminderTimePM: reminderSettings.pmTime,
                        lastUpdated: serverTimestamp()
                      },
                      deviceInfo: {
                        platform: Capacitor.getPlatform(),
                        isNative: true,
                        lastUpdated: serverTimestamp()
                      }
                    }, { merge: true });
                    console.log('✅ FCM token saved to Firestore');
                  }
                } catch (error) {
                  console.error('Failed to save FCM token:', error);
                }
              });
              
              const pushResult = await PushNotifications.requestPermissions();
              if (pushResult.receive === 'granted') {
                await PushNotifications.register();
              }
            } catch (e) {
              console.warn('Push notifications not available:', e);
            }
          } catch (error) {
            throw new Error('Failed to request native notification permissions');
          }
        } else {
          // PWA - use browser API
          await pwaNotificationService.enable();
          // Safety check for Notification API (not available on native apps)
          permissionGranted = typeof window !== 'undefined' && 'Notification' in window && typeof Notification !== 'undefined'
            ? Notification.permission === 'granted'
            : false;
        }
        
        if (permissionGranted) {
          // Clear the bypass flag since permission was granted
          localStorage.removeItem('tpprover_user_requesting_permissions');
          
          // Enable push notifications in settings
          const currentSettings = loadSettings();
          const defaults = getDefaultSettings();
          const updatedSettings = {
            ...defaults,
            ...currentSettings,
            notifications: {
              ...defaults.notifications,
              ...(currentSettings?.notifications || {}),
              push: true,
              [key]: true, // Enable the specific reminder (amEnabled or pmEnabled)
              [`researchReminderTime${key === 'amEnabled' ? 'AM' : 'PM'}`]: reminderSettings[key === 'amEnabled' ? 'amTime' : 'pmTime']
            }
          };
          saveSettings(updatedSettings);
          
          // Update push status
          setPushNotificationStatus(prev => ({ ...prev, enabled: true, loading: false }));
          
          // Update reminder settings
          const newSettings = { ...reminderSettings, [key]: true };
          setReminderSettings(newSettings);
          
          // Sync to Firestore
          await syncNotificationSettingsToFirestore();
          
          // Show success message
          window.dispatchEvent(new CustomEvent('tpp:toast', { 
            detail: { 
              message: '🎉 Push notifications enabled! Research reminders are now active.', 
              type: 'success' 
            } 
          }));
        } else {
          // Clear the bypass flag if permission was denied
          localStorage.removeItem('tpprover_user_requesting_permissions');
          throw new Error('Permission was not granted');
        }
      } catch (error) {
        console.error('Failed to enable push notifications:', error);
        // Clear the bypass flag on error
        localStorage.removeItem('tpprover_user_requesting_permissions');
        setPushNotificationStatus(prev => ({ ...prev, loading: false }));
        
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: 'Failed to enable notifications. Please enable them in your device settings.', 
            type: 'error' 
          } 
        }));
        
        // Don't enable reminders if push failed
        return;
      }
    } else {
      // Normal update (not enabling reminders, or push is already enabled)
      const newSettings = { ...reminderSettings, [key]: value };
      setReminderSettings(newSettings);
      
      // Update localStorage
      const currentSettings = loadSettings();
      const defaults = getDefaultSettings();
      
      // Map reminder settings to notification settings
      const notificationUpdates = {};
      if (key === 'amEnabled') {
        notificationUpdates.researchRemindersAM = value;
      } else if (key === 'pmEnabled') {
        notificationUpdates.researchRemindersPM = value;
      } else if (key === 'amTime') {
        notificationUpdates.researchReminderTimeAM = value;
      } else if (key === 'pmTime') {
        notificationUpdates.researchReminderTimePM = value;
      }
      
      const updatedSettings = {
        ...defaults,
        ...currentSettings,
        notifications: {
          ...defaults.notifications,
          ...(currentSettings?.notifications || {}),
          ...notificationUpdates,
          researchRemindersAM: newSettings.amEnabled,
          researchReminderTimeAM: newSettings.amTime,
          researchRemindersPM: newSettings.pmEnabled,
          researchReminderTimePM: newSettings.pmTime
        }
      };
      saveSettings(updatedSettings);
      
      // Sync to Firestore
      await syncNotificationSettingsToFirestore();
    }
  };

  // Set topbar tabs via custom event
  useEffect(() => {
    const tabs = [
      { value: 'protocols', label: 'Protocols' },
      { value: 'reminders', label: 'Reminders' },
      { value: 'history', label: 'History' }
    ];
    window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', { 
      detail: { 
        tabs, 
        activeTab, 
        onTabChange: setActiveTab,
        onActionClick: handleAddClick,
        actionDisabled: isReadOnly
      } 
    }));
    
    // Listen for topbar search events for page-specific search
    const handleSearch = (e) => {
      setSearchQuery(e.detail.query);
    };
    window.addEventListener('tpp:protocols-search', handleSearch);
    
    return () => {
      window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'));
      window.removeEventListener('tpp:protocols-search', handleSearch);
    };
  }, [activeTab, isReadOnly, handleAddClick]);

  const filteredProtocols = React.useMemo(() => {
    if (!searchQuery) return protocols;
    const query = searchQuery.toLowerCase();
    return protocols.filter(p => {
      const protocolName = (p.protocolName || p.name || '').toLowerCase();
      return protocolName.includes(query);
    });
  }, [protocols, searchQuery]);

  // Organize protocols: active first, then inactive (alphabetically sorted)
  const organizedProtocols = React.useMemo(() => {
    // Ensure filteredProtocols is always an array
    const protocolsToOrganize = Array.isArray(filteredProtocols) ? filteredProtocols : [];
    const active = [];
    const inactive = [];

    protocolsToOrganize.forEach(p => {
      const isActive = p.active === true || isActiveNow(p);
      if (isActive) {
        active.push(p);
      } else {
        inactive.push(p);
      }
    });

    // Sort both groups alphabetically by name
    const sortByName = (a, b) => {
      const nameA = (a.name || a.protocolName || '').toLowerCase();
      const nameB = (b.name || b.protocolName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    };

    active.sort(sortByName);
    inactive.sort(sortByName);

    return { active, inactive };
  }, [filteredProtocols, isActiveNow]);

  // Check for draft start protocol data
  const hasDraftStart = React.useCallback((protocolId) => {
    try {
      const storageKey = `tpprover_start_protocol_draft_${protocolId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedData = JSON.parse(saved);
        return parsedData.data && Object.keys(parsedData.data).length > 0;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, []);

  // Memoize dropdown options to prevent blank dropdown on first render
  // Ensure organizedProtocols is always defined with safe defaults
  const protocolFilterOptions = React.useMemo(() => {
    const activeCount = organizedProtocols?.active?.length ?? 0;
    const inactiveCount = organizedProtocols?.inactive?.length ?? 0;
    const totalCount = activeCount + inactiveCount;
    
    return [
      { 
        value: 'all', 
        label: `All Protocols (${totalCount})`,
        icon: <List size={16} style={{ color: theme.textLight }} />
      },
      { 
        value: 'active', 
        label: `Active Only (${activeCount})`,
        icon: <CheckCircle2 size={16} style={{ color: theme.primary }} />
      },
      { 
        value: 'inactive', 
        label: `Inactive Only (${inactiveCount})`,
        icon: <XCircle size={16} style={{ color: '#6b7280' }} />
      }
    ];
  }, [organizedProtocols?.active?.length, organizedProtocols?.inactive?.length, theme.textLight, theme.primary]);

  return (
    <div className="page-bg">
      <ProtocolsTipsBanner theme={theme} />
      
      <div className="space-y-4 px-2 sm:px-4 md:px-6 lg:px-8">

        {/* Content based on active tab */}
        {activeTab === 'protocols' && (
          <div>
            {/* Filter Dropdown */}
            {protocols.length > 0 && (
              <div className="mb-6">
                <CustomDropdown
                  value={protocolFilter}
                  onChange={setProtocolFilter}
                  options={protocolFilterOptions}
                  theme={theme}
                  placeholder="Filter protocols..."
                  outlined={true}
                  customShadow={true}
                />
              </div>
            )}

            {filteredProtocols.length === 0 ? (
              searchQuery ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
                    <FileText size={32} style={{ color: theme.primary }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Results Found</h3>
                  <p className="text-sm" style={{ color: theme.textLight }}>
                    No protocols match your search query.
                  </p>
                </div>
              ) : protocols.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
                    <FileText size={32} style={{ color: theme.primary }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Protocols Yet</h3>
                  <p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
                    Create a protocol to track dosing, timing, and adherence.
                  </p>
                  {!isReadOnly && (
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                      <button
                        onClick={() => setOpenQuickStart(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all hover:opacity-90 hover:scale-105 btn-primary-inset"
                        style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                      >
                        <Zap size={18} fill="currentColor" />
                        Quick Start (30 sec)
                      </button>
                      <button
                        onClick={() => setOpenAdd(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                        style={{ 
                          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.secondary, 
                          color: theme.text,
                          border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
                        }}
                      >
                        <Settings size={16} />
                        Full Setup
                      </button>
                    </div>
                  )}
                </div>
              ) : null
            ) : (
              <div className="space-y-6">
                {/* Active Protocols Section */}
                {(protocolFilter === 'all' || protocolFilter === 'active') && organizedProtocols.active.length > 0 && (
                  <div className="space-y-4">
                    {protocolFilter === 'all' && (
                      <h2 
                        className="text-sm font-semibold uppercase tracking-wider px-1"
                        style={{ color: theme.textLight }}
                      >
                        Active Protocols
                      </h2>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {organizedProtocols.active.map(p => (
                        <ProtocolCard 
                          key={p.id}
                          item={p}
                          theme={theme}
                          isActive={true}
                          onStartClick={handleStartClick}
                          onEditClick={handleEditClick}
                          onHistoryClick={setHistoryProtocol}
                          hasDraftStart={hasDraftStart(p.id)}
                          onUpdateProtocol={updateProtocolWithForceSync}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Inactive Protocols Section */}
                {(protocolFilter === 'all' || protocolFilter === 'inactive') && organizedProtocols.inactive.length > 0 && (
                  <div className="space-y-4">
                    {protocolFilter === 'all' && organizedProtocols.active.length > 0 && (
                      <h2 
                        className="text-sm font-semibold uppercase tracking-wider px-1"
                        style={{ color: theme.textLight }}
                      >
                        Inactive Protocols
                      </h2>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                      {organizedProtocols.inactive.map(p => (
                        <ProtocolCard 
                          key={p.id}
                          item={p}
                          theme={theme}
                          isActive={false}
                          onStartClick={handleStartClick}
                          onEditClick={handleEditClick}
                          onHistoryClick={setHistoryProtocol}
                          hasDraftStart={hasDraftStart(p.id)}
                          compact={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* No results based on filter */}
                {((protocolFilter === 'active' && organizedProtocols.active.length === 0) ||
                  (protocolFilter === 'inactive' && organizedProtocols.inactive.length === 0)) && (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
                      <FileText size={32} style={{ color: theme.primary }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
                      No {protocolFilter === 'active' ? 'Active' : 'Inactive'} Protocols
                    </h3>
                    <p className="text-sm" style={{ color: theme.textLight }}>
                      {protocolFilter === 'active' 
                        ? 'Start a protocol to see it here.' 
                        : 'Inactive protocols will appear here once you end them.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="relative">
            {(() => {
              // Helper function to get status badge info
              const getStatusBadge = (status) => {
                switch (status) {
                  case 'completed':
                    return {
                      icon: CalendarCheck,
                      label: 'Completed',
                      bgColor: theme.isDark ? '#3c4e3a' : '#607c5c',
                      textColor: '#dcfce7'
                    };
                  case 'ended_early':
                    return {
                      icon: CalendarX,
                      label: 'Ended Early',
                      bgColor: theme.isDark ? '#6D2B2C' : '#A14D4D',
                      textColor: '#fee2e2'
                    };
                  case 'rescheduled':
                    return {
                      icon: Clock,
                      label: 'Rescheduled',
                      bgColor: theme.isDark ? '#78350f' : '#fef3c7',
                      textColor: theme.isDark ? '#fcd34d' : '#92400e'
                    };
                  default:
                    return null;
                }
              };

              // Get all history entries from localStorage (these have timestamps)
              const allHistoryEntries = getProtocolHistory();
              
              // Filter for finished history entries (must have endDate)
              const finishedHistoryEntries = allHistoryEntries.filter(entry => {
                return entry.endDate && entry.protocolId;
              });

              if (finishedHistoryEntries.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center content-section">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}15`, boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.08)' }}>
                      <Clock size={32} style={{ color: theme.primary }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>Protocol History</h3>
                    <p className="text-xs" style={{ color: theme.textLight }}>Complete a protocol first!</p>
                  </div>
                );
              }

              // Sort by timestamp (most recent first) - use updatedAt if available, fallback to createdAt, then endDate
              const sortedHistoryEntries = [...finishedHistoryEntries].sort((a, b) => {
                // Use updatedAt timestamp if available (most accurate for recent changes)
                const aTimestamp = a.updatedAt ? new Date(a.updatedAt) : (a.createdAt ? new Date(a.createdAt) : new Date(a.endDate));
                const bTimestamp = b.updatedAt ? new Date(b.updatedAt) : (b.createdAt ? new Date(b.createdAt) : new Date(b.endDate));
                return bTimestamp.getTime() - aTimestamp.getTime();
              });

              // Group history entries by month/year and create timeline entries
              const timelineEntries = [];
              let currentMonthYear = null;
              
              sortedHistoryEntries.forEach((entry, index) => {
                if (!entry.endDate) return;
                const endDate = new Date(entry.endDate);
                const month = endDate.toLocaleDateString('en-US', { month: 'short' });
                const year = endDate.getFullYear();
                const monthYearKey = `${month} ${year}`;
                
                // Add month/year header if it's a new month
                if (monthYearKey !== currentMonthYear) {
                  timelineEntries.push({
                    type: 'header',
                    key: monthYearKey,
                    month,
                    year,
                    date: endDate
                  });
                  currentMonthYear = monthYearKey;
                }
                
                // Find the protocol object for this history entry
                const protocol = protocols.find(p => p.id === entry.protocolId);
                
                // Add history entry
                const startDate = entry.startDate ? new Date(entry.startDate) : null;
                const endDateObj = entry.endDate ? new Date(entry.endDate) : null;
                let durationDays = 0;
                if (startDate && endDateObj) {
                  durationDays = Math.ceil((endDateObj - startDate) / (1000 * 60 * 60 * 24)) + 1;
                }
                
                // Determine completion status
                const completionStatus = entry.completionStatus || 'unknown';
                
                timelineEntries.push({
                  type: 'protocol',
                  historyEntry: entry,
                  protocol: protocol,
                  durationDays,
                  startDate: startDate ? formatMMDDYYYY(entry.startDate) : 'Not started',
                  endDate: endDateObj ? formatMMDDYYYY(entry.endDate) : 'Ongoing',
                  completionStatus: completionStatus
                });
              });

              // Helper function to get icon for completion status
              const getStatusIcon = (status) => {
                switch (status) {
                  case 'completed':
                    return CheckCircle2;
                  case 'ended_early':
                    return XCircle;
                  case 'rescheduled':
                    return Clock;
                  default:
                    return FlaskConical;
                }
              };

              return (
                <div className="relative">
                  {/* Timeline entries */}
                  <div className="space-y-3">
                    {timelineEntries.map((entry, index) => {
                      if (entry.type === 'header') {
                        // Month/Year header - simplified without timeline node
                        return (
                          <div key={entry.key} className="relative flex items-center mb-3 mt-4 first:mt-0">
                            <h3 
                              className="text-sm font-semibold uppercase tracking-wider"
                              style={{ color: theme.textLight }}
                            >
                              {entry.month} {entry.year}
                            </h3>
                          </div>
                        );
                      } else {
                        // Protocol entry
                        const historyEntry = entry.historyEntry;
                        const protocol = entry.protocol;
                        const statusBadge = getStatusBadge(entry.completionStatus);
                        const StatusIcon = statusBadge?.icon;
                        const TimelineIcon = getStatusIcon(entry.completionStatus);
                        const isHovered = hoveredHistoryId === historyEntry.id;
                        
                        return (
                          <div 
                            key={historyEntry.id} 
                            className="relative group"
                            onMouseEnter={() => setHoveredHistoryId(historyEntry.id)}
                            onMouseLeave={() => setHoveredHistoryId(null)}
                          >
                            {/* Floating icon node - only visible on hover */}
                            {isHovered && (
                              <div 
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 z-20 glass-panel-minimal"
                                style={{ 
                                  border: `2px solid ${theme.primary}`,
                                  boxShadow: `0 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px ${theme.primary}20`
                                }}
                              >
                                <TimelineIcon 
                                  size={18} 
                                  style={{ color: theme.primary }}
                                />
                              </div>
                            )}
                            
                            {/* Protocol card with glassmorphism */}
                            <button
                              onClick={() => setSelectedHistoryEntry(historyEntry)}
                              className="w-full text-left rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] relative glass-panel-minimal widget-card-hover"
                            >
                              <div className="flex gap-4 p-4">
                                {/* Main content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    {protocol?.emoji && (
                                      <span className="text-xl">{protocol.emoji}</span>
                                    )}
                                    <span className="font-semibold text-base" style={{ color: theme.text }}>
                                      {historyEntry.protocolName || protocol?.protocolName || protocol?.name || 'Unnamed Protocol'}
                                    </span>
                                  </div>
                                  
                                  {/* Status badge - inline */}
                                  {statusBadge && StatusIcon && (
                                    <div className="inline-block mt-1.5">
                                      <span 
                                        className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 w-fit"
                                        style={{ 
                                          backgroundColor: statusBadge.bgColor,
                                          color: statusBadge.textColor,
                                          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                                        }}
                                      >
                                        <StatusIcon size={12} />
                                        {statusBadge.label}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Sidebar with dates and duration */}
                                <div className="flex-shrink-0 w-32 text-right space-y-0.5 border-l pl-4" style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }}>
                                  <div className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textLight }}>
                                    {entry.startDate}
                                  </div>
                                  <div className="text-xs" style={{ color: theme.textLight }}>
                                    →
                                  </div>
                                  <div className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textLight }}>
                                    {entry.endDate}
                                  </div>
                                  {entry.durationDays > 0 && (
                                    <div className="pt-1.5 mt-1.5 border-t" style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }}>
                                      <div className="text-xs font-semibold" style={{ color: theme.text }}>
                                        {entry.durationDays} day{entry.durationDays !== 1 ? 's' : ''}
                                      </div>
                                    </div>
                                  )}
                                  <div className="pt-1.5 flex justify-end">
                                    <ChevronDown 
                                      size={16} 
                                      className="transform rotate-[-90deg] opacity-50"
                                      style={{ color: theme.textLight }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'reminders' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* AM Reminders Section */}
                <div className="content-section space-y-4 p-4 rounded-lg" style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>
                        Morning Reminders (AM)
                      </div>
                      <div className="text-xs" style={{ color: theme.textLight }}>
                        Receive a notification in the morning if you have research tasks scheduled
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input 
                        type="checkbox" 
                        checked={reminderSettings.amEnabled && pushNotificationStatus.enabled} 
                        onChange={e => updateReminderSetting('amEnabled', e.target.checked)} 
                        disabled={pushNotificationStatus.loading || !pushNotificationStatus.supported}
                        className="sr-only peer" 
                      />
                      <div 
                        className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}
                        style={{ 
                          backgroundColor: (reminderSettings.amEnabled && pushNotificationStatus.enabled) ? theme.primary : '#d1d5db',
                          opacity: (pushNotificationStatus.loading || !pushNotificationStatus.supported) ? 0.5 : 1
                        }}
                      />
                    </label>
                  </div>

                  {reminderSettings.amEnabled && pushNotificationStatus.enabled ? (
                    <div className="space-y-2 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:items-center">
                        <div>
                          <div className="text-xs mb-1" style={{ color: theme.textLight }}>
                            Reminder Time
                          </div>
                          <div className="text-lg font-semibold" style={{ color: theme.text }}>
                            {(() => {
                              const [hour24, minute] = reminderSettings.amTime.split(':').map(Number);
                              const hour12 = hour24 === 0 ? 12 : hour24;
                              return `${hour12}:${String(minute).padStart(2, '0')} AM`;
                            })()}
                          </div>
                        </div>
                        <div className="flex md:justify-end">
                          <button
                            onClick={() => {
                              setCustomTimeInput(prev => ({ ...prev, am: reminderSettings.amTime }));
                              setTimeModalOpen(prev => ({ ...prev, am: true }));
                            }}
                            className="w-full md:w-auto px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
                            style={{
                              borderColor: theme.border,
                              backgroundColor: theme.cardBackground,
                              color: theme.primary
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="mt-4 p-3 rounded-lg text-sm text-center"
                      style={{ 
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : (theme.secondary || '#f9fafb'),
                        color: theme.textLight,
                        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`
                      }}
                    >
                      <span style={{ color: theme.textLight }}>No reminders set!</span>
                    </div>
                  )}
                </div>

                {/* PM Reminders Section */}
                <div className="content-section space-y-4 p-4 rounded-lg" style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>
                      Evening Reminders (PM)
                    </div>
                    <div className="text-xs" style={{ color: theme.textLight }}>
                      Receive a notification in the evening if you have research tasks scheduled
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input 
                      type="checkbox" 
                      checked={reminderSettings.pmEnabled && pushNotificationStatus.enabled} 
                      onChange={e => updateReminderSetting('pmEnabled', e.target.checked)} 
                      disabled={pushNotificationStatus.loading || !pushNotificationStatus.supported}
                      className="sr-only peer" 
                    />
                    <div 
                      className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}
                      style={{ 
                        backgroundColor: (reminderSettings.pmEnabled && pushNotificationStatus.enabled) ? theme.primary : '#d1d5db',
                        opacity: (pushNotificationStatus.loading || !pushNotificationStatus.supported) ? 0.5 : 1
                      }}
                    />
                  </label>
                </div>

                {reminderSettings.pmEnabled && pushNotificationStatus.enabled ? (
                  <div className="space-y-2 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:items-center">
                      <div>
                        <div className="text-xs mb-1" style={{ color: theme.textLight }}>
                          Reminder Time
                        </div>
                        <div className="text-lg font-semibold" style={{ color: theme.text }}>
                          {(() => {
                            const [hour24, minute] = reminderSettings.pmTime.split(':').map(Number);
                            const hour12 = hour24 === 12 ? 12 : hour24 - 12;
                            return `${hour12}:${String(minute).padStart(2, '0')} PM`;
                          })()}
                        </div>
                      </div>
                      <div className="flex md:justify-end">
                        <button
                          onClick={() => {
                            setCustomTimeInput(prev => ({ ...prev, pm: reminderSettings.pmTime }));
                            setTimeModalOpen(prev => ({ ...prev, pm: true }));
                          }}
                          className="w-full md:w-auto px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
                          style={{
                            borderColor: theme.border,
                            backgroundColor: theme.cardBackground,
                            color: theme.primary
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="mt-4 p-3 rounded-lg text-sm text-center"
                    style={{ 
                      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : (theme.secondary || '#f9fafb'),
                      color: theme.textLight,
                      border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`
                    }}
                  >
                    <span style={{ color: theme.textLight }}>No reminders set!</span>
                  </div>
                )}
                </div>
              </div>
          </div>
        )}
      </div>

      {/* Time Selection Modal for AM */}
      <Modal
        open={timeModalOpen.am}
        onClose={() => setTimeModalOpen(prev => ({ ...prev, am: false }))}
        title="Schedule Reminder (AM)"
        theme={theme}
        variant="modern"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Suggested Times */}
          <div className="space-y-2">
            {[
              { icon: SunDim, time: '07:00', label: '7:00 AM' },
              { icon: SunMedium, time: '09:30', label: '9:30 AM' },
              { icon: Sun, time: '11:00', label: '11:00 AM' }
            ].map((option) => {
              const Icon = option.icon;
              const isSelected = reminderSettings.amTime === option.time;
              return (
                <button
                  key={option.time}
                  onClick={() => {
                    updateReminderSetting('amTime', option.time);
                    setTimeModalOpen(prev => ({ ...prev, am: false }));
                  }}
                  className="w-full px-4 py-3 rounded-lg text-left border transition-all flex items-center gap-3"
                  style={{
                    borderColor: isSelected ? theme.primary : theme.border,
                    backgroundColor: isSelected ? `${theme.primary}10` : theme.cardBackground,
                    color: theme.text
                  }}
                >
                  <Icon size={20} style={{ color: isSelected ? theme.primary : theme.textLight }} />
                  <span className="flex-1 font-medium">{option.label}</span>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Page Break */}
          <div className="border-t my-4" style={{ borderColor: theme.border }} />

          {/* Custom Time Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium block flex items-center gap-2" style={{ color: theme.text }}>
              <ClockPlus size={16} />
              Pick your AM time (15 min increments)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <TimePicker15Min
                  value={customTimeInput.am || reminderSettings.amTime}
                  onChange={(time) => {
                    setCustomTimeInput(prev => ({ ...prev, am: time }));
                  }}
                  theme={theme}
                  timeRange="am"
                />
              </div>
              <button
                onClick={() => {
                  if (customTimeInput.am) {
                    updateReminderSetting('amTime', customTimeInput.am);
                    setTimeModalOpen(prev => ({ ...prev, am: false }));
                  }
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[0.98] active:scale-95"
                style={{ backgroundColor: theme.primary }}
              >
                Set
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Time Selection Modal for PM */}
      <Modal
        open={timeModalOpen.pm}
        onClose={() => setTimeModalOpen(prev => ({ ...prev, pm: false }))}
        title="Schedule Reminder (PM)"
        theme={theme}
        variant="modern"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Suggested Times */}
          <div className="space-y-2">
            {[
              { icon: Sun, time: '13:00', label: '1:00 PM' },
              { icon: Sunset, time: '17:30', label: '5:30 PM' },
              { icon: MoonStar, time: '20:00', label: '8:00 PM' }
            ].map((option) => {
              const Icon = option.icon;
              const isSelected = reminderSettings.pmTime === option.time;
              return (
                <button
                  key={option.time}
                  onClick={() => {
                    updateReminderSetting('pmTime', option.time);
                    setTimeModalOpen(prev => ({ ...prev, pm: false }));
                  }}
                  className="w-full px-4 py-3 rounded-lg text-left border transition-all flex items-center gap-3"
                  style={{
                    borderColor: isSelected ? theme.primary : theme.border,
                    backgroundColor: isSelected ? `${theme.primary}10` : theme.cardBackground,
                    color: theme.text
                  }}
                >
                  <Icon size={20} style={{ color: isSelected ? theme.primary : theme.textLight }} />
                  <span className="flex-1 font-medium">{option.label}</span>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Page Break */}
          <div className="border-t my-4" style={{ borderColor: theme.border }} />

          {/* Custom Time Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium block flex items-center gap-2" style={{ color: theme.text }}>
              <ClockPlus size={16} />
              Pick your PM time (15 min increments)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <TimePicker15Min
                  value={customTimeInput.pm || reminderSettings.pmTime}
                  onChange={(time) => {
                    setCustomTimeInput(prev => ({ ...prev, pm: time }));
                  }}
                  theme={theme}
                  timeRange="pm"
                />
              </div>
              <button
                onClick={() => {
                  if (customTimeInput.pm) {
                    updateReminderSetting('pmTime', customTimeInput.pm);
                    setTimeModalOpen(prev => ({ ...prev, pm: false }));
                  }
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[0.98] active:scale-95"
                style={{ backgroundColor: theme.primary }}
              >
                Set
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Protocol Dropdown Menu */}
      {showAddMenu && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setShowAddMenu(false)} />
          <div 
            className="fixed top-16 right-4 z-[101] rounded-lg shadow-xl overflow-hidden min-w-[200px]"
            style={{ 
              backgroundColor: theme.cardBackground,
              border: `1px solid ${theme.border}`,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
            }}
          >
            <button
              onClick={() => {
                setShowAddMenu(false);
                setOpenQuickStart(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left border-b"
              style={{ 
                color: theme.text,
                borderColor: theme.border
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Zap size={18} style={{ color: theme.primary }} fill={theme.primary} />
              <div className="flex-1">
                <div className="font-semibold">Quick Start</div>
                <div className="text-xs opacity-60">30 seconds, add details later</div>
              </div>
            </button>
            <button
              onClick={() => {
                setShowAddMenu(false);
                setOpenAdd(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left"
              style={{ 
                color: theme.text
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Settings size={18} style={{ color: theme.textLight }} />
              <div className="flex-1">
                <div className="font-semibold">Full Setup</div>
                <div className="text-xs opacity-60">Complete details</div>
              </div>
            </button>
          </div>
        </>
      )}

      <ProtocolEditorModal
        open={openAdd}
        onClose={() => {
          setOpenAdd(false);
          // Ensure other modals don't interfere
          setEditing(null);
          setStartConfirm(null);
        }}
        theme={theme}
        onSave={(data) => {
          setOpenAdd(false)
          // New protocols should not be active until explicitly started
          const cleaned = prepareItemForSave({ 
            id: generateId(), 
            ...data, 
            active: false, 
            startDate: data.startDate || ''
          }, { isNew: true });
          addProtocol(cleaned);
        }}
      />

      <QuickStartProtocolModal
        open={openQuickStart}
        onClose={() => setOpenQuickStart(false)}
        theme={theme}
        onSave={async (protocolData) => {
          // Protocol is already created with active: true and startDate set
          // Just add it to the protocols list
          const finalProtocol = prepareItemForSave({
            ...protocolData
          }, { isNew: true });
          
          addProtocol(finalProtocol);
          
          // Create a history entry immediately since it's started (with minimal protocolData for history detail view)
          const historyEntry = {
            protocolId: finalProtocol.id,
            protocolName: finalProtocol.protocolName,
            startDate: finalProtocol.startDate,
            protocolData: {
              protocolName: finalProtocol.protocolName,
              peptides: finalProtocol.peptides || [],
              linkedItems: finalProtocol.linkedItems || {}
            }
          };
          
          saveProtocolHistoryEntry(historyEntry);
          
          // Toast success
          window.dispatchEvent(new CustomEvent('tpp:toast', { 
            detail: { 
              message: `${finalProtocol.protocolName} started successfully! 🚀`, 
              type: 'success' 
            } 
          }));
          
          setOpenQuickStart(false);
        }}
      />

      <ProtocolEditorModal
        open={!!editing}
        onClose={() => {
          // If we came from manage modal, restore it
          if (editFromManage) {
            setManageConfirm(editFromManage);
            setEditFromManage(null);
          }
          setEditing(null);
        }}
        theme={theme}
        protocol={editing}
        onSave={(data) => {
          const updatedProtocol = { ...editing, ...data };
          
          // Re-calculate end-date if start date or duration changes
          const computeEndDate = (p) => {
              try {
                  if (!p?.startDate) return p.endDate || null;
                  // CRITICAL: Use centralized date parsing
                  const start = parseDateString(p.startDate);
                  if (!start) return p.endDate || null;
                  const startNormalized = normalizeToMidnight(start);
                  let end = null;
                  const cyclePeptide = p.peptides?.find(pep => pep.frequency?.type === 'cycle');
                  
                  // SPECIAL CASE: Ongoing cycles - calculate far-future endDate for scheduling
                  if (cyclePeptide && p.duration?.noEnd) {
                      const onDays = Number(cyclePeptide.frequency.onDays) || 0;
                      const offDays = Number(cyclePeptide.frequency.offDays) || 0;
                      if (onDays > 0) {
                          // For ongoing cycles, schedule 1 year ahead for calendar purposes
                          end = new Date(startNormalized);
                          end.setFullYear(end.getFullYear() + 1);
                      }
                  }
                  // Regular cycle with set duration
                  else if (cyclePeptide) {
                      const onDays = Number(cyclePeptide.frequency.onDays) || 0;
                      const offDays = Number(cyclePeptide.frequency.offDays) || 0;
                      if (onDays > 0 && p.duration && p.duration.count > 0 && p.duration.unit) {
                          const durationInDays = (() => {
                              const count = Number(p.duration.count);
                              const unit = String(p.duration.unit).toLowerCase();
                              if (unit.includes('day')) return count;
                              if (unit.includes('week')) return count * 7;
                              if (unit.includes('month')) return count * 30;
                              return 0;
                          })();
                          const fullCycles = Math.floor(durationInDays / onDays);
                          const remainingOn = durationInDays % onDays;
                          let total = fullCycles * (onDays + offDays);
                          if (remainingOn > 0) total += remainingOn; else if (fullCycles > 0) total -= offDays;
                          end = new Date(startNormalized);
                          end.setDate(end.getDate() + total - 1);
                      }
                  }
                  if (!end && p.duration && !p.duration.noEnd && p.duration.count > 0 && p.duration.unit) {
                      end = new Date(startNormalized);
                      const unit = String(p.duration.unit).toLowerCase();
                      const count = Number(p.duration.count) || 0;
                      if (unit.includes('day')) end.setDate(end.getDate() + count - 1);
                      else if (unit.includes('week')) end.setDate(end.getDate() + (count * 7) - 1);
                      else if (unit.includes('month')) { end.setMonth(end.getMonth() + count); end.setDate(end.getDate() - 1); }
                  }
                  return end ? getLocalDateString(end) : p.endDate || null;
              } catch { return p.endDate || null; }
          };

          // Always recalculate endDate when editing - this ensures washout is never included
          // and fixes any existing protocols with incorrect endDate
          const newEndDate = computeEndDate(updatedProtocol);
          const finalProtocol = { ...updatedProtocol, endDate: newEndDate };
          
          // Log if we're fixing an active protocol (helps with user communication)
          if (updatedProtocol.active && updatedProtocol.endDate && updatedProtocol.endDate !== newEndDate) {
            console.log('🔄 Recalculated endDate for active protocol:', updatedProtocol.name || updatedProtocol.protocolName, 'from', updatedProtocol.endDate, 'to', newEndDate);
          }

          // Update protocol with force sync for immediate cross-device update
          updateProtocolWithForceSync(finalProtocol);
          
          // Save to protocol draft for real-time sync with tasks/calendar
          try {
            const draftKey = `tpprover_protocol_draft_${finalProtocol.id}`;
            localStorage.setItem(draftKey, JSON.stringify({
              data: finalProtocol,
              timestamp: new Date().toISOString()
            }));
            
            // Emit event so Dashboard, TasksWidget, and Calendar pick up the changes immediately
            window.dispatchEvent(new CustomEvent('tpp:protocol-autosaved', {
              detail: { storageKey: draftKey, formData: finalProtocol }
            }));
            
            // Trigger calendar and dashboard refresh
            window.dispatchEvent(new CustomEvent('tpp:calendar-sync', { detail: { protocolUpdated: true } }));
            window.dispatchEvent(new CustomEvent('tpp:task-completion-changed', { detail: { protocolUpdated: true } }));
          } catch (e) {
            console.warn('Failed to save protocol draft:', e);
          }
          
          // If we came from manage modal, restore it with updated data
          if (editFromManage) {
            setManageConfirm(finalProtocol);
            setEditFromManage(null);
          }
          
          setEditing(null); 
        }}
        onDelete={(toDel) => {
          if (!toDel) return
          // Show confirmation modal instead of deleting immediately
          setDeleteFromEditor(toDel);
        }}
      />

      <EndProtocolAssessment
        open={!!followUpProtocol}
        onClose={handleFollowUpClose}
        protocol={followUpProtocol}
        historyEntryId={followUpHistoryId}
        theme={theme}
        stockpile={stockpile}
        setStockpile={setStockpile}
        reconItems={reconItems}
        setReconItems={setReconItems}
        reconHistory={reconHistory}
        setReconHistory={setReconHistory}
        onComplete={handleFollowUpClose}
      />

      {/* Protocol Ended Confirmation Modal */}
      <ConfirmationModal
        open={showProtocolEndedConfirm}
        onClose={() => {
          setShowProtocolEndedConfirm(false);
          setEndedProtocolName(null);
        }}
        onConfirm={() => {
          setShowProtocolEndedConfirm(false);
          setEndedProtocolName(null);
        }}
        title="Protocol Ended"
        message={`${endedProtocolName || 'Protocol'} has been ended successfully.`}
        confirmText="OK"
        cancelText=""
        type="primary"
        theme={theme}
        hideIcon={true}
      />

      <ProtocolHistoryModal
        open={!!historyProtocol}
        onClose={() => {
          setHistoryProtocol(null);
          setHistoryFromManage(false);
        }}
        onBack={historyFromManage ? () => {
          setHistoryProtocol(null);
          setManageConfirm(historyProtocol);
          setHistoryFromManage(false);
        } : undefined}
        protocol={historyProtocol}
        theme={theme}
        onStartProtocol={handleStartClick}
        onRestore={handleRestoreProtocol}
        onEdit={handleEditFromHistory}
        protocols={protocols}
        key={`${historyProtocol?.id}-${historyRefreshKey}`}
      />

      <ProtocolHistoryDetailModal
        open={!!selectedHistoryEntry}
        onClose={() => setSelectedHistoryEntry(null)}
        historyEntry={selectedHistoryEntry}
        theme={theme}
        stockpile={stockpile}
        onRestore={handleRestoreProtocol}
        onEdit={handleEditFromHistory}
        protocols={protocols}
      />

      {manageConfirm && manageConfirm.protocolName && (
        <BottomSheet
          open={true}
          onClose={() => {
            setManageConfirm(null);
            setManageTab('manage');
            setHistoryProtocol(null);
            setHistoryFromManage(false);
            setShowDateChangeTip(false);
          }}
          onBack={() => {
            setManageConfirm(null);
            setManageTab('manage');
            setHistoryProtocol(null);
            setHistoryFromManage(false);
            setShowDateChangeTip(false);
          }}
          title={manageConfirm.protocolName || 'Protocol'}
          centerTitle={true}
          theme={theme}
          maxHeight="85vh"
          footer={
            <div className="w-full flex items-center gap-3">
                {/* Left side - Close button */}
                <button
                    type="button"
                    onClick={() => {
                      setManageConfirm(null);
                      setManageTab('manage');
                    }}
                    className="text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ 
                        backgroundColor: 'transparent',
                        color: theme.textLight,
                        padding: '10px 20px',
                        border: 'none'
                    }}
                >
                    Close
                </button>
                
                {/* Right side - Tab-specific buttons */}
                <div className="flex-1 flex items-center justify-end gap-3">
                    {/* Edit Tab - Save Changes */}
                    {manageTab === 'edit' && (
                      <button
                          type="button"
                          onClick={() => {
                            // Dispatch event to trigger embedded editor save
                            window.dispatchEvent(new CustomEvent('tpp:save-embedded-editor'));
                          }}
                          className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap min-w-fit"
                          style={{ 
                              background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)`,
                              color: theme.textOnPrimary || '#ffffff',
                              border: 'none'
                          }}
                          onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = theme.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = theme.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';
                          }}
                      >
                          Save Changes
                      </button>
                    )}

                    {/* Manage Tab - Save Changes */}
                    {manageTab === 'manage' && (
                      <button
                          type="button"
                          onClick={() => {
                                  if (manageConfirm) {
                                      updateProtocolWithForceSync(manageConfirm); // Use force sync for Save button
                                      
                                      // Update history entry with current linkedItems (for complete data preservation)
                                      try {
                                          const activeHistoryEntry = findActiveProtocolHistoryEntry(manageConfirm.id);
                                          if (activeHistoryEntry) {
                                              // Extract skipped reconstitution data from linkedItems
                                              const skippedReconstitution = {};
                                              const linkedItems = manageConfirm.linkedItems || {};
                                              Object.entries(linkedItems).forEach(([peptideId, item]) => {
                                                  if (item.status === 'skipped' && item.deliveryMethod) {
                                                      const peptide = manageConfirm.peptides?.find(p => (p.id || `peptide-${manageConfirm.peptides.indexOf(p)}`) === peptideId);
                                                      skippedReconstitution[peptideId] = {
                                                          peptideName: peptide?.name || 'Unknown',
                                                          deliveryMethod: item.deliveryMethod
                                                      };
                                                  }
                                              });
                                              
                                              // Update history entry with complete linkedItems and skipped reconstitution
                                              const updatedProtocolData = {
                                                  ...(activeHistoryEntry.protocolData || {}),
                                                  linkedItems: linkedItems // Save complete linkedItems for reference
                                              };
                                              
                                              updateProtocolHistoryEntry(activeHistoryEntry.id, {
                                                  protocolData: updatedProtocolData,
                                                  skippedReconstitution: Object.keys(skippedReconstitution).length > 0 ? skippedReconstitution : null
                                              });
                                              // Sync linked vials to history
                                              Object.entries(linkedItems).forEach(([peptideId, item]) => {
                                                  // Sync archived (finished) vials from vialHistory
                                                  if (item.vialHistory?.length > 0) {
                                                      item.vialHistory.forEach(hv => {
                                                          if (hv.vialId) {
                                                              const snapshot = {
                                                                  vialId: hv.vialId,
                                                                  stockpileId: hv.vialId,
                                                                  name: hv.name || 'Unknown',
                                                                  mg: hv.mg,
                                                                  vendor: hv.vendor,
                                                                  cost: hv.cost || 0,
                                                                  usedAt: hv.usedAt
                                                              };
                                                              addVialToActiveProtocol(manageConfirm.id, snapshot);
                                                          }
                                                      });
                                                  }
                                                  // Sync currently active vial
                                                  if (item.status === 'linked' && item.vialId) {
                                                      const vial = stockpile.find(v => v.id === item.vialId);
                                                      const vialSnapshot = {
                                                          vialId: item.vialId,
                                                          stockpileId: item.vialId,
                                                          name: vial?.name || item.vialName || 'Unknown',
                                                          mg: vial?.mg || item.vialMg,
                                                          mgUnit: vial?.mgUnit || item.vialMgUnit || 'mg',
                                                          unit: vial?.unit || 'vial',
                                                          vendor: vial?.vendor || item.vialVendor,
                                                          cost: vial?.cost || item.vialCost || 0,
                                                          orderId: vial?.orderId || item.vialOrderId || null,
                                                          purchaseDate: vial?.purchaseDate || item.vialPurchaseDate || null,
                                                          documentation: vial?.documentation || []
                                                      };
                                                      addVialToActiveProtocol(manageConfirm.id, vialSnapshot);
                                                  }
                                              });
                                          }
                                      } catch (e) {
                                          console.warn('Failed to update protocol history with linkedItems:', e);
                                      }
                                      
                                      // Save to protocol draft for real-time sync with tasks/calendar
                                      try {
                                          const draftKey = `tpprover_protocol_draft_${manageConfirm.id}`;
                                          localStorage.setItem(draftKey, JSON.stringify({
                                              data: manageConfirm,
                                              timestamp: new Date().toISOString()
                                          }));
                                          
                                          // Emit event so TasksWidget and Calendar pick up the changes immediately
                                          window.dispatchEvent(new CustomEvent('tpp:protocol-autosaved', {
                                              detail: { storageKey: draftKey, formData: manageConfirm }
                                          }));
                                      } catch (e) {
                                          console.warn('Failed to save protocol draft:', e);
                                      }
                                      
                                      window.dispatchEvent(new CustomEvent('tpp:toast', { 
                                          detail: { message: 'Protocol updated successfully!', type: 'success' } 
                                      }));
                                  }
                                  setManageConfirm(null);
                                  setManageTab('manage');
                                  setHistoryProtocol(null); // Ensure history modal is also closed
                              }}
                          className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap min-w-fit"
                          style={{ 
                              background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)`,
                              color: theme.textOnPrimary || '#ffffff',
                              border: 'none'
                          }}
                          onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = theme.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = theme.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';
                          }}
                      >
                          Save Changes
                      </button>
                    )}

                    {/* Notes Tab - Add Note or Save Note */}
                    {manageTab === 'notes' && (
                      <>
                        {!showAddNoteForm && !editingNote && (
                          <button
                            onClick={() => setShowAddNoteForm(true)}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 btn-primary-inset"
                            style={{ 
                              backgroundColor: theme.primary, 
                              color: theme.textOnPrimary || '#ffffff',
                              border: 'none'
                            }}
                          >
                            Add Note
                          </button>
                        )}
                        {(showAddNoteForm || editingNote) && (
                          <>
                          <button
                            onClick={() => {
                              if (showAddNoteForm) {
                                setShowAddNoteForm(false);
                                setNewNote({ content: '', tags: [], linkedDate: getLocalDateString() });
                                } else if (editingNote) {
                                  setEditingNote(null);
                                }
                              }}
                              className="text-sm font-medium transition-opacity hover:opacity-70"
                              style={{ 
                                backgroundColor: 'transparent',
                                color: theme.textLight,
                                padding: '10px 20px',
                                border: 'none'
                              }}
                            >
                              Close
                            </button>
                            <button
                              onClick={() => {
                                if (showAddNoteForm) {
                                  handleAddNote();
                                } else if (editingNote) {
                                  handleSaveEditNote();
                                }
                              }}
                              className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 btn-primary-inset"
                              style={{ 
                                backgroundColor: theme.primary, 
                                color: theme.textOnPrimary || '#ffffff',
                                border: 'none'
                              }}
                            >
                              <Check size={18} />
                              Save Note
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {/* Share Tab - Copy Link, Share, Save (compact) */}
                    {manageTab === 'share' && (
                      <>
                        <button 
                          onClick={handleCopyLink} 
                          disabled={shareCopied} 
                          className="flex-1 flex items-center justify-center gap-1 px-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border-2 transition-all hover:scale-[1.02] active:scale-95" 
                          style={{ 
                            borderColor: shareCopied ? theme.primary : theme.border, 
                            backgroundColor: shareCopied ? `${theme.primary}15` : 'transparent', 
                            color: shareCopied ? theme.primary : theme.text,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {shareCopied ? <Check size={12} /> : <Copy size={12} />}
                          {shareCopied ? 'Copied!' : 'Copy Link'}
                        </button>
                        <button 
                          onClick={handleShareImage} 
                          className="flex-1 flex items-center justify-center gap-1 px-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-md hover:scale-[1.02] active:scale-95 btn-primary-inset" 
                          style={{ 
                            backgroundColor: theme.primary, 
                            color: theme.textOnPrimary || '#ffffff',
                            border: 'none',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Image size={12} />
                          Share
                        </button>
                        <button 
                          onClick={handleSaveShareCardToDevice} 
                          disabled={shareSaving || shareSaved}
                          className="flex-1 flex items-center justify-center gap-1 px-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60" 
                          style={{ 
                            borderColor: theme.primary, 
                            backgroundColor: `${theme.primary}12`,
                            color: theme.primary,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Download size={12} />
                          {shareSaving ? 'Saving…' : shareSaved ? 'Saved!' : 'Save'}
                        </button>
                      </>
                    )}
                </div>
            </div>
        }
        >
          <div className="space-y-4" style={{ height: 'calc(85vh - 200px)', display: 'flex', flexDirection: 'column' }}>
            {/* Tabs Navigation */}
            <div className="flex-shrink-0">
              <Tabs
                value={manageTab}
                onChange={setManageTab}
                options={[
                  { value: 'manage', label: 'Manage' },
                  { value: 'edit', label: 'Edit' },
                  { value: 'notes', label: 'Notes' },
                  { value: 'share', label: 'Share' },
                  { value: 'history', label: 'History' }
                ]}
                theme={theme}
                subtle={true}
                stretch={true}
              />
            </div>
            
            {/* Tab Content - Fixed height with scroll */}
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {/* Tab Content */}
            {manageTab === 'manage' && (
              <>
                {/* PROTOCOL SETTINGS - Accordion */}
                <div className="rounded-lg border mb-4" style={{ 
                  borderColor: theme.border,
                  backgroundColor: theme.cardBackground 
                }}>
                  <button
                    type="button"
                    onClick={() => setExpandedManageSections(prev => ({ ...prev, settings: !prev.settings }))}
                    className="w-full p-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      <Settings size={20} style={{ color: theme.primary }} />
                      <div className="flex flex-col gap-0.5 text-left">
                        <h4 className="text-base font-semibold" style={{ color: theme.text }}>Protocol Settings</h4>
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                          Schedule to Calendar
                        </span>
                      </div>
                    </div>
                    {expandedManageSections.settings ? (
                      <ChevronDown size={18} style={{ color: theme.textLight }} />
                    ) : (
                      <ChevronRight size={18} style={{ color: theme.textLight }} />
                    )}
                  </button>
                  
                  <div 
                    className="overflow-hidden transition-all duration-300"
                    style={{
                      maxHeight: expandedManageSections.settings ? '500px' : '0',
                      opacity: expandedManageSections.settings ? 1 : 0
                    }}
                  >
                    <div className="px-3 pb-2 pt-1 border-t" style={{ borderColor: theme.border }}>
                      {/* Compact Start Date - Inline */}
                      <div ref={dateRowRef} className="flex items-center gap-3 py-1">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Calendar size={16} style={{ color: theme.primary }} />
                          <span className="text-sm font-semibold" style={{ color: theme.text }}>{manageConfirm?.active ? 'Started' : 'Start'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <GlassmorphismDatePicker
                            value={manageConfirm?.startDate || ''}
                            onChange={(dateString) => {
                              setManageConfirm(p => ({...p, startDate: dateString}));
                            }}
                            onOpen={() => {
                              if (manageConfirm?.active && dateRowRef.current) {
                                const rect = dateRowRef.current.getBoundingClientRect();
                                setDateTipPos({ top: rect.top - 6, left: rect.left + rect.width / 2 });
                                setShowDateChangeTip(true);
                                if (dateChangeTipTimer.current) clearTimeout(dateChangeTipTimer.current);
                                dateChangeTipTimer.current = setTimeout(() => setShowDateChangeTip(false), 3000);
                              }
                            }}
                            theme={theme}
                            placeholder="Select start date"
                          />
                        </div>
                      </div>
                      
                      {/* Schedule Preview */}
                      {manageConfirm && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
                          <VisualSchedulePreview 
                            protocol={manageConfirm}
                            startDate={manageConfirm?.startDate || getLocalDateString()}
                            theme={theme}
                            onUpdateProtocol={(updated) => {
                              updateProtocolWithForceSync(updated);
                              setManageConfirm(updated);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vials & Delivery Methods - Accordion */}
                {manageConfirm?.active && manageConfirm?.linkedItems && (
                    <div className="rounded-lg border mb-4 relative" style={{ 
                      borderColor: theme.border,
                      backgroundColor: theme.cardBackground,
                      zIndex: 1
                    }}>
                      <button
                        type="button"
                        onClick={() => setExpandedManageSections(prev => ({ ...prev, vials: !prev.vials }))}
                        className="w-full p-3 flex items-center justify-between hover:opacity-80 transition-opacity relative"
                        style={{ zIndex: 1 }}
                      >
                        <div className="flex items-center gap-3">
                          <TestTubes size={20} style={{ color: theme.primary }} />
                          <div className="flex flex-col gap-0.5 text-left">
                            <h4 className="text-base font-semibold" style={{ color: theme.text }}>Vials & Delivery Methods</h4>
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                              Link from Stockpile
                            </span>
                          </div>
                        </div>
                        {expandedManageSections.vials ? (
                          <ChevronDown size={18} style={{ color: theme.textLight }} />
                        ) : (
                          <ChevronRight size={18} style={{ color: theme.textLight }} />
                        )}
                      </button>
                      
                      <div 
                        className="overflow-hidden transition-all duration-300 relative"
                        style={{
                          maxHeight: expandedManageSections.vials ? '3000px' : '0',
                          opacity: expandedManageSections.vials ? 1 : 0,
                          zIndex: 2
                        }}
                      >
                        <div className="px-3 pb-3 pt-2 border-t relative" style={{ borderColor: theme.border, zIndex: 2 }}>
                          <EditActiveProtocolVials
                            protocol={manageConfirm}
                            stockpile={stockpile}
                            setStockpile={setStockpile}
                            theme={theme}
                            onUpdate={(updatedLinkedItems) => {
                                setManageConfirm(p => ({ ...p, linkedItems: updatedLinkedItems }));
                            }}
                            onRequestRecon={(peptideId, vialId) => {
                                const vial = stockpile.find(s => s.id === vialId);
                                const linkedItem = manageConfirm?.linkedItems?.[peptideId];
                                const peptide = manageConfirm?.peptides?.find(p => (p.id || `peptide-${manageConfirm.peptides.indexOf(p)}`) === peptideId);
                                const name = peptide?.name || vial?.name || linkedItem?.vialName || '';
                                const mg = vial?.mg || linkedItem?.vialMg || '';
                                const vendor = vial?.vendor || linkedItem?.vialVendor || '';
                                const vendorId = vial?.vendorId || linkedItem?.vialVendorId || null;
                                const cost = vial?.cost || linkedItem?.vialCost || '';
                                try { localStorage.removeItem('recon_form_new'); } catch {}
                                setReconPrefill({
                                    peptides: [{ id: 1, name, mg: String(mg), mgUnit: vial?.mgUnit || 'mg', dose: String(peptide?.dosage?.amount || ''), doseUnit: peptide?.dosage?.unit || 'mcg' }],
                                    vendor: String(vendor),
                                    vendorId,
                                    cost: cost ? String(cost) : '',
                                });
                                setReconModalOpen(true);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                )}

                {/* Page Break */}
                <div className="border-t" style={{ borderColor: theme.border }}></div>

                <div className="p-3 rounded-lg border" style={{ borderColor: theme.isDark ? 'rgba(200,122,92,0.3)' : 'rgba(181,104,74,0.25)', backgroundColor: theme.isDark ? 'rgba(200,122,92,0.1)' : 'rgba(200,122,92,0.06)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="text-sm font-semibold mb-0.5" style={{ color: theme.isDark ? '#e8a88a' : '#a35a3f' }}>End protocol early?</div>
                            <div className="text-xs" style={{ color: theme.isDark ? '#d4977d' : '#8b4d36' }}>Ends today and starts washout period.</div>
                        </div>
                        <button
                            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95 ml-3"
                            style={{ background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)', color: '#ffffff', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 2px rgba(0,0,0,0.1)' }}
                            onClick={() => {
                                endProtocol(manageConfirm);
                                setManageConfirm(null);
                            }}
                        >
                            End Now
                        </button>
                    </div>
                </div>
              </>
            )}


            {manageTab === 'edit' && (
              <div className="h-full w-full overflow-x-hidden">
                {/* Render the full editor modal inline */}
                <ProtocolEditorModal
                  open={true}
                  onClose={() => {}}
                  theme={theme}
                  protocol={manageConfirm}
                  embedded={true}
                  onSave={(data) => {
                    // Use editor data as source of truth; overlay active-protocol-only fields from manageConfirm
                    const updatedProtocol = {
                      ...data,
                      id: manageConfirm.id,
                      active: manageConfirm.active,
                      startDate: manageConfirm.startDate ?? data.startDate,
                      endDate: manageConfirm.endDate ?? data.endDate,
                      linkedItems: manageConfirm.linkedItems ?? data.linkedItems,
                      emoji: manageConfirm.emoji ?? data.emoji
                    };
                    updateProtocolWithForceSync(updatedProtocol);
                    setManageConfirm(null);
                    setManageTab('manage');
                    window.dispatchEvent(new CustomEvent('tpp:toast', { 
                      detail: { message: 'Protocol updated successfully!', type: 'success' } 
                    }));
                  }}
                  onDelete={(toDel) => {
                    if (!toDel) return;
                    setDeleteFromEditor(toDel);
                  }}
                  isReadOnly={isReadOnly}
                  onUpgrade={() => setShowUpgradeModal(true)}
                />
              </div>
            )}

            {manageTab === 'notes' && (
              <div className="space-y-4">

                {/* Add Note Form */}
                {showAddNoteForm && (
                  <div className="content-section p-4 rounded-lg space-y-4" style={{
                    border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`
                  }}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold" style={{ color: theme.text }}>New Note</h3>
                      <button
                        onClick={() => {
                          setShowAddNoteForm(false);
                          setNewNote({ content: '', tags: [], linkedDate: getLocalDateString() });
                        }}
                        className="text-sm font-medium transition-opacity hover:opacity-70"
                        style={{ 
                          backgroundColor: 'transparent',
                          color: theme.textLight,
                          border: 'none',
                          padding: '4px 8px'
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    <textarea
                      value={newNote.content}
                      onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                      placeholder="Add your note here..."
                      className="w-full p-3 rounded-lg text-sm resize-none"
                      rows={4}
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
                        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                        color: theme.text
                      }}
                    />

                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: theme.textLight }}>
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {NOTE_TAGS.map(tag => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleTagToggle(tag.id)}
                            className="px-2 py-1 rounded text-xs font-medium transition-all"
                            style={{
                              backgroundColor: newNote.tags.includes(tag.id)
                                ? theme.primary
                                : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                              color: newNote.tags.includes(tag.id)
                                ? theme.textOnPrimary
                                : theme.text,
                              border: `1px solid ${newNote.tags.includes(tag.id) ? theme.primary : theme.border}`
                            }}
                          >
                            {tag.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: theme.text }}>
                        <input
                          type="checkbox"
                          checked={showLinkedDate}
                          onChange={(e) => setShowLinkedDate(e.target.checked)}
                          className="rounded"
                          style={{ accentColor: theme.primary }}
                        />
                        <Calendar size={14} />
                        <span>Show in calendar</span>
                      </label>
                      {showLinkedDate && (
                        <div className="mt-2">
                          <GlassmorphismDatePicker
                            value={newNote.linkedDate}
                            onChange={(date) => setNewNote({ ...newNote, linkedDate: date })}
                            theme={theme}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Edit Note Form */}
                {editingNote && (
                  <div className="content-section p-4 rounded-lg space-y-4" style={{
                    border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`
                  }}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold" style={{ color: theme.text }}>Edit Note</h3>
                      <button
                        onClick={() => setEditingNote(null)}
                        className="p-1 rounded hover:bg-opacity-20"
                        style={{ color: theme.textLight }}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <textarea
                      value={editingNote.content || ''}
                      onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                      placeholder="Add your note here..."
                      className="w-full p-3 rounded-lg text-sm resize-none"
                      rows={4}
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
                        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                        color: theme.text
                      }}
                    />

                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: theme.textLight }}>
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {NOTE_TAGS.map(tag => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleTagToggle(tag.id, true)}
                            className="px-2 py-1 rounded text-xs font-medium transition-all"
                            style={{
                              backgroundColor: editingNote.tags?.includes(tag.id)
                                ? theme.primary
                                : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                              color: editingNote.tags?.includes(tag.id)
                                ? theme.textOnPrimary
                                : theme.text,
                              border: `1px solid ${editingNote.tags?.includes(tag.id) ? theme.primary : theme.border}`
                            }}
                          >
                            {tag.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: theme.text }}>
                        <input
                          type="checkbox"
                          checked={editingNote.showLinkedDate || false}
                          onChange={(e) => setEditingNote({ 
                            ...editingNote, 
                            showLinkedDate: e.target.checked 
                          })}
                          className="rounded"
                          style={{ accentColor: theme.primary }}
                        />
                        <Calendar size={14} />
                        <span>Show in calendar</span>
                      </label>
                      {editingNote.showLinkedDate && (
                        <div className="mt-2">
                          <GlassmorphismDatePicker
                            value={editingNote.linkedDate || getLocalDateString()}
                            onChange={(date) => setEditingNote({ ...editingNote, linkedDate: date })}
                            theme={theme}
                          />
                        </div>
                      )}
                    </div>

                    {/* Cancel button removed - use footer Cancel instead */}
                  </div>
                )}

                {/* Notes List */}
                {!showAddNoteForm && !editingNote && (
                  <div className="space-y-3">
                    {notes.length === 0 ? (
                      <div className="text-center py-8" style={{ color: theme.textLight }}>
                        <FileText size={48} className="mx-auto mb-3 opacity-50" />
                        <p>No notes yet. Add your first note to track progress!</p>
                      </div>
                    ) : (
                      notes.map((note) => (
                        <div
                          key={note.id}
                          className="content-section p-4 rounded-lg"
                          style={{
                            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <div className="text-xs mb-1" style={{ color: theme.textLight }}>
                                {formatMMDDYYYY(note.createdAt)}
                                {note.linkedDate && (
                                  <span className="ml-2 flex items-center gap-1">
                                    <Calendar size={12} />
                                    Linked to {formatMMDDYYYY(note.linkedDate)}
                                  </span>
                                )}
                              </div>
                              {note.content && (
                                <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: theme.text }}>
                                  {note.content}
                                </p>
                              )}
                              {note.tags && note.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {note.tags.map(tagId => {
                                    const tag = NOTE_TAGS.find(t => t.id === tagId);
                                    return tag ? (
                                      <span
                                        key={tagId}
                                        className="px-2 py-0.5 rounded text-xs font-medium"
                                        style={{
                                          backgroundColor: theme.primary + '20',
                                          color: theme.primary
                                        }}
                                      >
                                        {tag.label}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditNote({ ...note, showLinkedDate: !!note.linkedDate })}
                                className="p-1.5 rounded hover:bg-opacity-20 transition-all"
                                style={{ color: theme.textLight }}
                                title="Edit note"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-1.5 rounded hover:bg-opacity-20 transition-all"
                                style={{ color: theme.textLight }}
                                title="Delete note"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {manageTab === 'share' && manageConfirm && (
              <div className="space-y-4">
                {/* Header Section */}
                <div className="pt-2">
                  <div className="flex items-center gap-4 mb-4">
                    <Eye size={32} style={{ color: theme.primary }} />
                    <div className="flex flex-col gap-0.5 flex-1">
                      <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Preview</h4>
                      <div className="flex items-center gap-2 ml-1">
                        <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                          Shareable Content
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Card */}
                <div className="flex justify-center w-full overflow-x-auto pb-2">
                  <div 
                    ref={shareCardRef} 
                    className="bg-white rounded-2xl shadow-lg inline-block max-w-full" 
                    style={{ 
                      fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      padding: '0'
                    }}
                  >
                    <SharedProtocolCard item={manageConfirm} theme={theme} />
                  </div>
                </div>

              </div>
            )}

            {manageTab === 'history' && (
              <div className="relative">
                {(() => {
                  // Helper function to get icon for completion status
                  const getStatusIcon = (status) => {
                    switch (status) {
                      case 'completed':
                        return CheckCircle2;
                      case 'ended_early':
                        return XCircle;
                      case 'rescheduled':
                        return Clock;
                      default:
                        return FlaskConical;
                    }
                  };

                  if (timelineEntriesForManage.length > 0) {
                    return (
                      <div className="relative">
                        {/* Timeline entries */}
                        <div className="space-y-3">
                          {timelineEntriesForManage.map((entry, index) => {
                            if (entry.type === 'header') {
                              // Month/Year header - simplified without timeline node
                              return (
                                <div key={entry.key} className="relative flex items-center mb-3 mt-4 first:mt-0">
                                  <h3 
                                    className="text-sm font-semibold uppercase tracking-wider"
                                    style={{ color: theme.textLight }}
                                  >
                                    {entry.month} {entry.year}
                                  </h3>
                                </div>
                              );
                            } else {
                              // Protocol entry
                              const historyEntry = entry.historyEntry;
                              const statusBadge = getStatusBadge(entry.completionStatus);
                              const StatusIcon = statusBadge?.icon;
                              const TimelineIcon = getStatusIcon(entry.completionStatus);
                              const isHovered = hoveredHistoryId === historyEntry.id;
                              
                              return (
                                <div 
                                  key={historyEntry.id} 
                                  className="relative group"
                                  onMouseEnter={() => setHoveredHistoryId(historyEntry.id)}
                                  onMouseLeave={() => setHoveredHistoryId(null)}
                                >
                                  {/* Floating icon node - only visible on hover */}
                                  {isHovered && (
                                    <div 
                                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 z-20"
                                      style={{ 
                                        backgroundColor: theme.isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                                        backdropFilter: 'blur(10px)',
                                        border: `2px solid ${theme.primary}`,
                                        boxShadow: theme.isDark 
                                          ? '0 4px 12px rgba(0, 0, 0, 0.4)' 
                                          : '0 4px 12px rgba(0, 0, 0, 0.1)'
                                      }}
                                    >
                                      <TimelineIcon 
                                        size={18} 
                                        style={{ color: theme.primary }}
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Protocol card with glassmorphism */}
                                  <button
                                    onClick={() => setSelectedHistoryEntryForManage(historyEntry)}
                                    className="w-full text-left rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
                                    style={{ 
                                      backgroundColor: theme.isDark 
                                        ? 'rgba(31, 41, 55, 0.6)' 
                                        : 'rgba(255, 255, 255, 0.7)',
                                      backdropFilter: 'blur(20px)',
                                      WebkitBackdropFilter: 'blur(20px)',
                                      border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                                      boxShadow: theme.isDark 
                                        ? '0 4px 16px rgba(0, 0, 0, 0.3)' 
                                        : '0 4px 16px rgba(0, 0, 0, 0.08)'
                                    }}
                                  >
                                    <div className="flex gap-4 p-4">
                                      {/* Main content */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                          {manageConfirm?.emoji && (
                                            <span className="text-xl">{manageConfirm.emoji}</span>
                                          )}
                                          <span className="font-semibold text-base" style={{ color: theme.text }}>
                                            {historyEntry.protocolName || manageConfirm?.protocolName || manageConfirm?.name || 'Unnamed Protocol'}
                                          </span>
                                        </div>
                                        
                                        {/* Status badge - inline */}
                                        {statusBadge && StatusIcon && (
                                          <div className="inline-block mt-1.5">
                                            <span 
                                              className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 w-fit"
                                              style={{ 
                                                backgroundColor: statusBadge.bgColor,
                                                color: statusBadge.textColor
                                              }}
                                            >
                                              <StatusIcon size={12} />
                                              {statusBadge.label}
                                            </span>
                                          </div>
                                        )}
                                        
                                        {/* Terracotta Follow-Up Assessment Prompt Button */}
                                        {(() => {
                                          const hasFollowUp = historyEntry.notes && 
                                            Array.isArray(historyEntry.notes) && 
                                            historyEntry.notes.some(n => n.type === 'follow_up');
                                          if (!hasFollowUp && historyEntry.endDate) {
                                            return (
                                              <div className="mt-2">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFollowUpProtocolForManage(manageConfirm);
                                                    setFollowUpHistoryIdForManage(historyEntry.id);
                                                  }}
                                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                                                  style={{
                                                    background: terracottaGradient,
                                                    color: '#ffffff',
                                                    boxShadow: theme.isDark ? '0 2px 6px rgba(0, 0, 0, 0.4)' : '0 2px 6px rgba(0, 0, 0, 0.15)'
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = terracottaHoverGradient;
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = terracottaGradient;
                                                  }}
                                                >
                                                  <FileText size={12} />
                                                  Complete Follow-Up
                                                </button>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                      
                                      {/* Sidebar with dates and duration */}
                                      <div className="flex-shrink-0 w-32 text-right space-y-0.5 border-l pl-4" style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }}>
                                        <div className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textLight }}>
                                          {entry.startDate}
                                        </div>
                                        <div className="text-xs" style={{ color: theme.textLight }}>
                                          →
                                        </div>
                                        <div className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textLight }}>
                                          {entry.endDate}
                                        </div>
                                        {entry.durationDays > 0 && (
                                          <div className="pt-1.5 mt-1.5 border-t" style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }}>
                                            <div className="text-xs font-semibold" style={{ color: theme.text }}>
                                              {entry.durationDays} day{entry.durationDays !== 1 ? 's' : ''}
                                            </div>
                                          </div>
                                        )}
                                        <div className="pt-1.5 flex justify-end">
                                          <ChevronDown 
                                            size={16} 
                                            className="transform rotate-[-90deg] opacity-50"
                                            style={{ color: theme.textLight }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    );
                  } else {
                    // Check if protocol is currently active
                    const isActive = manageConfirm?.active === true || (manageConfirm?.id && findActiveProtocolHistoryEntry(manageConfirm.id));
                    return (
                      <div className="flex flex-col items-center justify-center py-4 px-6 text-center">
                        <div
                          className="px-4 py-2 rounded-full mb-3 max-w-md"
                          style={{
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.cardBackground,
                            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                            display: 'inline-block'
                          }}
                        >
                          <span className="text-sm font-medium text-center" style={{ color: theme.text }}>
                            {isActive 
                              ? (
                                  <>
                                    You're currently researching!<br />
                                    History will be added once you complete the protocol.
                                  </>
                                )
                              : "You haven't researched this one yet!"}
                          </span>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
            </div>
          </div>
        </BottomSheet>
      )}

      {/* History Detail Modal - From Manage Tab */}
      <ProtocolHistoryDetailModal
        open={!!selectedHistoryEntryForManage}
        onClose={() => setSelectedHistoryEntryForManage(null)}
        historyEntry={selectedHistoryEntryForManage}
        theme={theme}
        stockpile={stockpile}
        onRestore={handleRestoreProtocol}
        onEdit={handleEditFromHistory}
        protocols={protocols}
      />

      {/* Follow-Up Modal - From Manage Tab */}
      {followUpProtocolForManage && (
        <ProtocolFollowUpModal
          open={!!followUpProtocolForManage}
          onClose={() => {
            setFollowUpProtocolForManage(null);
            setFollowUpHistoryIdForManage(null);
            window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
          }}
          protocol={followUpProtocolForManage}
          historyEntryId={followUpHistoryIdForManage}
          theme={theme}
          onSave={() => {
            setFollowUpProtocolForManage(null);
            setFollowUpHistoryIdForManage(null);
            window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
          }}
        />
      )}

      {/* Delete Confirmation Modal - From Manage Modal */}
      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            deleteProtocol(deleteConfirm.id);
            setManageConfirm(null);
            setDeleteConfirm(null);
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
              detail: { message: 'Protocol deleted successfully', type: 'success' } 
            }));
          }
        }}
        title="Delete Protocol?"
        message={`Are you sure you want to delete "${deleteConfirm?.protocolName || deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
        theme={theme}
      />

      {/* Delete Confirmation Modal - From Editor Modal */}
      <ConfirmationModal
        open={!!deleteFromEditor}
        onClose={() => setDeleteFromEditor(null)}
        onConfirm={() => {
          if (deleteFromEditor) {
            deleteProtocol(deleteFromEditor.id);
            setEditing(null);
            setDeleteFromEditor(null);
            setEditFromManage(null); // Don't restore manage modal after deletion
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
              detail: { message: 'Protocol deleted successfully', type: 'success' } 
            }));
          }
        }}
        title="Delete Protocol?"
        message={`Are you sure you want to delete "${deleteFromEditor?.protocolName || deleteFromEditor?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
        theme={theme}
      />

      <StartProtocolWizard 
        open={!!startConfirm}
        onClose={() => setStartConfirm(null)}
        protocol={startConfirm ? (() => {
            // Always look up fresh protocol from array to ensure we have complete data
            const foundProtocol = protocols.find(p => p.id === startConfirm.id);
            if (!foundProtocol) {
                console.error('❌ Protocol not found in protocols array:', startConfirm.id, 'Available IDs:', protocols.map(p => p.id));
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'Protocol not found. Please refresh and try again.', type: 'error' } 
                }));
                return null;
            }
            // Validate found protocol has required fields
            if (!foundProtocol.protocolName && !foundProtocol.name) {
                console.error('❌ Found protocol missing name:', foundProtocol);
            }
            if (!foundProtocol.peptides || foundProtocol.peptides.length === 0) {
                console.error('❌ Found protocol missing peptides:', foundProtocol);
            }
            return foundProtocol;
        })() : null}
        stockpile={stockpile}
        setStockpile={setStockpile}
        theme={theme}
        onStart={(finalizedProtocol) => {
            // Validate protocol has required fields before saving
            if (!finalizedProtocol) {
                console.error('❌ Cannot start: protocol is null or undefined');
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'Cannot start protocol: missing data', type: 'error' } 
                }));
                return;
            }
            
            if (!finalizedProtocol.id) {
                console.error('❌ Cannot start: protocol missing id');
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'Cannot start protocol: missing protocol ID', type: 'error' } 
                }));
                return;
            }
            
            if (!finalizedProtocol.protocolName && !finalizedProtocol.name) {
                console.error('❌ Cannot start: protocol missing name', finalizedProtocol);
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'Cannot start protocol: protocol must have a name', type: 'error' } 
                }));
                return;
            }
            
            if (!finalizedProtocol.peptides || finalizedProtocol.peptides.length === 0) {
                console.error('❌ Cannot start: protocol missing peptides', finalizedProtocol);
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'Cannot start protocol: protocol must have at least one peptide', type: 'error' } 
                }));
                return;
            }
            
            // Find the original protocol to ensure we preserve all data
            const originalProtocol = protocols.find(p => p.id === finalizedProtocol.id);
            if (!originalProtocol) {
                console.error('❌ Cannot start: original protocol not found', finalizedProtocol.id);
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'Cannot start protocol: original protocol not found', type: 'error' } 
                }));
                return;
            }
            
            // Merge with original to preserve any missing fields
            // CRITICAL: Deep-merge peptides to preserve titration, dosage, and all nested data
            const mergedPeptides = (finalizedProtocol.peptides || originalProtocol.peptides || []).map((pep, index) => {
                const originalPep = originalProtocol.peptides?.[index];
                // If wizard returned peptides, merge each one with original to preserve titration/dosage/etc
                return {
                    ...originalPep,  // Original first (includes titration, dosage, all fields)
                    ...pep,          // Wizard data second (linkedItems, deliveryMethod updates)
                    // Explicitly preserve critical nested data that might be missing from wizard
                    titration: pep.titration || originalPep?.titration,
                    dosage: pep.dosage || originalPep?.dosage,
                    frequency: pep.frequency || originalPep?.frequency
                };
            });
            
            const mergedProtocol = {
                ...originalProtocol, // Start with original to preserve all data
                ...finalizedProtocol, // Override with wizard data
                // Ensure critical fields are preserved
                protocolName: finalizedProtocol.protocolName || originalProtocol.protocolName || originalProtocol.name,
                peptides: mergedPeptides, // Use deep-merged peptides
                purpose: finalizedProtocol.purpose || originalProtocol.purpose,
                duration: finalizedProtocol.duration || originalProtocol.duration
            };
            
            // Compute and persist explicit endDate based on duration/cycle for reliable calendar sync
            const computeEndDate = (p) => {
                try {
                    if (!p?.startDate) return null;
                    // CRITICAL: Use centralized date parsing
                    const start = parseDateString(p.startDate);
                    if (!start) return null;
                    const startNormalized = normalizeToMidnight(start);
                    let end = null;
                    // Prefer cycle if present
                    const cyclePeptide = p.peptides?.find(pep => pep.frequency?.type === 'cycle');
                    
                    // SPECIAL CASE: Ongoing cycles - calculate far-future endDate for scheduling
                    if (cyclePeptide && p.duration?.noEnd) {
                        const onDays = Number(cyclePeptide.frequency.onDays) || 0;
                        const offDays = Number(cyclePeptide.frequency.offDays) || 0;
                        if (onDays > 0) {
                            // For ongoing cycles, schedule 1 year ahead for calendar purposes
                            end = new Date(startNormalized);
                            end.setFullYear(end.getFullYear() + 1);
                        }
                    }
                    // Regular cycle with set duration
                    else if (cyclePeptide) {
                        const onDays = Number(cyclePeptide.frequency.onDays) || 0;
                        const offDays = Number(cyclePeptide.frequency.offDays) || 0;
                        if (onDays > 0 && p.duration && p.duration.count > 0 && p.duration.unit) {
                            const durationInDays = (() => {
                                const count = Number(p.duration.count);
                                const unit = String(p.duration.unit).toLowerCase();
                                if (unit.includes('day')) return count;
                                if (unit.includes('week')) return count * 7;
                                if (unit.includes('month')) return count * 30; // approx
                                return 0;
                            })();
                            const fullCycles = Math.floor(durationInDays / onDays);
                            const remainingOn = durationInDays % onDays;
                            let total = fullCycles * (onDays + offDays);
                            if (remainingOn > 0) total += remainingOn; else if (fullCycles > 0) total -= offDays;
                            end = new Date(startNormalized);
                            // For scheduling days inclusively, ensure exact number of ON days are counted
                            end.setDate(end.getDate() + total - 1);
                        }
                    }
                    if (!end && p.duration && !p.duration.noEnd && p.duration.count > 0 && p.duration.unit) {
                        end = new Date(startNormalized);
                        const unit = String(p.duration.unit).toLowerCase();
                        const count = Number(p.duration.count) || 0;
                        // Inclusive end: 5 days means start..start+4
                        if (unit.includes('day')) end.setDate(end.getDate() + count - 1);
                        else if (unit.includes('week')) end.setDate(end.getDate() + (count * 7) - 1);
                        else if (unit.includes('month')) { end.setMonth(end.getMonth() + count); end.setDate(end.getDate() - 1); }
                    }
                    return end ? getLocalDateString(end) : null;
                } catch { return null; }
            };

            const ensureTimes = (p) => ({
                ...p,
                peptides: (p.peptides || []).map(pep => {
                    const f = pep.frequency || {};
                    const time = Array.isArray(f.time) && f.time.length > 0 ? f.time : ['AM'];
                    // CRITICAL: Preserve all peptide data including titration, dosage, deliveryMethod, etc.
                    return { ...pep, frequency: { ...f, time } };
                })
            });

            const withTimes = ensureTimes(mergedProtocol);
            const explicitEnd = computeEndDate(withTimes);
            const toSave = explicitEnd 
                ? { ...withTimes, endDate: explicitEnd, active: true } 
                : { ...withTimes, active: true };

            // Final validation before saving
            if (!toSave.protocolName && !toSave.name) {
                console.error('❌ Cannot save: protocol still missing name after merge', toSave);
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'Cannot start protocol: name is required', type: 'error' } 
                }));
                return;
            }
            
            if (!toSave.peptides || toSave.peptides.length === 0) {
                console.error('❌ Cannot save: protocol still missing peptides after merge', toSave);
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'Cannot start protocol: at least one peptide is required', type: 'error' } 
                }));
                return;
            }

            // Save protocol history entry first so it's included in the force sync
            try {
                // Extract vial information from linkedItems and track skipped reconstitution
                const vials = [];
                const skippedReconstitution = {};
                const linkedItems = finalizedProtocol.linkedItems || {};
                Object.entries(linkedItems).forEach(([peptideId, item]) => {
                    if (item.status === 'skipped' && item.deliveryMethod) {
                        // Track skipped reconstitution with delivery method info
                        const peptide = finalizedProtocol.peptides?.find(p => (p.id || `peptide-${finalizedProtocol.peptides.indexOf(p)}`) === peptideId);
                        skippedReconstitution[peptideId] = {
                            peptideName: peptide?.name || 'Unknown',
                            deliveryMethod: item.deliveryMethod
                        };
                    } else if (item.status === 'linked' && item.vialId) {
                        const vial = stockpile.find(v => v.id === item.vialId);
                        if (vial) {
                            vials.push({
                                vialId: vial.id,
                                stockpileId: vial.id,
                                name: vial.name,
                                mg: vial.mg,
                                mgUnit: vial.mgUnit || 'mg',
                                unit: vial.unit || 'vial',
                                vendor: vial.vendor,
                                cost: vial.cost,
                                orderId: vial.orderId || null,
                                purchaseDate: vial.purchaseDate || null,
                                documentation: vial.documentation || [],
                                reconstitutionDate: null,
                                deliveryMethod: item.deliveryMethod || null
                            });
                        }
                    }
                });

                // Try to find the most recent reconstitution data for this protocol
                let reconstitutionData = null;
                try {
                    const reconItems = JSON.parse(localStorage.getItem('tpprover_recon_items') || '[]');
                    // Find recon items that match this protocol name
                    const protocolNameForRecon = toSave.protocolName || toSave.name || finalizedProtocol.protocolName || '';
                    const matchingRecon = reconItems
                        .filter(item => item.name && protocolNameForRecon && item.name.includes(protocolNameForRecon))
                        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                    
                    if (matchingRecon.length > 0) {
                        const latestRecon = matchingRecon[0];
                        reconstitutionData = {
                            date: latestRecon.date,
                            reconStrategy: latestRecon.reconStrategy,
                            peptides: latestRecon.peptides
                        };
                        
                        // Update vial reconstitution dates from recon data
                        if (latestRecon.peptides) {
                            latestRecon.peptides.forEach(reconPep => {
                                const vial = vials.find(v => v.vialId === reconPep.stockpileId || v.name === reconPep.name);
                                if (vial) {
                                    vial.reconstitutionDate = latestRecon.date;
                                }
                            });
                        }
                    }
                } catch (e) {
                    console.warn('Failed to load reconstitution data for history:', e);
                }

                // Save history entry with all linkedItems data - use toSave so history matches saved protocol (merge may have restored name)
                saveProtocolHistoryEntry({
                    protocolId: toSave.id,
                    protocolName: toSave.protocolName || toSave.name || 'Unnamed Protocol',
                    startDate: toSave.startDate,
                    protocolData: {
                        protocolName: toSave.protocolName || toSave.name,
                        peptides: toSave.peptides,
                        duration: toSave.duration,
                        purpose: toSave.purpose,
                        linkedItems: toSave.linkedItems || {} // Save complete linkedItems for reference
                    },
                    vials: vials,
                    reconstitutionData: reconstitutionData,
                    skippedReconstitution: Object.keys(skippedReconstitution).length > 0 ? skippedReconstitution : null
                });
            } catch (error) {
                console.error('Failed to save protocol history:', error);
            }

            updateProtocolWithForceSync(toSave);

            // Trigger dashboard and calendar refresh
            window.dispatchEvent(new CustomEvent('tpp:calendar-sync', { detail: { protocolUpdated: true } }));
            window.dispatchEvent(new CustomEvent('tpp:task-completion-changed', { detail: { protocolStarted: true } }));

            // Close the modal after the update has been queued.
            setStartConfirm(null);
        }}
      />

      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        actionAttempted="modify protocols"
        theme={theme}
      />

      {/* Notes Modal for active protocols */}
      {manageConfirm && (
        <ProtocolNotesModal
          open={isNotesModalOpen}
          onClose={() => setIsNotesModalOpen(false)}
          protocol={manageConfirm}
          theme={theme}
        />
      )}

      {/* Share Modal */}
      {manageConfirm && (
        <ShareModal
          open={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          theme={theme}
          title="Protocol"
          shareUrl={`${window.location.origin}${SHARE_BASE_PATH}/protocols/${manageConfirm.id}`}
          CardComponent={ProtocolCard}
          cardProps={{ item: manageConfirm, theme, isPublicView: true }}
          shareData={{ ...manageConfirm, type: 'protocol' }}
        />
      )}

      <ReconCalculatorModal
        open={reconModalOpen}
        onClose={() => { setReconModalOpen(false); setReconPrefill(null); }}
        theme={theme}
        prefill={reconPrefill}
      />

      {showDateChangeTip && dateTipPos && createPortal(
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            top: dateTipPos.top,
            left: dateTipPos.left,
            transform: `translate(-50%, -100%)`,
            zIndex: 99999,
          }}
        >
          <div
            className="text-[11px] text-center py-1.5 px-4 rounded-lg whitespace-nowrap"
            style={{
              backgroundColor: theme.isDark ? '#2a2018' : '#fef6f2',
              color: '#c87a5c',
              border: '1px solid #c87a5c40',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              animation: 'fadeInDown 0.25s ease-out',
            }}
          >
            This will reschedule all research for this protocol.
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const formatFrequency = (freq) => {
  if (!freq) return 'Not set';
  const timeChoice = (() => {
    const times = freq.time || [];
    const hasAM = times.includes('AM');
    const hasPM = times.includes('PM');
    if (hasAM && hasPM) return 'AM/PM';
    if (hasAM) return 'AM';
    if (hasPM) return 'PM';
    return '';
  })();
  
  if (freq.type === 'cycle') {
    return `Cycle: ${freq.onDays || 0} on, ${freq.offDays || 0} off (${timeChoice})`;
  }
  return `Every ${freq.count || 1} ${String(freq.per || 'Day')}${freq.count > 1 ? 's' : ''} (${timeChoice})`;
};