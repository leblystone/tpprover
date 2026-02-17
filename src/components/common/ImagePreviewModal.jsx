import React from 'react';
import { Download, Calendar, FileText, Trash2 } from 'lucide-react';
import Modal from './Modal';

export default function ImagePreviewModal({ 
  image, 
  open, 
  onClose, 
  theme,
  onDelete,
  readonly = false 
}) {
  if (!image) return null;

  // Modern button gradients matching other modals
  const getPrimaryActionGradient = () => {
    return `linear-gradient(135deg, ${theme?.primary} 0%, ${theme?.primaryDark || theme?.primary} 100%)`;
  };
  
  const terracottaGradient = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
  const terracottaHoverGradient = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
  const primaryActionDefaultShadow = theme?.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';

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

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
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
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this image?')) {
                    onDelete(image.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
                style={{
                  background: terracottaGradient,
                  color: '#ffffff',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = terracottaHoverGradient;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = theme.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = terracottaGradient;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.secondary,
                color: theme.primary,
                border: theme.isDark ? 'none' : `1px solid ${theme.border}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.12)' : theme.primary + '15';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.08)' : theme.secondary;
              }}
            >
              <Download size={16} />
              Download
            </button>
            
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
              style={{
                background: getPrimaryActionGradient(),
                color: theme.textOnPrimary || '#ffffff',
                border: 'none',
                boxShadow: primaryActionDefaultShadow
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = theme.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = primaryActionDefaultShadow;
              }}
            >
              Close
            </button>
          </div>
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
                <div className="flex items-center gap-1.5">
                  <FileText size={14} />
                  <span>{formatFileSize(image.fileSize)}</span>
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

