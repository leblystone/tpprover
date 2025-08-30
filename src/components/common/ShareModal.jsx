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
            return;
        }

        const node = cardRef.current;

        try {
            // We need to get the real dimensions of the card to ensure the image is not cropped
            const rect = node.getBoundingClientRect();

            const dataUrl = await toPng(node, { 
                cacheBust: true,
                width: rect.width,
                height: rect.height,
                pixelRatio: 2 // Generate a higher-resolution image
            });

            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], "shared-card.png", { type: blob.type });

            if (navigator.share) {
                await navigator.share({
                    title: `Check out this ${title}`,
                    text: `Shared from TPPRover`,
                    files: [file],
                });
            } else {
                // Fallback for browsers that don't support navigator.share with files
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = 'shared-card.png';
                link.click();
            }
        } catch (err) {
            console.error('Oops, something went wrong!', err);
            alert('Could not generate image. Please try copying the link instead.');
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
            title={`Share ${title}`}
            theme={theme}
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
            <div ref={cardRef} className="bg-white p-2 inline-block">
                <ShareCard {...cardProps} isPublicView={true} />
            </div>
        </Modal>
    );
}
