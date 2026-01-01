import React, { useRef, useMemo, useState } from 'react';
import Modal from './Modal';
import { toPng } from 'html-to-image';
import { Image, Copy, Check, Eye } from 'lucide-react';
import { encodeShareData } from '../../utils/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Import the new share-specific cards
import SharedProtocolCard from '../share/SharedProtocolCard';
import SharedVendorCard from '../share/SharedVendorCard';

export default function ShareModal({ open, onClose, theme, title, cardProps, shareData }) {
    const cardRef = useRef(null);
    const [copied, setCopied] = useState(false);

    const getShareUrl = () => {
        const encodedData = encodeShareData(shareData);
        if (!encodedData) return '';
        const type = shareData.type || title.toLowerCase();
        return `${window.location.origin}/rover/${type}/share/${encodedData}`;
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

            // Always use the new downloadImage function which handles mobile sharing properly
            await downloadImage(dataUrl);
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
                downloadImage(simpleDataUrl);
            } catch (simpleErr) {
                console.error('Simplified image generation also failed:', simpleErr);
                alert('Could not generate image. Please try copying the link instead.');
            }
        }
    };

    const downloadImage = async (dataUrl) => {
        // Check if we're on mobile/Capacitor
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                        window.Capacitor || 
                        window.location.protocol === 'capacitor:';
        
        if (isMobile && window.Capacitor) {
            console.log('Capacitor detected - using native file sharing');
            
            try {
                // Convert data URL to base64
                const base64Data = dataUrl.split(',')[1];
                
                // Write file to device storage
                const fileName = `shared-card-${Date.now()}.png`;
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Cache,
                });
                
                console.log('File written to:', result.uri);
                
                // Share the file using native share
                await Share.share({
                    title: `Check out this ${title}`,
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

    const handleCopyLink = () => {
        const url = getShareUrl();
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                onClose();
            }, 2000);
        });
    };

    const ShareCard = useMemo(() => {
        const type = shareData.type || title.toLowerCase();
        if (type === 'protocol') {
            return SharedProtocolCard;
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
                <div className="flex w-full gap-3">
                    <button 
                        onClick={handleShareImage} 
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl" 
                        style={{ 
                            backgroundColor: theme.primary, 
                            color: theme.textOnPrimary || '#ffffff'
                        }}
                    >
                        <Image size={18} />
                        Share Image
                    </button>
                    <button 
                        onClick={handleCopyLink} 
                        disabled={copied} 
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border-2 transition-all hover:scale-[1.02] active:scale-[0.98]" 
                        style={{ 
                            borderColor: copied ? theme.primary : theme.border, 
                            backgroundColor: copied ? `${theme.primary}15` : 'transparent', 
                            color: copied ? theme.primary : theme.text 
                        }}
                    >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
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
                            <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Preview</h4>
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
