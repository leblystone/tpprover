import React, { useRef, useMemo, useState } from 'react';
import Modal from './Modal';
import { toPng } from 'html-to-image';
import { Image, Copy, Check } from 'lucide-react';
import { encodeShareData } from '../../utils/share';

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

            if (navigator.share && canShareFiles) {
                try {
                    await navigator.share({
                        title: `Check out this ${title}`,
                        text: `Shared from The Pep Planner`,
                        files: [file],
                    });
                    console.log('Successfully shared via Web Share API');
                } catch (shareErr) {
                    // User cancelled or sharing failed, fall back to download
                    console.log('Share cancelled or failed, downloading instead', shareErr);
                    downloadImage(dataUrl);
                }
            } else {
                // Fallback for browsers that don't support navigator.share with files
                console.log('Web Share API not available, downloading instead');
                downloadImage(dataUrl);
            }
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

    const downloadImage = (dataUrl) => {
        // Check if we're on mobile/Capacitor
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                        window.Capacitor || 
                        window.location.protocol === 'capacitor:';
        
        if (isMobile) {
            // For mobile, open the image in a new tab/window so user can save it
            console.log('Mobile detected - opening image in new tab for download');
            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>Shared Card - The Pep Planner</title>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                                body { 
                                    margin: 0; 
                                    padding: 20px; 
                                    background: #f5f5f5; 
                                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    min-height: 100vh;
                                }
                                .container {
                                    background: white;
                                    border-radius: 12px;
                                    padding: 20px;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                                    max-width: 400px;
                                    width: 100%;
                                }
                                img { 
                                    max-width: 100%; 
                                    height: auto; 
                                    border-radius: 8px;
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                }
                                .instructions {
                                    margin-top: 20px;
                                    text-align: center;
                                    color: #666;
                                    font-size: 14px;
                                    line-height: 1.5;
                                }
                                .button {
                                    background: #4A7C70;
                                    color: white;
                                    border: none;
                                    padding: 12px 24px;
                                    border-radius: 8px;
                                    font-size: 16px;
                                    font-weight: 600;
                                    margin-top: 15px;
                                    cursor: pointer;
                                    width: 100%;
                                }
                                .button:hover {
                                    background: #3A6B5F;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <img src="${dataUrl}" alt="Shared Card from The Pep Planner" />
                                <div class="instructions">
                                    <p><strong>Long press the image above</strong> and select "Save to Photos" or "Download" to save this shared card to your device.</p>
                                    <button class="button" onclick="window.close()">Close</button>
                                </div>
                            </div>
                        </body>
                    </html>
                `);
                newWindow.document.close();
            } else {
                // Fallback: try to trigger download anyway
                console.log('Could not open new window, trying direct download');
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = 'shared-card.png';
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
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
        console.log('Image download process completed');
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
            title={`Share ${title}`}
            theme={theme}
            variant="modern"
            footer={
                <div className="flex w-full gap-2">
                    <button onClick={handleShareImage} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-all" style={{ backgroundColor: theme.primary, color: theme.white }}>
                        <Image size={16} />
                        Share as Image
                    </button>
                    <button onClick={handleCopyLink} disabled={copied} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold border transition-all" style={{ borderColor: theme.border, backgroundColor: copied ? theme.primary : 'transparent', color: copied ? theme.white : theme.text }}>
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-center mb-4" style={{ color: theme.textLight }}>
                Here is a preview of what will be shared.
            </p>
            <div className="flex justify-center w-full overflow-x-auto">
                <div ref={cardRef} className="bg-white p-2 inline-block max-w-full" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    <ShareCard {...cardProps} isPublicView={true} theme={theme} />
                </div>
            </div>
        </Modal>
    );
}
