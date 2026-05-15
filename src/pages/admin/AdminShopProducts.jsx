import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Save, X, Loader, Eye, EyeOff,
  Upload, Image as ImageIcon, GripVertical, BookOpen, Package, Download,
} from 'lucide-react';
import {
  fetchAllShopProducts, saveShopProduct, deleteShopProduct,
  toggleProductActive, reorderProducts, PRODUCT_CATEGORIES,
} from '../../config/plannerProducts';
import { uploadImageToStorage, deleteImageFromStorage } from '../../utils/storageUtils';

const CATEGORY_OPTIONS = Object.entries(PRODUCT_CATEGORIES).map(([value, label]) => ({ value, label }));
const SIZE_OPTIONS = [
  { value: '', label: 'None' },
  { value: '7x10', label: '7×10' },
  { value: '5x7', label: '5×7' },
];

const CATEGORY_ICONS = { planner: BookOpen, accessory: Package, digital: Download };

const EMPTY_FORM = {
  name: '',
  category: 'planner',
  size: '',
  price: '',
  stripePriceId: '',
  description: '',
  image: null,
  requiresShipping: true,
  active: true,
  sortOrder: 0,
};

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { type, message } }));
}

export default function AdminShopProducts() {
  const { theme } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const fileInputRef = useRef(null);
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchAllShopProducts();
      setProducts(data);
    } catch (err) {
      console.error('Error loading products:', err);
      toast('error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setImagePreview(null);
    setShowForm(true);
  };

  const openEditForm = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name || '',
      category: product.category || 'planner',
      size: product.size || '',
      price: product.price ?? '',
      stripePriceId: product.stripePriceId || '',
      description: product.description || '',
      image: typeof product.image === 'object' ? product.image : (product.image ? { url: product.image } : null),
      requiresShipping: product.requiresShipping ?? true,
      active: product.active ?? true,
      sortOrder: product.sortOrder ?? 0,
    });
    setImagePreview(typeof product.image === 'string' ? product.image : product.image?.url || null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setImagePreview(null);
  };

  const handleCategoryChange = (cat) => {
    setFormData((prev) => ({
      ...prev,
      category: cat,
      requiresShipping: cat !== 'digital',
      size: cat === 'planner' ? prev.size : '',
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('error', 'File must be an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('error', 'Image must be under 5MB'); return; }

    setUploadingImage(true);
    try {
      const result = await uploadImageToStorage(file, 'admin', 'shop-products');
      setFormData((prev) => ({ ...prev, image: { url: result.url, path: result.path } }));
      setImagePreview(result.url);
      toast('success', 'Image uploaded');
    } catch (err) {
      console.error('Image upload error:', err);
      toast('error', 'Image upload failed');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (formData.image?.path) {
      try { await deleteImageFromStorage(formData.image.path); } catch {}
    }
    setFormData((prev) => ({ ...prev, image: null }));
    setImagePreview(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast('warning', 'Product name is required'); return; }
    if (!formData.stripePriceId.trim()) { toast('warning', 'Stripe Price ID is required'); return; }
    if (!formData.price || Number(formData.price) <= 0) { toast('warning', 'Price must be greater than 0'); return; }

    setIsSaving(true);
    try {
      const data = {
        ...formData,
        price: Number(formData.price),
        sortOrder: editingId ? formData.sortOrder : products.length,
      };
      await saveShopProduct(data, editingId);
      toast('success', editingId ? 'Product updated!' : 'Product created!');
      closeForm();
      await loadProducts();
    } catch (err) {
      console.error('Save error:', err);
      toast('error', 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      if (product.image?.path) {
        try { await deleteImageFromStorage(product.image.path); } catch {}
      }
      await deleteShopProduct(product.id);
      toast('success', 'Product deleted');
      await loadProducts();
    } catch (err) {
      toast('error', 'Failed to delete product');
    }
  };

  const handleToggleActive = async (product) => {
    try {
      await toggleProductActive(product.id, product.active);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p))
      );
      toast('success', product.active ? 'Product hidden from shop' : 'Product visible in shop');
    } catch (err) {
      toast('error', 'Failed to update product');
    }
  };

  const handleDragStart = (index) => { dragItem.current = index; };
  const handleDragEnter = (index) => { dragOver.current = index; };
  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) return;
    const reordered = [...products];
    const [moved] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOver.current, 0, moved);
    setProducts(reordered);
    dragItem.current = null;
    dragOver.current = null;
    try {
      await reorderProducts(reordered.map((p) => p.id));
      toast('success', 'Order saved');
    } catch { toast('error', 'Failed to save order'); }
  };

  const filtered = filterCategory === 'all' ? products : products.filter((p) => p.category === filterCategory);
  const activeCount = products.filter((p) => p.active).length;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Shop Products</h1>
          <p className="text-sm mt-0.5" style={{ color: theme.textLight }}>
            {products.length} products ({activeCount} active)
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: theme.primary }}
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold" style={{ color: theme.text }}>
              {editingId ? 'Edit Product' : 'New Product'}
            </h2>
            <button onClick={closeForm} className="p-1 rounded hover:bg-black/5"><X size={18} style={{ color: theme.textLight }} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="7×10 PEP Planner — Sunrise Cover"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              >
                {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Size (planner only) */}
            {formData.category === 'planner' && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>Size</label>
                <select
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                >
                  {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {/* Price */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="34.99"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              />
            </div>

            {/* Stripe Price ID */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>Stripe Price ID *</label>
              <input
                type="text"
                value={formData.stripePriceId}
                onChange={(e) => setFormData({ ...formData, stripePriceId: e.target.value.trim() })}
                placeholder="price_1ABC50b3cktl9X..."
                className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              />
              <p className="text-[11px] mt-1" style={{ color: theme.textLight }}>
                Paste from Stripe Dashboard → Products → select product → Price ID
              </p>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Full-size research planner with..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              />
            </div>

            {/* Image Upload */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>Product Image</label>
              <div className="flex items-start gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-24 h-24 rounded-lg object-cover border" style={{ borderColor: theme.border }} />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:opacity-70"
                    style={{ borderColor: theme.border }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingImage ? (
                      <Loader size={20} className="animate-spin" style={{ color: theme.textLight }} />
                    ) : (
                      <ImageIcon size={24} style={{ color: theme.textLight, opacity: 0.4 }} />
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors hover:bg-black/5 disabled:opacity-50"
                    style={{ borderColor: theme.border, color: theme.text }}
                  >
                    <Upload size={14} />
                    {uploadingImage ? 'Uploading...' : imagePreview ? 'Replace Image' : 'Upload Image'}
                  </button>
                  <p className="text-[11px] mt-1" style={{ color: theme.textLight }}>JPG, PNG, WebP. Max 5MB.</p>
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requiresShipping}
                  onChange={(e) => setFormData({ ...formData, requiresShipping: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm" style={{ color: theme.text }}>Requires Shipping</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm" style={{ color: theme.text }}>Active (visible in shop)</span>
              </label>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.primary }}
            >
              {isSaving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
            </button>
            <button
              onClick={closeForm}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-black/5"
              style={{ color: theme.textLight }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filterCategory === 'all' ? 'text-white' : ''}`}
          style={filterCategory === 'all' ? { backgroundColor: theme.primary } : { color: theme.textLight, backgroundColor: `${theme.text}08` }}
        >
          All ({products.length})
        </button>
        {CATEGORY_OPTIONS.map((cat) => {
          const count = products.filter((p) => p.category === cat.value).length;
          const active = filterCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${active ? 'text-white' : ''}`}
              style={active ? { backgroundColor: theme.primary } : { color: theme.textLight, backgroundColor: `${theme.text}08` }}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Product List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader size={24} className="animate-spin" style={{ color: theme.primary }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: theme.textLight }}>
            {products.length === 0 ? 'No products yet. Click "Add Product" to create your first one.' : 'No products in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((product, index) => {
            const CatIcon = CATEGORY_ICONS[product.category] || BookOpen;
            return (
              <div
                key={product.id}
                draggable
                onDragStart={() => handleDragStart(products.indexOf(product))}
                onDragEnter={() => handleDragEnter(products.indexOf(product))}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm cursor-grab active:cursor-grabbing"
                style={{
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                  opacity: product.active ? 1 : 0.55,
                }}
              >
                <GripVertical size={16} className="flex-shrink-0 opacity-30" style={{ color: theme.textLight }} />

                {/* Thumbnail */}
                <div
                  className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: `${theme.primary}08` }}
                >
                  {product.image ? (
                    <img src={typeof product.image === 'string' ? product.image : product.image.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <CatIcon size={18} style={{ color: theme.primary, opacity: 0.3 }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>{product.name}</span>
                    {!product.active && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">HIDDEN</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: theme.textLight }}>{PRODUCT_CATEGORIES[product.category]}</span>
                    {product.size && <span className="text-xs" style={{ color: theme.textLight }}>· {product.size}</span>}
                    <span className="text-xs font-semibold" style={{ color: theme.primary }}>${Number(product.price).toFixed(2)}</span>
                  </div>
                  {product.stripePriceId && (
                    <p className="text-[10px] font-mono truncate mt-0.5" style={{ color: theme.textLight, opacity: 0.6 }}>
                      {product.stripePriceId}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(product)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
                    title={product.active ? 'Hide from shop' : 'Show in shop'}
                  >
                    {product.active ? <Eye size={16} style={{ color: theme.primary }} /> : <EyeOff size={16} style={{ color: theme.textLight }} />}
                  </button>
                  <button
                    onClick={() => openEditForm(product)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
                    title="Edit"
                  >
                    <Edit size={16} style={{ color: theme.text }} />
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
