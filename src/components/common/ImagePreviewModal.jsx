import React, { useState, useEffect } from 'react';
import { Download, Calendar, ExternalLink } from 'lucide-react';
import Modal from './Modal';

export default function ImagePreviewModal({ 
  image, 
  open, 
  onClose, 
  theme,
  onDelete,
  readonly = false 
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) setConfirmDelete(false);
  }, [open]);

  if (!image) return null;

  const handleDownload = async () => {
    try {
      // Create a friendly filename with original extension
      const extension = image.fileName?.split('.').pop() || 'png';
      const friendlyFilename = `${image.title.replace(/[^a-z0-9]/gi, '_')}_${new Date(image.dateAdded).toLocaleDateString('en-US').replace(/\//g, '-')}.${extension}`;
      
      // Use fetch with proper CORS handling
      const response = await fetch(image.url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const blob = await response.blob();
      
      // Create blob URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = friendlyFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 100);
      
    } catch (error) {
      console.error('Failed to download image:', error);
      
      // Fallback: Open in new tab with download header
      try {
        const extension = image.fileName?.split('.').pop() || 'png';
        const friendlyFilename = `${image.title.replace(/[^a-z0-9]/gi, '_')}_${new Date(image.dateAdded).toLocaleDateString('en-US').replace(/\//g, '-')}.${extension}`;
        
        const downloadUrl = new URL(image.url);
        downloadUrl.searchParams.set('response-content-disposition', `attachment; filename="${friendlyFilename}"`);
        
        window.open(downloadUrl.toString(), '_blank');
      } catch (fallbackError) {
        alert('Failed to download image. Please right-click the image and select "Save image as..."');
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={image.title}
      theme={theme}
      maxWidth="max-w-4xl"
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {!readonly && image.source !== 'synced' && onDelete && (
              <>
                <style>{`
                  @keyframes tapConfirmPop {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                  }
                  .image-preview-tap-confirm {
                    animation: tapConfirmPop 0.45s ease-out 2;
                  }
                `}</style>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmDelete) {
                      setConfirmDelete(false);
                      onDelete(image.id);
                      onClose();
                    } else {
                      setConfirmDelete(true);
                    }
                  }}
                  className={`py-2 text-sm font-medium transition-all ${confirmDelete ? 'image-preview-tap-confirm' : ''}`}
                  style={{ color: confirmDelete ? '#8B5335' : '#C67A5C' }}
                >
                  {confirmDelete ? 'Tap again to confirm' : 'Delete'}
                </button>
              </>
            )}
          </div>

          <button
            onClick={handleDownload}
            className="p-2.5 rounded-lg transition-all hover:opacity-80 active:scale-95"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.secondary,
              color: theme.primary,
              border: theme.isDark ? 'none' : `1px solid ${theme.border}`
            }}
            title="Download"
          >
            <Download size={18} />
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Image Preview */}
        <div 
          className="relative rounded-lg overflow-hidden border"
          style={{ 
            borderColor: theme.border,
            backgroundColor: theme.isDark ? '#000000' : '#f9fafb'
          }}
        >
          <img
            src={image.url}
            alt={image.title}
            className="w-full h-auto max-h-[70vh] object-contain mx-auto"
            style={{ display: 'block' }}
          />
        </div>

        {/* Modern Image Details Card */}
        <div 
          className="p-4 rounded-lg border"
          style={{ 
            borderColor: theme.border,
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : theme.cardBackground
          }}
        >
          <div className="space-y-3">
            {/* Title */}
            <div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: theme.text }}>
                {image.title}
              </h3>
              <div className="flex items-center gap-4 text-xs" style={{ color: theme.textLight }}>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>
                    {new Date(image.dateAdded).toLocaleDateString('en-US', { 
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })} at {new Date(image.dateAdded).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {image.notes && (
              <div 
                className="pt-3 border-t"
                style={{ borderColor: theme.border }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: theme.text }}>
                  {image.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Synced Badge */}
        {image.source === 'synced' && (
          <div 
            className="flex items-center gap-2 p-3 rounded-lg border"
            style={{ 
              borderColor: theme.info + '40',
              backgroundColor: theme.info + '10'
            }}
          >
            <ExternalLink size={16} style={{ color: theme.info }} />
            <div>
              <p className="text-sm font-medium" style={{ color: theme.info }}>
                Auto-Synced Documentation
              </p>
              <p className="text-xs" style={{ color: theme.textLight }}>
                This image was automatically synced from your order when marked as delivered.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

