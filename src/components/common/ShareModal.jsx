import React, { useRef, useMemo, useState } from 'react';
import Modal from './Modal';
import { toPng } from 'html-to-image';
import { Image, Copy, Check, Eye, Download, LayoutList, Activity } from 'lucide-react';
import { encodeShareData, SHARE_BASE_PATH } from '../../utils/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Import the new share-specific cards
import SharedProtocolCard from '../share/SharedProtocolCard';
import SharedProgressCard from '../share/SharedProgressCard';
import SharedVendorCard from '../share/SharedVendorCard';

export default function ShareModal({ open, onClose, theme, title, cardProps, shareData, allowProgressMode = false }) {
    const cardRef = useRef(null);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [shareMode, setShareMode] = useState('protocol');

    const getShareUrl = () => {
        const encodedData = encodeShareData(shareData);
        if (!encodedData) return '';
        const type = shareData.type || title.toLowerCase();
        return `${window.location.origin}${SHARE_BASE_PATH}/${type}/share/${encodedData}`;
    };

    const handleShareImage = async () => {
        if (cardRef.current === null) {
            console.error('Card ref is null');
            return;
        }

        const node = cardRef.current;

        try {
            // We need to get the real dimensions of the card to ensure the image is not cropped
            const rect = node.getBoundingClientRect();
            console.log('Card dimensions:', rect.width, 'x', rect.height);

            // Wait a bit for fonts to load on mobile
            await new Promise(resolve => setTimeout(resolve, 500));

            const dataUrl = await toPng(node, { 
                cacheBust: true,
                width: rect.width,
                height: rect.height,
                pixelRatio: 2, // Generate a higher-resolution image
                backgroundColor: '#ffffff', // Ensure white background
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left'
                },
                // Mobile-specific options to handle CSS issues
                skipFonts: false,
                skipAutoScale: true,
                useCORS: true,
                allowTaint: true,
                // Handle font loading issues
                fontEmbedCSS: false,
                // Skip problematic external resources
                filter: (node) => {
                    // Skip external font links that cause issues on mobile
                    if (node.tagName === 'LINK' && node.href && node.href.includes('fonts.googleapis.com')) {
                        return false;
                    }
                    return true;
                }
            });

            console.log('Generated image data URL length:', dataUrl.length);

            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], "shared-card.png", { type: blob.type });

            // Check if Web Share API supports files
            const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] });

            // Use same filename as Save so share sheet shows "Protocol Name Research mmddyy"
            await downloadImage(dataUrl, getSaveFileName());
        } catch (err) {
            console.error('Error generating share image:', err);
            // Try a simpler approach for mobile
            try {
                console.log('Trying simplified image generation...');
                const simpleDataUrl = await toPng(node, { 
                    backgroundColor: '#ffffff',
                    pixelRatio: 1,
                    skipFonts: true,
                    useCORS: false,
                    allowTaint: true
                });
                downloadImage(simpleDataUrl, getSaveFileName());
            } catch (simpleErr) {
                console.error('Simplified image generation also failed:', simpleErr);
                alert('Could not generate image. Please try copying the link instead.');
            }
        }
    };

    const downloadImage = async (dataUrl, preferredFileName) => {
        // Check if we're on mobile/Capacitor
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                        window.Capacitor || 
                        window.location.protocol === 'capacitor:';
        
        if (isMobile && window.Capacitor) {
            console.log('Capacitor detected - using native file sharing');
            
            try {
                // Convert data URL to base64
                const base64Data = dataUrl.split(',')[1];
                const fileName = preferredFileName || `shared-card-${Date.now()}.png`;
                
                // Write file to device storage (Cache for Share flow so we can clean up)
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Cache,
                });
                
                console.log('File written to:', result.uri);
                
                // Share the file using native share
                await Share.share({
                    title: title ? `Check out this ${title}` : 'Shared from The Pep Planner',
                    text: `Shared from The Pep Planner`,
                    url: result.uri,
                    dialogTitle: 'Share Image',
                });
                
                console.log('Successfully shared via native Capacitor share');
                
                // Clean up the file after sharing
                setTimeout(async () => {
                    try {
                        await Filesystem.deleteFile({
                            path: fileName,
                            directory: Directory.Cache,
                        });
                        console.log('Temporary file cleaned up');
                    } catch (cleanupError) {
                        console.log('Could not clean up temporary file:', cleanupError);
                    }
                }, 5000);
                
            } catch (error) {
                console.error('Error with Capacitor native share:', error);
                // Fallback to Web Share API
                await fallbackWebShare(dataUrl);
            }
        } else if (isMobile) {
            console.log('Mobile detected - using Web Share API');
            await fallbackWebShare(dataUrl);
        } else {
            // Desktop: use normal download
            console.log('Desktop detected - using normal download');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'shared-card.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        console.log('Image share/download process completed');
    };

    const fallbackWebShare = async (dataUrl) => {
        try {
            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            
            // Create a file from the blob
            const file = new File([blob], 'shared-card.png', { type: 'image/png' });
            
            // Check if Web Share API supports files
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                console.log('Using Web Share API with file');
                await navigator.share({
                    title: `Check out this ${title}`,
                    text: `Shared from The Pep Planner`,
                    files: [file],
                });
                console.log('Successfully shared via Web Share API');
            } else {
                // Fallback: try to share the image URL
                console.log('Web Share API with files not supported, trying URL share');
                if (navigator.share) {
                    await navigator.share({
                        title: `Check out this ${title}`,
                        text: `Shared from The Pep Planner`,
                        url: dataUrl,
                    });
                    console.log('Successfully shared URL via Web Share API');
                } else {
                    // Last resort: create a temporary blob URL and try to download
                    console.log('Web Share API not available, creating blob URL for download');
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = 'shared-card.png';
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                    console.log('Download triggered via blob URL');
                }
            }
        } catch (error) {
            console.error('Error with fallback Web Share:', error);
            // Final fallback to simple download
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'shared-card.png';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log('Final fallback download completed');
        }
    };

    const copyToClipboard = (text) => {
        if (navigator.clipboard?.writeText) {
            return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        }
        return Promise.resolve(fallbackCopy(text));
    };
    const fallbackCopy = (text) => {
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
        copyToClipboard(url)
            .then(() => {
                setCopied(true);
                requestAnimationFrame(() => {
                    window.dispatchEvent(new CustomEvent('tpp:toast', {
                        detail: { message: 'Link copied to clipboard!', type: 'success' },
                    }));
                });
                setTimeout(() => {
                    setCopied(false);
                    onClose();
                }, 2000);
            })
            .catch((err) => {
                console.error('Copy failed:', err);
                window.dispatchEvent(new CustomEvent('tpp:toast', {
                    detail: { message: 'Could not copy link. Try sharing instead.', type: 'error' },
                }));
            });
    };

    const getSaveFileName = () => {
        const type = shareData?.type || title?.toLowerCase?.() || 'protocol';
        const name = type === 'vendor'
            ? (cardProps?.vendor?.name || 'Vendor')
            : (cardProps?.item?.protocolName || cardProps?.item?.name || 'Protocol');
        const safe = String(name).replace(/[/\\:*?"<>|]/g, '').trim() || 'Research';
        const d = new Date();
        const mmddyy = `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getFullYear()).slice(-2)}`;
        return `${safe} Research ${mmddyy}.png`;
    };

    // Folder name without spaces for better iOS/filesystem compatibility; display name for toasts
    const SAVE_FOLDER = 'PepPlannerResearch';
    const SAVE_FOLDER_DISPLAY = 'Pep Planner Research';

    const handleSaveToDevice = async () => {
        if (cardRef.current === null) return;
        const node = cardRef.current;
        setSaving(true);
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
            const fileName = getSaveFileName();
            const isCapacitor = window.Capacitor?.isNativePlatform?.() ?? !!window.Capacitor;
            if (isCapacitor) {
                try {
                    await Filesystem.mkdir({ path: SAVE_FOLDER, directory: Directory.Documents, recursive: true });
                } catch (e) {
                    if (e?.message && !e.message.includes('exists')) throw e;
                }
                const { uri } = await Filesystem.writeFile({
                    path: `${SAVE_FOLDER}/${fileName}`,
                    data: base64Data,
                    directory: Directory.Documents,
                });
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
                window.dispatchEvent(new CustomEvent('tpp:toast', {
                    detail: { message: `Saved to ${SAVE_FOLDER_DISPLAY}`, type: 'success' },
                }));
                try {
                    await Share.share({
                        title: title ? `Check out this ${title}` : 'Shared from The Pep Planner',
                        text: 'Shared from The Pep Planner',
                        url: uri,
                        dialogTitle: 'Share image',
                    });
                } catch (shareErr) {
                    console.warn('Share sheet failed after save (user cancel or platform):', shareErr);
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
            setSaving(false);
        }
    };

    const ShareCard = useMemo(() => {
        const type = shareData.type || title.toLowerCase();
        if (type === 'protocol') {
            return allowProgressMode && shareMode === 'progress' ? SharedProgressCard : SharedProtocolCard;
        }
        if (type === 'vendor') {
            return SharedVendorCard;
        }
        return () => <div className="text-red-500">Error: Unknown share type</div>;
    }, [title, shareData]);

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Share Research Data"
            theme={theme}
            variant="modern"
            footer={
                <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex w-full gap-1.5">
                        <button 
                            onClick={handleShareImage} 
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]" 
                            style={{ 
                                backgroundColor: theme.primary, 
                                color: theme.textOnPrimary || '#ffffff',
                                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 6px ${theme.primary}50`,
                            }}
                        >
                            <Image size={14} />
                            Share
                        </button>
                        <button 
                            onClick={handleSaveToDevice} 
                            disabled={saving || saved}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60" 
                            style={{ 
                                borderColor: theme.primary, 
                                backgroundColor: `${theme.primary}12`, 
                                color: theme.primary,
                                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 ${theme.primary}25`,
                            }}
                        >
                            <Download size={14} />
                            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
                        </button>
                    </div>
                    <button 
                        onClick={handleCopyLink} 
                        disabled={copied} 
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border-2 transition-all hover:scale-[1.02] active:scale-[0.98]" 
                        style={{ 
                            borderColor: copied ? theme.primary : theme.border, 
                            backgroundColor: copied ? `${theme.primary}15` : 'transparent', 
                            color: copied ? theme.primary : theme.text,
                            boxShadow: copied
                                ? `inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 ${theme.primary}20`
                                : 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.05)',
                        }}
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Header Section */}
                <div className="pt-2">
                    <div className="flex items-center gap-4 mb-4">
                        <Eye size={32} style={{ color: theme.primary }} />
                        <div className="flex flex-col gap-0.5 flex-1">
                            <h4 className="text-base font-semibold" style={{ color: theme.text }}>Preview</h4>
                            <div className="flex items-center gap-2 ml-1">
                                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                    Shareable Content
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Protocol / Progress toggle — only for active protocols */}
                    {allowProgressMode && shareData.type === 'protocol' && (
                        <div
                            className="flex gap-1 p-1 rounded-xl mb-1"
                            style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
                        >
                            {[
                                { id: 'protocol', label: 'Protocol', Icon: LayoutList },
                                { id: 'progress', label: 'My Progress', Icon: Activity },
                            ].map(({ id, label, Icon }) => {
                                const active = shareMode === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => setShareMode(id)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all"
                                        style={{
                                            backgroundColor: active ? (theme.isDark ? 'rgba(255,255,255,0.12)' : '#ffffff') : 'transparent',
                                            color: active ? theme.primary : theme.textLight,
                                            boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                                        }}
                                    >
                                        <Icon size={13} />
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Preview Card */}
                <div className="flex justify-center w-full overflow-x-auto pb-2">
                    <div 
                        ref={cardRef} 
                        className="bg-white rounded-2xl shadow-lg inline-block max-w-full" 
                        style={{ 
                            fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            padding: '0'
                        }}
                    >
                        <ShareCard {...cardProps} isPublicView={true} theme={theme} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}
