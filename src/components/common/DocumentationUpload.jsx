import React, { useState } from 'react';
import { Plus, X, Link, Image, FileText, Camera, ExternalLink } from 'lucide-react';

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ type: 'link', title: '', url: '', notes: '' });

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

  const handleRemoveItem = (id) => {
    onChange(documentation.filter(item => item.id !== id));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const item = {
        id: Date.now().toString(),
        type: 'image',
        title: newItem.title.trim() || file.name,
        url: event.target.result, // Base64 data URL
        notes: newItem.notes.trim(),
        dateAdded: new Date().toISOString(),
        source: 'manual',
        fileSize: file.size,
        fileName: file.name
      };

      onChange([...documentation, item]);
      setNewItem({ type: 'link', title: '', url: '', notes: '' });
      setShowAddForm(false);
    };

    reader.readAsDataURL(file);
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
                className="max-w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                onClick={() => window.open(item.url, '_blank')}
                style={{ borderColor: theme.border }}
              />
              {item.fileSize && (
                <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                  {(item.fileSize / 1024).toFixed(0)}KB
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

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
          <div className="space-y-3">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Type
              </label>
              <div className="flex gap-2">
                {allowLinks && (
                  <button
                    onClick={() => setNewItem({ ...newItem, type: 'link' })}
                    className={`px-3 py-2 text-sm rounded-md transition-colors ${
                      newItem.type === 'link' ? 'text-white' : 'hover:bg-gray-100'
                    }`}
                    style={{
                      backgroundColor: newItem.type === 'link' ? theme.primary : 'transparent',
                      color: newItem.type === 'link' ? theme.textOnPrimary : theme.text
                    }}
                  >
                    <Link size={14} className="inline mr-1" />
                    Link
                  </button>
                )}
                {allowImages && (
                  <button
                    onClick={() => setNewItem({ ...newItem, type: 'image' })}
                    className={`px-3 py-2 text-sm rounded-md transition-colors ${
                      newItem.type === 'image' ? 'text-white' : 'hover:bg-gray-100'
                    }`}
                    style={{
                      backgroundColor: newItem.type === 'image' ? theme.primary : 'transparent',
                      color: newItem.type === 'image' ? theme.textOnPrimary : theme.text
                    }}
                  >
                    <Camera size={14} className="inline mr-1" />
                    Photo
                  </button>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                Title
              </label>
              <input
                type="text"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="e.g., COA Certificate, Product Photo"
                className="w-full px-3 py-2 border rounded-md"
                style={{ borderColor: theme.border }}
              />
            </div>

            {/* URL or File Upload */}
            {newItem.type === 'link' ? (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                  URL
                </label>
                <input
                  type="url"
                  value={newItem.url}
                  onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                  placeholder="https://example.com/coa.pdf"
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ borderColor: theme.border }}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                  Image File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ borderColor: theme.border }}
                />
                <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                  Max 2MB. Supported: JPG, PNG, GIF, WebP
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                Notes (Optional)
              </label>
              <textarea
                value={newItem.notes}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                placeholder="Additional notes about this documentation..."
                rows={2}
                className="w-full px-3 py-2 border rounded-md resize-none"
                style={{ borderColor: theme.border }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={newItem.type === 'image' ? undefined : handleAddItem}
                disabled={!newItem.title.trim() || (newItem.type === 'link' && !newItem.url.trim())}
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: theme.primary, 
                  color: theme.textOnPrimary 
                }}
              >
                {newItem.type === 'image' ? 'Select Image' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewItem({ type: 'link', title: '', url: '', notes: '' });
                }}
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                style={{ backgroundColor: theme.secondary, color: theme.text }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

