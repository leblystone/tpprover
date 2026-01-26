import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Send, Microscope, CheckCircle, AlertCircle, Bug, Lightbulb, ArrowLeft, Clock, MessageSquare, Image as ImageIcon, Camera } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { submitFeedback, createSupportTicket, getUserTickets } from '../../services/firebase';
import { uploadImageToStorage } from '../../utils/storageUtils';

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

    // Auto-fill email from logged in user
    useEffect(() => {
        if (user?.email && !formData.email) {
            setFormData(prev => ({ ...prev, email: user.email }));
        }
    }, [user, open]);

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
        setTicketType(null); // Reset ticket type selection
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.message.trim()) return;

        setIsSubmitting(true);
        setSubmitStatus(null);
        
        try {
            console.log('📤 Creating support ticket...', {
                userEmail: formData.email || user?.email,
                userId: user?.uid,
                message: formData.message.trim(),
                imageCount: selectedImages.length
            });

            // Upload images first if any
            const imageUrls = [];
            const imageStoragePaths = [];
            if (selectedImages.length > 0 && user?.uid) {
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

            // Check if this is a suggestion (feedback) or a support/bug ticket
            if (ticketType === 'suggestion') {
                // Submit as feedback (goes to Ghosty acknowledgment)
                await submitFeedback({
                    type: 'suggestion',
                    message: formData.message.trim(),
                    userEmail: formData.email || user?.email || 'anonymous',
                    userId: user?.uid || null,
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                });
                
                console.log('✅ Suggestion submitted');
            } else {
                // Create a support ticket (support or bug - goes to full Ghosty handling)
                const ticketId = await createSupportTicket({
                    userId: user?.uid || null,
                    userEmail: formData.email || user?.email,
                    userName: user?.displayName || user?.email?.split('@')[0] || 'App User',
                    type: ticketType, // 'support' or 'bug'
                    subject: ticketType === 'bug' ? 'Bug Report' : 'Support Request',
                    message: formData.message.trim(),
                    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
                    imageStoragePaths: imageStoragePaths.length > 0 ? imageStoragePaths : undefined,
                    metadata: {
                        userAgent: navigator.userAgent,
                        url: window.location.href,
                        userEmail: formData.email || user?.email,
                        userId: user?.uid || null
                    }
                });
                
                console.log('✅ Support ticket created:', ticketId);
                
                // Reload user tickets to show the new one
                if (user?.email) {
                    await loadUserTickets();
                }
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 backdrop-blur-md bg-black/30"
                onClick={handleClose}
            />
            
            {/* Modal */}
            <div className="relative rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col"
                style={{ backgroundColor: theme.cardBackground }}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border }}>
                    <div className="flex items-center gap-3">
                        {showBackButton && onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 rounded-full transition-colors hover:opacity-70"
                                style={{ backgroundColor: theme.background }}
                                title="Back to Beta Info"
                            >
                                <ArrowLeft className="w-5 h-5" style={{ color: theme.primary }} />
                            </button>
                        )}
                        <div className="p-2 rounded-full" style={{ backgroundColor: theme.background }}>
                            <Microscope className="w-5 h-5" style={{ color: theme.primary }} />
                        </div>
                        <h2 className="text-xl font-bold" style={{ color: theme.primaryDark }}>Support</h2>
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
                <div className="flex-1 overflow-y-auto p-6">
                    {!ticketType ? (
                        /* Ticket Type Selection */
                        <div className="space-y-4">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
                                    How can we help?
                                </h3>
                                <p className="text-sm" style={{ color: theme.textLight }}>
                                    Choose the type of support you need
                                </p>
                            </div>

                            <button
                                onClick={() => setTicketType('support')}
                                className="w-full p-6 rounded-lg border-2 transition-all hover:shadow-md"
                                style={{
                                    borderColor: theme.border,
                                    backgroundColor: theme.background
                                }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-full" style={{ backgroundColor: theme.primaryLight }}>
                                        <MessageSquare className="w-6 h-6" style={{ color: theme.primary }} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h4 className="font-semibold mb-1" style={{ color: theme.text }}>
                                            Support Ticket
                                        </h4>
                                        <p className="text-sm" style={{ color: theme.textLight }}>
                                            Account questions, subscription help, general inquiries
                                        </p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setTicketType('bug')}
                                className="w-full p-6 rounded-lg border-2 transition-all hover:shadow-md"
                                style={{
                                    borderColor: theme.border,
                                    backgroundColor: theme.background
                                }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-full" style={{ backgroundColor: theme.errorLight || '#FEE2E2' }}>
                                        <Bug className="w-6 h-6" style={{ color: theme.error }} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h4 className="font-semibold mb-1" style={{ color: theme.text }}>
                                            Bug Report
                                        </h4>
                                        <p className="text-sm" style={{ color: theme.textLight }}>
                                            App crashes, features not working, technical issues
                                        </p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setTicketType('suggestion')}
                                className="w-full p-6 rounded-lg border-2 transition-all hover:shadow-md"
                                style={{
                                    borderColor: theme.border,
                                    backgroundColor: theme.background
                                }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-full" style={{ backgroundColor: theme.warning + '20' }}>
                                        <Lightbulb className="w-6 h-6" style={{ color: theme.warning }} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h4 className="font-semibold mb-1" style={{ color: theme.text }}>
                                            Suggestions
                                        </h4>
                                        <p className="text-sm" style={{ color: theme.textLight }}>
                                            Feature ideas, improvements, feedback
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>
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
                            {/* Back button and title */}
                            <div className="flex items-center gap-3 mb-4">
                                <button
                                    onClick={() => setTicketType(null)}
                                    className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                                    style={{ backgroundColor: theme.background }}
                                    type="button"
                                >
                                    <ArrowLeft className="w-5 h-5" style={{ color: theme.primary }} />
                                </button>
                                <div>
                                    <h3 className="font-semibold" style={{ color: theme.text }}>
                                        {ticketType === 'bug' ? '🐛 Report a Bug' : ticketType === 'suggestion' ? '💡 Share Your Idea' : '💬 Support Request'}
                                    </h3>
                                    <p className="text-xs" style={{ color: theme.textLight }}>
                                        {ticketType === 'bug' ? 'Help us fix technical issues' : ticketType === 'suggestion' ? 'Tell us what would make the app better' : 'We\'re here to help'}
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                                        style={{
                                            borderColor: theme.border,
                                            backgroundColor: theme.isDark ? '#0f172a' : theme.white,
                                            color: theme.text
                                        }}
                                        placeholder="your@email.com"
                                    />
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
                                            backgroundColor: theme.isDark ? '#0f172a' : theme.white,
                                            color: theme.text
                                        }}
                                        placeholder={ticketType === 'suggestion' ? "I'd love to see..." : "Describe your question or issue..."}
                                    />
                                </div>

                                {/* Image Upload Section - Only for Support and Bug Reports */}
                                {ticketType !== 'suggestion' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                                            Attach Images (Optional)
                                        </label>
                                        <div className="space-y-2">
                                            <label
                                                className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:opacity-80"
                                                style={{
                                                    borderColor: theme.border,
                                                    backgroundColor: theme.isDark ? '#0f172a' : theme.white
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

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
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

