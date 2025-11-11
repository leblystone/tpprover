import React, { useState } from 'react';
import { Plus, X, Link, Image, FileText, Camera, ExternalLink, Loader } from 'lucide-react';
import { uploadImageToStorage, deleteImageFromStorage } from '../../utils/storageUtils';
import { useAppContext } from '../../context/AppContext';
import ImagePreviewModal from './ImagePreviewModal';

export default function DocumentationUpload({ 
  documentation = [], 
  onChange, 
  theme, 
  title = "Documentation",
  placeholder = "Add documentation...",
  allowImages = true,
  allowLinks = true,
  readonly = false 
}) {
  const { user } = useAppContext();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ type: 'link', title: '', url: '', notes: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Ensure controlled inputs always have defined values
  const safeNewItem = {
    type: newItem.type || 'link',
    title: newItem.title || '',
    url: newItem.url || '',
    notes: newItem.notes || '',
    selectedFile: newItem.selectedFile || null
  };

  const handleAddItem = () => {
    if (!newItem.title.trim()) return;
    
    const item = {
      id: Date.now().toString(),
      type: newItem.type,
      title: newItem.title.trim(),
      url: newItem.url.trim(),
      notes: newItem.notes.trim(),
      dateAdded: new Date().toISOString(),
      source: 'manual' // vs 'synced' for auto-synced items
    };

    onChange([...documentation, item]);
    setNewItem({ type: 'link', title: '', url: '', notes: '' });
    setShowAddForm(false);
  };

  const handleRemoveItem = async (id) => {
    const item = documentation.find(doc => doc.id === id);
    
    // If it's a Firebase Storage image, delete it from storage
    if (item && item.type === 'image' && item.storagePath) {
      try {
        await deleteImageFromStorage(item.storagePath);
      } catch (error) {
        console.error('Failed to delete image from storage:', error);
        // Continue anyway - we'll remove it from the list even if storage deletion fails
      }
    }
    
    onChange(documentation.filter(doc => doc.id !== id));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      e.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      e.target.value = '';
      return;
    }

    // Store the file temporarily for upload later
    setNewItem({ 
      ...safeNewItem, 
      selectedFile: file,
      title: safeNewItem.title || file.name.replace(/\.[^/.]+$/, '') // Auto-fill title from filename
    });
  };

  const handleImageUpload = async () => {
    if (!safeNewItem.selectedFile) return;

    // Check if user is authenticated
    if (!user) {
      alert('You must be logged in to upload images');
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Firebase Storage
      const uploadResult = await uploadImageToStorage(safeNewItem.selectedFile, user.uid, 'stockpile');
      
      const item = {
        id: Date.now().toString(),
        type: 'image',
        title: safeNewItem.title.trim(),
        url: uploadResult.url, // Firebase Storage URL
        storagePath: uploadResult.path, // For deletion later
        notes: safeNewItem.notes.trim(),
        dateAdded: new Date().toISOString(),
        source: 'manual',
        fileSize: uploadResult.fileSize,
        fileName: uploadResult.fileName
      };

      onChange([...documentation, item]);
      setNewItem({ type: 'link', title: '', url: '', notes: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert(`Failed to upload image: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const renderDocumentationItem = (item, index) => {
    const isImage = item.type === 'image';
    const isLink = item.type === 'link';
    const isSynced = item.source === 'synced';

    return (
      <div 
        key={item.id} 
        className="flex items-start gap-3 p-3 rounded-lg border"
        style={{ 
          backgroundColor: isSynced ? theme.info + '10' : theme.secondary,
          borderColor: isSynced ? theme.info + '40' : theme.border
        }}
      >
        <div className="flex-shrink-0 mt-1">
          {isImage ? (
            <Image size={16} style={{ color: theme.primary }} />
          ) : (
            <Link size={16} style={{ color: theme.primary }} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-sm truncate" style={{ color: theme.text }}>
              {item.title}
            </h4>
            {isSynced && (
              <span className="text-xs px-2 py-0.5 rounded" 
                    style={{ backgroundColor: theme.info + '20', color: theme.info }}>
                From Order
              </span>
            )}
          </div>
          
          {item.notes && (
            <p className="text-xs mb-2" style={{ color: theme.textLight }}>
              {item.notes}
            </p>
          )}
          
          {isImage ? (
            <div className="mt-2">
              <img 
                src={item.url} 
                alt={item.title}
                className="max-w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80 hover:scale-105 transition-all"
                onClick={() => setPreviewImage(item)}
                style={{ borderColor: theme.border }}
              />
              {item.fileSize && (
                <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                  {(item.fileSize / 1024).toFixed(0)}KB • Click to preview
                </p>
              )}
            </div>
          ) : (
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm hover:underline"
              style={{ color: theme.primary }}
            >
              <ExternalLink size={12} />
              Open Link
            </a>
          )}
          
          <p className="text-xs mt-2" style={{ color: theme.textLight }}>
            Added {new Date(item.dateAdded).toLocaleDateString()}
          </p>
        </div>
        
        {!readonly && !isSynced && (
          <button
            onClick={() => handleRemoveItem(item.id)}
            className="flex-shrink-0 p-1 rounded hover:bg-red-100 text-red-600"
            title="Remove"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: theme.text }}>{title}</h3>
          {!readonly && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 px-2 py-1 text-sm rounded-md transition-colors"
              style={{ backgroundColor: theme.primary + '20', color: theme.primary }}
            >
              <Plus size={14} />
              Add
            </button>
          )}
        </div>

      {/* Documentation Items */}
      <div className="space-y-2">
        {documentation.map((item, index) => renderDocumentationItem(item, index))}
        
        {documentation.length === 0 && !showAddForm && (
          <div className="text-center py-4 border-2 border-dashed rounded-lg" 
               style={{ borderColor: theme.border }}>
            <FileText size={24} className="mx-auto mb-2" style={{ color: theme.textLight }} />
            <p className="text-sm" style={{ color: theme.textLight }}>
              {placeholder}
            </p>
          </div>
        )}
      </div>

      {/* Add Form - Modern Compact Design */}
      {showAddForm && (
        <div 
          className="p-3 rounded-lg border-2 border-dashed" 
          style={{ 
            backgroundColor: theme.isDark ? '#111827' : theme.cardBackground, 
            borderColor: theme.primary + '40' 
          }}
        >
          <div className="space-y-2.5">
            {/* Type Selection - Compact Pills */}
            <div className="flex gap-1.5">
              {allowLinks && (
                <button
                  onClick={() => setNewItem({ type: 'link', title: '', url: '', notes: '' })}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    safeNewItem.type === 'link' ? 'shadow-sm' : ''
                  }`}
                  style={{
                    backgroundColor: safeNewItem.type === 'link' ? theme.primary : theme.isDark ? '#1f2937' : theme.secondary,
                    color: safeNewItem.type === 'link' ? theme.textOnPrimary : theme.text
                  }}
                >
                  <Link size={14} />
                  Link
                </button>
              )}
              {allowImages && (
                <button
                  onClick={() => setNewItem({ type: 'image', title: '', url: '', notes: '' })}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    safeNewItem.type === 'image' ? 'shadow-sm' : ''
                  }`}
                  style={{
                    backgroundColor: safeNewItem.type === 'image' ? theme.primary : theme.isDark ? '#1f2937' : theme.secondary,
                    color: safeNewItem.type === 'image' ? theme.textOnPrimary : theme.text
                  }}
                >
                  <Camera size={14} />
                  Photo
                </button>
              )}
            </div>

            {/* Title Input - Compact */}
            <input
              type="text"
              value={safeNewItem.title}
              onChange={(e) => setNewItem({ ...safeNewItem, title: e.target.value })}
              placeholder={safeNewItem.type === 'image' ? '📸 Photo title...' : '🔗 Link title...'}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-opacity-50 transition-all"
              style={{ 
                borderColor: theme.border,
                backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                color: theme.text
              }}
            />

            {/* URL or File Upload - Modern Design */}
            {safeNewItem.type === 'link' ? (
              <input
                type="url"
                value={safeNewItem.url}
                onChange={(e) => setNewItem({ ...safeNewItem, url: e.target.value })}
                placeholder="https://example.com/document.pdf"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-opacity-50 transition-all"
                style={{ 
                  borderColor: theme.border,
                  backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                  color: theme.text
                }}
              />
            ) : (
              <div>
                {/* Custom File Upload Button */}
                <label
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                    safeNewItem.selectedFile ? 'border-solid' : ''
                  } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-solid'}`}
                  style={{
                    borderColor: safeNewItem.selectedFile ? theme.primary : theme.border,
                    backgroundColor: theme.isDark ? '#1f2937' : theme.secondary
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="hidden"
                  />
                  {safeNewItem.selectedFile ? (
                    <>
                      <Image size={16} style={{ color: theme.primary }} />
                      <span className="text-sm font-medium" style={{ color: theme.primary }}>
                        {safeNewItem.selectedFile.name} ({(safeNewItem.selectedFile.size / 1024).toFixed(0)}KB)
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setNewItem({ ...safeNewItem, selectedFile: null });
                        }}
                        className="ml-auto p-1 rounded hover:bg-red-100"
                      >
                        <X size={14} style={{ color: '#ef4444' }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <Camera size={16} style={{ color: theme.textLight }} />
                      <span className="text-sm" style={{ color: theme.textLight }}>
                        Choose image (max 5MB)
                      </span>
                    </>
                  )}
                </label>
              </div>
            )}

            {/* Notes - Compact Textarea */}
            <textarea
              value={safeNewItem.notes}
              onChange={(e) => setNewItem({ ...safeNewItem, notes: e.target.value })}
              placeholder="📝 Optional notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm border rounded-lg resize-none focus:ring-2 focus:ring-opacity-50 transition-all"
              style={{ 
                borderColor: theme.border,
                backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                color: theme.text
              }}
            />

            {/* Actions - Compact Buttons */}
            {isUploading ? (
              <div className="flex items-center justify-center gap-2 py-2" style={{ color: theme.primary }}>
                <Loader size={16} className="animate-spin" />
                <span className="text-sm font-medium">Uploading...</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={safeNewItem.type === 'image' ? handleImageUpload : handleAddItem}
                  disabled={
                    !safeNewItem.title.trim() || 
                    (safeNewItem.type === 'link' && !safeNewItem.url.trim()) ||
                    (safeNewItem.type === 'image' && !safeNewItem.selectedFile)
                  }
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  style={{ 
                    backgroundColor: theme.primary, 
                    color: theme.textOnPrimary 
                  }}
                >
                  <Plus size={14} />
                  Add {safeNewItem.type === 'image' ? 'Photo' : 'Link'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewItem({ type: 'link', title: '', url: '', notes: '' });
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                  style={{ 
                    backgroundColor: theme.isDark ? '#1f2937' : theme.secondary, 
                    color: theme.text 
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        image={previewImage}
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        onDelete={readonly ? null : handleRemoveItem}
        theme={theme}
        readonly={readonly}
      />
    </>
  );
}

