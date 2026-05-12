import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Mail, Send, CheckCircle, AlertCircle, Bug, Lightbulb, ArrowLeft, Clock, MessageSquare, Camera, HelpCircle, Search, ChevronDown, ChevronUp, Map, BookOpen, ChevronRight } from 'lucide-react';
import { Bug as PhosphorBug, ChatCenteredText as PhosphorChatCenteredText, Lightbulb as PhosphorLightbulb, Microscope as PhosphorMicroscope, Question as PhosphorQuestion } from '@phosphor-icons/react';
import { useAppContext } from '../../context/AppContext';
import { submitFeedback, createSupportTicket, getUserTickets } from '../../services/firebase';
import { uploadImageToStorage } from '../../utils/storageUtils';
import { publicFaqCategories, inAppGuides, getAllFaqEntries, appRoadmap } from '../../data/faqContent';

export default function SupportModal({ open, onClose, theme, showBackButton = false, onBack }) {
    const { user } = useAppContext();
    const [ticketType, setTicketType] = useState(null); // 'support' or 'bug' - choose first
    const [formData, setFormData] = useState({
        email: '',
        message: ''
    });
    const [selectedImages, setSelectedImages] = useState([]); // Array of {file: File, preview: string}
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [userTickets, setUserTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [showPreviousTickets, setShowPreviousTickets] = useState(false);
    const [helpQuery, setHelpQuery] = useState('');
    const [helpTab, setHelpTab] = useState('guides'); // 'guides' | 'faq' | 'roadmap'
    const [openHelpKey, setOpenHelpKey] = useState(null);
    
    // Track modal state to persist across app lifecycle changes
    const [internalOpen, setInternalOpen] = useState(open);
    const wasOpenBeforeBackground = useRef(false);
    const visibilityChangeTimeoutRef = useRef(null);
    const isInBackgroundState = useRef(false);
    const explicitCloseRequested = useRef(false);
    const previousOpenProp = useRef(open);

    // Monitor document visibility AND Capacitor App state to prevent modal from closing when app is minimized
    useEffect(() => {
        let capacitorAppListener = null;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // App is going to background - remember if modal was open
                if (internalOpen) {
                    wasOpenBeforeBackground.current = true;
                    isInBackgroundState.current = true;
                    console.log('📱 App minimized - preserving SupportModal state');
                }
            } else {
                // App is coming back to foreground
                if (visibilityChangeTimeoutRef.current) {
                    clearTimeout(visibilityChangeTimeoutRef.current);
                }
                
                visibilityChangeTimeoutRef.current = setTimeout(() => {
                    // If modal was open before going to background, restore it
                    if (wasOpenBeforeBackground.current) {
                        console.log('🔄 App returned to foreground - restoring SupportModal state');
                        setInternalOpen(true);
                        setTimeout(() => {
                            isInBackgroundState.current = false;
                            wasOpenBeforeBackground.current = false;
                        }, 500);
                    } else {
                        isInBackgroundState.current = false;
                    }
                }, 200);
            }
        };

        // Add Capacitor App state listener for better Android support
        const setupCapacitorListeners = async () => {
            try {
                const { Capacitor } = await import('@capacitor/core');
                if (Capacitor.isNativePlatform()) {
                    const { App } = await import('@capacitor/app');
                    
                    capacitorAppListener = await App.addListener('appStateChange', ({ isActive }) => {
                        if (!isActive) {
                            // App going to background
                            if (internalOpen) {
                                wasOpenBeforeBackground.current = true;
                                isInBackgroundState.current = true;
                                console.log('📱 App state changed to background (Capacitor) - preserving SupportModal state');
                            }
                        } else {
                            // App coming to foreground
                            if (visibilityChangeTimeoutRef.current) {
                                clearTimeout(visibilityChangeTimeoutRef.current);
                            }
                            
                            visibilityChangeTimeoutRef.current = setTimeout(() => {
                                if (wasOpenBeforeBackground.current) {
                                    console.log('🔄 App state changed to foreground (Capacitor) - restoring SupportModal state');
                                    setInternalOpen(true);
                                    setTimeout(() => {
                                        isInBackgroundState.current = false;
                                        wasOpenBeforeBackground.current = false;
                                    }, 500);
                                } else {
                                    isInBackgroundState.current = false;
                                }
                            }, 200);
                        }
                    });
                }
            } catch (error) {
                console.log('Capacitor App not available, using visibility API only');
            }
        };

        setupCapacitorListeners();
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (visibilityChangeTimeoutRef.current) {
                clearTimeout(visibilityChangeTimeoutRef.current);
            }
            if (capacitorAppListener) {
                capacitorAppListener.remove();
            }
        };
    }, [internalOpen]);

    // Sync internal state with prop, but be smart about it
    useEffect(() => {
        // Track if this is a user-initiated close (prop changed from true to false)
        const propChangedToFalse = previousOpenProp.current === true && open === false;
        previousOpenProp.current = open;

        // Only update internal state if:
        // 1. The prop changed to true (always allow opening)
        // 2. The prop changed to false AND we're not in a background state recovery period
        if (open) {
            setInternalOpen(true);
            wasOpenBeforeBackground.current = false;
            isInBackgroundState.current = false;
            explicitCloseRequested.current = false;
            setTicketType(null); // Reset ticket type when opening
            setHelpQuery('');
            setOpenHelpKey(null);
        } else if (propChangedToFalse && !isInBackgroundState.current && !wasOpenBeforeBackground.current) {
            // Only close if explicitly changed from true to false and we're stable
            explicitCloseRequested.current = true;
            setInternalOpen(false);
        } else if (!open && !isInBackgroundState.current && !wasOpenBeforeBackground.current && explicitCloseRequested.current) {
            // Allow closing if explicitly requested and we're stable
            setInternalOpen(false);
        }
        // Otherwise, ignore prop changes during background state transitions
    }, [open]);

    // Keep email in sync with logged-in user (read-only; always use account email)
    useEffect(() => {
        if (user?.email) {
            setFormData(prev => ({ ...prev, email: user.email }));
        }
    }, [user?.email, open]);

    // Load user's previous tickets when modal opens
    useEffect(() => {
        if (open && user?.email) {
            loadUserTickets();
        }
    }, [open, user?.email]);

    const loadUserTickets = async () => {
        if (!user?.email) return;
        setLoadingTickets(true);
        try {
            const tickets = await getUserTickets(user.email);
            setUserTickets(tickets);
        } catch (error) {
            console.error('❌ Failed to load user tickets:', error);
        } finally {
            setLoadingTickets(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        const MAX_IMAGES = 5;
        
        const validFiles = files.filter(file => {
            if (!file.type.startsWith('image/')) {
                alert(`${file.name} is not an image file`);
                return false;
            }
            if (file.size > MAX_SIZE) {
                alert(`${file.name} is too large. Maximum size is 5MB`);
                return false;
            }
            return true;
        });

        if (selectedImages.length + validFiles.length > MAX_IMAGES) {
            alert(`Maximum ${MAX_IMAGES} images allowed`);
            e.target.value = '';
            return;
        }

        const newImages = validFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));

        setSelectedImages(prev => [...prev, ...newImages]);
        e.target.value = ''; // Reset input
    };

    const handleRemoveImage = (index) => {
        const imageToRemove = selectedImages[index];
        URL.revokeObjectURL(imageToRemove.preview); // Clean up preview URL
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    };

    // Handle close with internal state management
    const handleClose = () => {
        // User explicitly closed the modal
        explicitCloseRequested.current = true;
        wasOpenBeforeBackground.current = false;
        isInBackgroundState.current = false;
        setInternalOpen(false);
        setTicketType(null);
        setHelpQuery('');
        setOpenHelpKey(null);
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.message.trim()) return;

        setIsSubmitting(true);
        setSubmitStatus(null);
        
        try {
            console.log('📤 Creating support ticket...', {
                userEmail: user?.email,
                userId: user?.uid,
                message: formData.message.trim(),
                imageCount: selectedImages.length
            });

            // Upload images only for support tickets (bug/suggestion are feedback-only, no attachments)
            const imageUrls = [];
            const imageStoragePaths = [];
            if (ticketType === 'support' && selectedImages.length > 0 && user?.uid) {
                try {
                    for (const imageData of selectedImages) {
                        const uploadResult = await uploadImageToStorage(
                            imageData.file, 
                            user.uid, 
                            'support'
                        );
                        imageUrls.push(uploadResult.url);
                        imageStoragePaths.push(uploadResult.path);
                    }
                    console.log(`✅ Uploaded ${imageUrls.length} image(s) to Firebase Storage`);
                } catch (uploadError) {
                    console.error('❌ Error uploading images:', uploadError);
                    throw new Error(`Failed to upload images: ${uploadError.message}`);
                }
            }

            // Three separate flows: suggestion & bug = feedback only (Bugs/Feedback tab, "From the Team" if needed). Support = ticket (SupportChatModal).
            if (ticketType === 'suggestion' || ticketType === 'bug') {
                // Submit as feedback only — no support ticket. Appears in admin Feedback & Bugs; reply via "From the Team" if warranted.
                await submitFeedback({
                    type: ticketType,
                    message: formData.message.trim(),
                    userEmail: user?.email || 'anonymous',
                    userId: user?.uid || null,
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                });
                console.log(`✅ ${ticketType === 'bug' ? 'Bug report' : 'Suggestion'} submitted to feedback`);
            } else {
                // Support only: create support ticket (open ticket → SupportChatModal)
                const ticketId = await createSupportTicket({
                    userId: user?.uid || null,
                    userEmail: user?.email,
                    userName: user?.displayName || user?.email?.split('@')[0] || 'App User',
                    type: 'support',
                    subject: 'Support Request',
                    message: formData.message.trim(),
                    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
                    imageStoragePaths: imageStoragePaths.length > 0 ? imageStoragePaths : undefined,
                    metadata: {
                        userAgent: navigator.userAgent,
                        url: window.location.href,
                        userEmail: user?.email,
                        userId: user?.uid || null
                    }
                });
                console.log('✅ Support ticket created:', ticketId);
                if (user?.email) await loadUserTickets();
            }
            
            setSubmitStatus('success');
            
            // Clean up preview URLs
            selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
            setFormData({ email: '', message: '' });
            setSelectedImages([]);
            
            // Auto-close after 2 seconds
            setTimeout(() => {
                setSubmitStatus(null);
                handleClose();
            }, 2000);
        } catch (error) {
            console.error('❌ Error creating support ticket:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!internalOpen) return null;

    return (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-2 sm:p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 backdrop-blur-md bg-black/30"
                onClick={handleClose}
            />
            
            {/* Modal */}
            <div
                className="relative rounded-lg shadow-xl max-w-md w-full max-h-[82dvh] sm:max-h-[86vh] flex flex-col overflow-hidden"
                style={{ backgroundColor: theme.cardBackground }}>
                {/* Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0" style={{ borderColor: theme.border }}>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {/* Back: to Beta when showBackButton, or to type selection when on form step */}
                        {(showBackButton && onBack) || ticketType ? (
                            <button
                                onClick={ticketType ? () => setTicketType(null) : onBack}
                                className="p-2 rounded-full transition-colors hover:opacity-70"
                                style={{ backgroundColor: theme.background }}
                                title={ticketType ? 'Back to support options' : 'Back'}
                            >
                                <ArrowLeft className="w-5 h-5" style={{ color: theme.primary }} />
                            </button>
                        ) : null}
                        <div className="p-2 rounded-full" style={{ backgroundColor: theme.background }}>
                            <PhosphorMicroscope size={21} weight="duotone" style={{ color: theme.primary }} />
                        </div>
                        <h2 className="text-lg sm:text-xl font-semibold truncate" style={{ color: theme.primaryDark }}>
                            {ticketType === 'bug' ? 'Report a Bug' : ticketType === 'suggestion' ? 'Share Your Idea' : ticketType === 'help' ? 'Help Center' : 'Support'}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full transition-colors hover:opacity-70"
                        style={{ backgroundColor: theme.background }}
                    >
                        <X className="w-5 h-5" style={{ color: theme.textLight }} />
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
                    {!ticketType ? (
                        /* Ticket Type Selection */
                        <div className="space-y-3">
                            {/* Help Center — always first */}
                            <button
                                onClick={() => setTicketType('help')}
                                className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-md"
                                style={{ borderColor: theme.primary + '60', backgroundColor: theme.primary + '08' }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-full" style={{ backgroundColor: theme.primary + '20' }}>
                                        <PhosphorQuestion size={24} weight="duotone" style={{ color: theme.primary }} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h4 className="font-semibold mb-1" style={{ color: theme.text }}>Help Center</h4>
                                        <p className="text-sm" style={{ color: theme.textLight }}>
                                            Quick guides, how-it-works walkthrough, and FAQ — find your answer instantly
                                        </p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setTicketType('support')}
                                className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-md"
                                style={{ borderColor: theme.border, backgroundColor: theme.background }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-full" style={{ backgroundColor: theme.primaryLight }}>
                                        <style>{`
                                            .tpp-support-ticket-icon [opacity="0.2"] {
                                                fill: ${theme.primary};
                                                opacity: 0.42;
                                            }
                                        `}</style>
                                        <PhosphorChatCenteredText
                                            className="tpp-support-ticket-icon"
                                            size={24}
                                            weight="duotone"
                                            style={{ color: theme.primaryDark || theme.primary }}
                                        />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h4 className="font-semibold mb-1" style={{ color: theme.text }}>Support Ticket</h4>
                                        <p className="text-sm" style={{ color: theme.textLight }}>
                                            Account questions, subscription help, general inquiries
                                        </p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setTicketType('bug')}
                                className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-md"
                                style={{ borderColor: theme.border, backgroundColor: theme.background }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-full" style={{ backgroundColor: theme.errorLight || '#FEE2E2' }}>
                                        <PhosphorBug size={24} weight="duotone" style={{ color: theme.error }} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h4 className="font-semibold mb-1" style={{ color: theme.text }}>Bug Report</h4>
                                        <p className="text-sm" style={{ color: theme.textLight }}>
                                            App crashes, features not working, technical issues
                                        </p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setTicketType('suggestion')}
                                className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-md"
                                style={{ borderColor: theme.border, backgroundColor: theme.background }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-full" style={{ backgroundColor: theme.warning + '20' }}>
                                        <PhosphorLightbulb size={24} weight="duotone" style={{ color: theme.warning }} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h4 className="font-semibold mb-1" style={{ color: theme.text }}>Suggestions</h4>
                                        <p className="text-sm" style={{ color: theme.textLight }}>
                                            Feature ideas, improvements, feedback
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    ) : ticketType === 'help' ? (
                        <HelpCenterPanel
                            theme={theme}
                            query={helpQuery}
                            setQuery={setHelpQuery}
                            tab={helpTab}
                            setTab={setHelpTab}
                            openKey={openHelpKey}
                            setOpenKey={setOpenHelpKey}
                            onContactSupport={() => setTicketType('support')}
                        />
                    ) : submitStatus === 'success' ? (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                                style={{ backgroundColor: theme.success + '20' }}>
                                <CheckCircle className="w-8 h-8" style={{ color: theme.success }} />
                            </div>
                            <h3 className="text-xl font-semibold mb-2" style={{ color: theme.text }}>
                                Message Sent!
                            </h3>
                            <p className="text-sm" style={{ color: theme.textLight }}>
                                We'll get back to you as soon as possible.
                            </p>
                        </div>
                    ) : submitStatus === 'error' ? (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                                style={{ backgroundColor: theme.error + '20' }}>
                                <AlertCircle className="w-8 h-8" style={{ color: theme.error }} />
                            </div>
                            <h3 className="text-xl font-semibold mb-2" style={{ color: theme.text }}>
                                Something went wrong
                            </h3>
                            <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                                Please try again or email us directly.
                            </p>
                            <button
                                onClick={() => setSubmitStatus(null)}
                                className="px-4 py-2 rounded-lg font-medium transition-colors"
                                style={{
                                    backgroundColor: theme.primary,
                                    color: theme.textOnPrimary
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={user?.email ?? ''}
                                        readOnly
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none cursor-default"
                                        style={{
                                            borderColor: theme.border,
                                            backgroundColor: theme.background || '#f1f5f9',
                                            color: theme.text
                                        }}
                                        placeholder="Sign in to use your account email"
                                        title="Uses your logged-in account email"
                                    />
                                    <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                                        Uses your account email (cannot be changed)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                                        Message *
                                    </label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        required
                                        rows={3}
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none"
                                        style={{
                                            borderColor: theme.border,
                                            backgroundColor: theme.isDark ? '#1e293b' : '#ffffff',
                                            color: theme.text
                                        }}
                                        placeholder={ticketType === 'suggestion' ? "I'd love to see..." : "Describe your question or issue..."}
                                    />
                                </div>

                                {/* Image Upload Section - Support tickets only */}
                                {ticketType === 'support' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                                            Attach Images (Optional)
                                        </label>
                                        <div className="space-y-2">
                                            <label
                                                className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:opacity-80"
                                                style={{
                                                    borderColor: theme.border,
                                                    backgroundColor: theme.isDark ? '#1e293b' : '#ffffff',
                                                    color: theme.text
                                                }}
                                            >
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={handleImageSelect}
                                                    disabled={isSubmitting || selectedImages.length >= 5}
                                                    className="hidden"
                                                />
                                                <Camera size={18} style={{ color: theme.primary }} />
                                                <span className="text-sm" style={{ color: theme.textLight }}>
                                                    {selectedImages.length >= 5 
                                                        ? 'Maximum 5 images reached' 
                                                        : 'Choose images (max 5MB each, up to 5 images)'}
                                                </span>
                                            </label>
                                            
                                            {/* Image Previews */}
                                            {selectedImages.length > 0 && (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {selectedImages.map((imageData, index) => (
                                                        <div key={index} className="relative group">
                                                            <img
                                                                src={imageData.preview}
                                                                alt={`Preview ${index + 1}`}
                                                                className="w-full h-20 object-cover rounded border"
                                                                style={{ borderColor: theme.border }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveImage(index)}
                                                                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
                                                                style={{ color: '#ffffff' }}
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 py-0.5 rounded-b">
                                                                {(imageData.file.size / 1024).toFixed(0)}KB
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!user?.email && (
                                    <p className="text-sm" style={{ color: theme.textLight }}>
                                        Sign in to submit a support request, bug report, or suggestion.
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !user?.email}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                                        color: '#ffffff'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSubmitting) {
                                            e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSubmitting) {
                                            e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
                                        }
                                    }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Send Message
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Previous Tickets Section */}
                            {user?.email && userTickets.length > 0 && (
                                <div className="border-t pt-4 mt-6" style={{ borderColor: theme.border }}>
                                    <button
                                        onClick={() => setShowPreviousTickets(!showPreviousTickets)}
                                        className="w-full flex items-center justify-between text-sm font-medium mb-3"
                                        style={{ color: theme.primary }}
                                    >
                                        <span>Your Previous Requests ({userTickets.length})</span>
                                        <span>{showPreviousTickets ? '−' : '+'}</span>
                                    </button>
                                    {showPreviousTickets && (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {userTickets.map((ticket) => (
                                                <div
                                                    key={ticket.id}
                                                    className="p-3 rounded-lg border text-sm"
                                                    style={{
                                                        borderColor: theme.border,
                                                        backgroundColor: theme.background
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            {ticket.type === 'bug' && <Bug size={14} style={{ color: theme.error }} />}
                                                            {ticket.type === 'suggestion' && <Lightbulb size={14} style={{ color: theme.warning }} />}
                                                            {ticket.type === 'support' && <Mail size={14} style={{ color: theme.info }} />}
                                                            <span className="font-semibold" style={{ color: theme.text }}>
                                                                {ticket.ticketNumber || `#${ticket.id.substring(0, 8)}`}
                                                            </span>
                                                        </div>
                                                        <span
                                                            className="text-xs px-2 py-0.5 rounded-full"
                                                            style={{
                                                                backgroundColor: (ticket.status === 'new' ? theme.warning : ticket.status === 'in-progress' ? theme.info : ticket.status === 'resolved' ? theme.success : theme.textLight) + '20',
                                                                color: ticket.status === 'new' ? theme.warning : ticket.status === 'in-progress' ? theme.info : ticket.status === 'resolved' ? theme.success : theme.textLight
                                                            }}
                                                        >
                                                            {ticket.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs mb-1" style={{ color: theme.textLight }}>
                                                        {ticket.subject}
                                                    </p>
                                                    {ticket.lastMessageAt && (
                                                        <div className="flex items-center gap-1 text-xs" style={{ color: theme.textLight }}>
                                                            <Clock size={10} />
                                                            {ticket.lastMessageAt?.toDate ? new Date(ticket.lastMessageAt.toDate()).toLocaleDateString() : 'Recently'}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Inline Help Center panel ──────────────────────────────────── */

function HelpCenterPanel({ theme, query, setQuery, tab, setTab, openKey, setOpenKey, onContactSupport }) {
    const searchResults = useMemo(() => {
        const q = (query || '').trim().toLowerCase();
        if (!q) return null;
        return getAllFaqEntries().filter((e) =>
            e.question.toLowerCase().includes(q) ||
            e.answer.toLowerCase().includes(q)
        );
    }, [query]);

    const renderAccordion = (entries, keyPrefix) => (
        <div className="space-y-1.5">
            {entries.map((entry, i) => {
                const key = `${keyPrefix}-${i}`;
                const isOpen = openKey === key;
                return (
                    <div key={key} className="rounded-xl overflow-hidden" style={{ backgroundColor: theme.background, border: `1px solid ${theme.border}` }}>
                        <button
                            type="button"
                            onClick={() => setOpenKey(isOpen ? null : key)}
                            className="w-full px-3 py-2.5 flex items-center justify-between text-left"
                            style={{ backgroundColor: isOpen ? theme.primary : 'transparent', color: isOpen ? (theme.white || '#fff') : theme.text }}
                        >
                            <span className="font-medium text-xs pr-2 leading-snug">{entry.question}</span>
                            {isOpen ? <ChevronUp size={14} className="flex-shrink-0" /> : <ChevronDown size={14} className="flex-shrink-0" />}
                        </button>
                        {isOpen && (
                            <div className="px-3 py-2.5 border-t text-xs leading-relaxed" style={{ borderColor: theme.border, color: theme.textLight }}>
                                {entry.answer}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-3">
            {/* Search */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: theme.background, border: `1px solid ${theme.border}` }}>
                <Search size={14} style={{ color: theme.textLight }} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search help articles…"
                    className="flex-1 bg-transparent border-0 outline-none text-sm"
                    style={{ color: theme.text }}
                />
                {query && <button type="button" onClick={() => setQuery('')} className="text-xs" style={{ color: theme.textLight }}>✕</button>}
            </div>

            {/* Search results */}
            {searchResults ? (
                <div>
                    <p className="text-xs mb-2 opacity-60" style={{ color: theme.text }}>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
                    {searchResults.length === 0
                        ? <p className="text-xs p-3 rounded-xl" style={{ backgroundColor: theme.background, color: theme.textLight }}>No results — try a different term or contact support below.</p>
                        : renderAccordion(searchResults, 'search')
                    }
                </div>
            ) : (
                <>
                    {/* Tab pills */}
                    <div className="flex gap-1.5 flex-wrap">
                        {[
                            { id: 'guides',  label: 'Guides',       icon: <BookOpen size={11} /> },
                            { id: 'faq',     label: 'FAQ',          icon: <HelpCircle size={11} /> },
                            { id: 'roadmap', label: 'How it works', icon: <Map size={11} /> },
                        ].map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => { setTab(t.id); setOpenKey(null); }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                                style={{
                                    backgroundColor: tab === t.id ? theme.primary : 'transparent',
                                    color: tab === t.id ? (theme.white || '#fff') : theme.text,
                                    border: `1px solid ${tab === t.id ? theme.primary : theme.border}`,
                                }}
                            >
                                {t.icon}{t.label}
                            </button>
                        ))}
                    </div>

                    {/* Guides */}
                    {tab === 'guides' && (
                        <div className="space-y-3">
                            {inAppGuides.map((group) => (
                                <div key={group.title}>
                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 opacity-60" style={{ color: theme.text }}>{group.title}</p>
                                    {renderAccordion(group.entries, `g-${group.title}`)}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* FAQ */}
                    {tab === 'faq' && (
                        <div className="space-y-3">
                            {publicFaqCategories.map((group) => (
                                <div key={group.title}>
                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 opacity-60" style={{ color: theme.text }}>{group.title}</p>
                                    {renderAccordion(group.faqs, `f-${group.title}`)}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Roadmap */}
                    {tab === 'roadmap' && (
                        <div className="relative space-y-2">
                            <div className="absolute left-4 top-4 bottom-4 w-0.5" style={{ backgroundColor: theme.border }} />
                            {appRoadmap.map((step, i) => {
                                const isOpen = openKey === `road-${i}`;
                                const isGold = step.color !== '#7F9E95';
                                return (
                                    <div key={i} className="relative flex gap-3">
                                        <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ backgroundColor: isGold ? '#C8912A' : theme.primary }}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 rounded-xl overflow-hidden" style={{ backgroundColor: theme.background, border: `1px solid ${theme.border}` }}>
                                            <button
                                                type="button"
                                                onClick={() => setOpenKey(isOpen ? null : `road-${i}`)}
                                                className="w-full px-3 py-2 flex items-center justify-between text-left"
                                            >
                                                <div>
                                                    <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: isGold ? '#C8912A' : theme.primary }}>{step.phase}</div>
                                                    <div className="text-xs font-semibold" style={{ color: theme.text }}>{step.title}</div>
                                                </div>
                                                <ChevronRight size={13} className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} style={{ color: theme.textLight }} />
                                            </button>
                                            {isOpen && (
                                                <div className="px-3 pb-2.5 text-xs leading-relaxed border-t" style={{ borderColor: theme.border, color: theme.textLight }}>
                                                    {step.body}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Contact support CTA */}
            <div className="mt-2 pt-3 border-t" style={{ borderColor: theme.border }}>
                <p className="text-xs mb-2 text-center" style={{ color: theme.textLight }}>Can't find what you're looking for?</p>
                <button
                    type="button"
                    onClick={onContactSupport}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
                    style={{ backgroundColor: theme.primary, color: theme.white || '#fff' }}
                >
                    <MessageSquare size={15} /> Contact Support
                </button>
            </div>
        </div>
    );
}

