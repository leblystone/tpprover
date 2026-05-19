import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Save, X, Loader, Eye, EyeOff,
  Upload, Image as ImageIcon, GripVertical, BookOpen, Package, Download,
  ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import {
  fetchAllShopProducts, saveShopProduct, deleteShopProduct,
  toggleProductActive, reorderProducts, PRODUCT_CATEGORIES, generateSlug,
} from '../../config/plannerProducts';
import { uploadImageToStorage, deleteImageFromStorage } from '../../utils/storageUtils';
import { auth } from '../../config/firebase';

const CATEGORY_OPTIONS = Object.entries(PRODUCT_CATEGORIES).map(([value, label]) => ({ value, label }));
const SIZE_OPTIONS = [
  { value: '', label: 'None' },
  { value: '7x10', label: '7×10' },
  { value: '5x7', label: '5×7' },
];

const CATEGORY_ICONS = { planner: BookOpen, accessory: Package, digital: Download };

const DEFAULT_PLANNER_DESCRIPTION = `The Pep Planner helps you track peptide research and injection schedules with dedicated pages for protocol management. Perfect for monitoring GLP-1 research activities like Semaglutide and Tirzepatide tracking. This planner includes sections for recording peptide research data, managing reconstitution dates, organizing your peptide stockpile, and planning your research schedule.`;

const EMPTY_FORM = {
  name: '',
  category: 'planner',
  size: '',
  price: '',
  stripePriceId: '',
  description: DEFAULT_PLANNER_DESCRIPTION,
  images: [],
  requiresShipping: true,
  active: true,
  sortOrder: 0,
  stock: '',
  sku: '',
  slug: '',
  platformIds: { etsy: '', tiktok: '' },
  relatedProductIds: [],
  restockThreshold: 5,
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
  const [uploadingIdx, setUploadingIdx] = useState(null); // index being uploaded, or null
  const [filterCategory, setFilterCategory] = useState('all');
  const dragImgFrom = useRef(null);
  const [dragImgOver, setDragImgOver] = useState(null);
  const [showRelated, setShowRelated] = useState(false);
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
      images: Array.isArray(product.images) && product.images.length > 0
        ? product.images.map(img => typeof img === 'string' ? { url: img } : img).filter(Boolean)
        : [product.image, product.hoverImage]
            .filter(Boolean)
            .map(img => typeof img === 'string' ? { url: img } : img),
      requiresShipping: product.requiresShipping ?? true,
      active: product.active ?? true,
      sortOrder: product.sortOrder ?? 0,
      stock: product.stock ?? '',
      sku: product.sku || '',
      slug: product.slug || '',
      platformIds: {
        etsy: product.platformIds?.etsy || '',
        tiktok: product.platformIds?.tiktok || '',
      },
      relatedProductIds: Array.isArray(product.relatedProductIds) ? product.relatedProductIds : [],
      restockThreshold: product.restockThreshold ?? 5,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowRelated(false);
  };

  const handleCategoryChange = (cat) => {
    setFormData((prev) => ({
      ...prev,
      category: cat,
      requiresShipping: cat !== 'digital',
      size: cat === 'planner' ? prev.size : '',
    }));
  };

  const MAX_IMAGES = 10;

  const handleRemoveImageAtSlot = async (slotIdx) => {
    const img = formData.images?.[slotIdx];
    if (img?.path) {
      try { await deleteImageFromStorage(img.path); } catch {}
    }
    setFormData((prev) => {
      const imgs = [...(prev.images || [])];
      imgs.splice(slotIdx, 1);
      return { ...prev, images: imgs };
    });
  };

  // Most reliable cross-browser approach: create a temporary input, append to body,
  // click it, read the file, then remove it. Avoids all React synthetic event issues.
  const pickImageForSlot = (slotIdx) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(input);
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      document.body.removeChild(input);
      if (!file) return;
      if (!file.type.startsWith('image/')) { toast('error', 'File must be an image'); return; }
      if (file.size > 5 * 1024 * 1024) { toast('error', 'Image must be under 5MB'); return; }
      setUploadingIdx(slotIdx);
      try {
        const uid = auth.currentUser?.uid || 'admin';
        const result = await uploadImageToStorage(file, uid, 'stockpile');
        setFormData((prev) => {
          const imgs = [...(prev.images || [])];
          imgs[slotIdx] = { url: result.url, path: result.path };
          return { ...prev, images: imgs };
        });
        toast('success', slotIdx === 0 ? 'Main image uploaded' : `Image ${slotIdx + 1} uploaded`);
      } catch (err) {
        console.error('Image upload error:', err);
        toast('error', 'Image upload failed');
      } finally {
        setUploadingIdx(null);
      }
    };
    input.click();
  };

  const handleImgDragStart = (e, idx) => {
    dragImgFrom.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleImgDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragImgOver !== idx) setDragImgOver(idx);
  };

  const handleImgDrop = (e, toIdx) => {
    e.preventDefault();
    const fromIdx = dragImgFrom.current;
    if (fromIdx === null || fromIdx === toIdx) { setDragImgOver(null); return; }
    setFormData((prev) => {
      const imgs = [...(prev.images || [])];
      const [moved] = imgs.splice(fromIdx, 1);
      imgs.splice(toIdx, 0, moved);
      return { ...prev, images: imgs };
    });
    dragImgFrom.current = null;
    setDragImgOver(null);
  };

  const handleImgDragEnd = () => {
    dragImgFrom.current = null;
    setDragImgOver(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast('warning', 'Product name is required'); return; }
    if (!formData.stripePriceId.trim()) { toast('warning', 'Stripe Price ID is required'); return; }
    if (!formData.price || Number(formData.price) <= 0) { toast('warning', 'Price must be greater than 0'); return; }

    setIsSaving(true);
    try {
      console.log('🔐 Saving as:', auth.currentUser?.email, 'UID:', auth.currentUser?.uid);
      const data = {
        ...formData,
        price: Number(formData.price),
        sortOrder: editingId ? formData.sortOrder : products.length,
        slug: formData.slug.trim() || generateSlug(formData.name),
      };
      await saveShopProduct(data, editingId);
      toast('success', editingId ? 'Product updated!' : 'Product created!');
      closeForm();
      await loadProducts();
    } catch (err) {
      console.error('Save error:', err);
      console.error('Auth state:', auth.currentUser?.email, auth.currentUser?.uid);
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

            {/* Stock Count */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>Stock Count</label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
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

            {/* Slug */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="7x10-pep-planner-sunrise"
                className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              />
              <p className="text-[11px] mt-1" style={{ color: theme.textLight }}>
                Auto-generated from name if blank. Used in product page URL.
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

            {/* Etsy Listing ID */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>Etsy Listing ID</label>
              <input
                type="text"
                value={formData.platformIds.etsy}
                onChange={(e) => setFormData({ ...formData, platformIds: { ...formData.platformIds, etsy: e.target.value } })}
                placeholder="1234567890"
                className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              />
            </div>

            {/* TikTok Product ID */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>TikTok Product ID</label>
              <input
                type="text"
                value={formData.platformIds.tiktok}
                onChange={(e) => setFormData({ ...formData, platformIds: { ...formData.platformIds, tiktok: e.target.value } })}
                placeholder="7123456789"
                className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              />
            </div>

            {/* Restock Alert Threshold */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>Restock Alert At</label>
              <input
                type="number"
                min="0"
                value={formData.restockThreshold}
                onChange={(e) => setFormData({ ...formData, restockThreshold: e.target.value })}
                placeholder="5"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              />
              <p className="text-[11px] mt-1" style={{ color: theme.textLight }}>
                You'll get an email when stock drops to this level
              </p>
            </div>

            {/* Image Upload */}
            {/* ── Multi-Image Upload (up to 10) ── */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold" style={{ color: theme.textLight }}>
                  Product Images
                  <span className="font-normal ml-1 opacity-60">({(formData.images || []).length}/{MAX_IMAGES} · first = main, second = hover swap)</span>
                </label>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {/* Filled image slots */}
                {(formData.images || []).map((img, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => handleImgDragStart(e, idx)}
                    onDragOver={(e) => handleImgDragOver(e, idx)}
                    onDrop={(e) => handleImgDrop(e, idx)}
                    onDragEnd={handleImgDragEnd}
                    onClick={() => pickImageForSlot(idx)}
                    className="relative aspect-square rounded-lg overflow-hidden border group/img cursor-pointer transition-all"
                    style={{
                      borderColor: dragImgOver === idx ? theme.primary : theme.border,
                      borderWidth: dragImgOver === idx ? 2 : 1,
                      opacity: dragImgFrom.current === idx ? 0.4 : 1,
                    }}
                  >
                    <img
                      src={img?.url || img}
                      alt={`Image ${idx + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />

                    {/* Slot badge */}
                    <div className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold tracking-wide bg-black/40 text-white py-0.5 pointer-events-none">
                      {idx === 0 ? 'MAIN' : idx === 1 ? 'HOVER' : `#${idx + 1}`}
                    </div>

                    {/* Loading overlay */}
                    {uploadingIdx === idx && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none">
                        <Loader size={18} className="animate-spin" style={{ color: theme.primary }} />
                      </div>
                    )}

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveImageAtSlot(idx); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity z-10"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

                {/* Empty add slot */}
                {(formData.images || []).length < MAX_IMAGES && (
                  <div
                    onClick={() => pickImageForSlot((formData.images || []).length)}
                    className="relative aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
                    style={{ borderColor: theme.border }}
                  >
                    {uploadingIdx === (formData.images || []).length ? (
                      <Loader size={18} className="animate-spin" style={{ color: theme.textLight }} />
                    ) : (
                      <>
                        <ImageIcon size={18} style={{ color: theme.textLight, opacity: 0.4 }} />
                        <span className="text-[9px] mt-1 font-semibold tracking-wide uppercase" style={{ color: theme.textLight, opacity: 0.5 }}>Add</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: theme.textLight }}>
                JPG, PNG, WebP · max 5MB each · up to {MAX_IMAGES} images · click any image to replace it
              </p>
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

            {/* Related Products */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setShowRelated(!showRelated)}
                className="flex items-center gap-1.5 text-xs font-semibold mb-2 transition-colors hover:opacity-70"
                style={{ color: theme.textLight }}
              >
                {showRelated ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Frequently Bought Together
                {formData.relatedProductIds.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: theme.primary }}>
                    {formData.relatedProductIds.length}
                  </span>
                )}
              </button>
              {showRelated && (
                <div
                  className="rounded-lg border p-3 space-y-1.5 max-h-48 overflow-y-auto"
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                >
                  {products.filter((p) => p.id !== editingId).length === 0 ? (
                    <p className="text-xs" style={{ color: theme.textLight }}>No other products to link.</p>
                  ) : (
                    products.filter((p) => p.id !== editingId).map((p) => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-black/5">
                        <input
                          type="checkbox"
                          checked={formData.relatedProductIds.includes(p.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...formData.relatedProductIds, p.id]
                              : formData.relatedProductIds.filter((id) => id !== p.id);
                            setFormData({ ...formData, relatedProductIds: ids });
                          }}
                          className="w-3.5 h-3.5 rounded"
                        />
                        <span className="text-sm truncate" style={{ color: theme.text }}>{p.name}</span>
                        <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: theme.textLight }}>
                          ${Number(p.price).toFixed(2)}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>{product.name}</span>
                    {!product.active && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">HIDDEN</span>
                    )}
                    {(product.stock === 0 || product.stock == null) && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                        <AlertTriangle size={10} /> OUT OF STOCK
                      </span>
                    )}
                    {product.stock > 0 && product.stock <= (product.restockThreshold || 5) && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                        <AlertTriangle size={10} /> LOW STOCK
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: theme.textLight }}>{PRODUCT_CATEGORIES[product.category]}</span>
                    {product.size && <span className="text-xs" style={{ color: theme.textLight }}>· {product.size}</span>}
                    <span className="text-xs font-semibold" style={{ color: theme.primary }}>${Number(product.price).toFixed(2)}</span>
                    {product.stock != null && (
                      <span className="text-xs" style={{ color: theme.textLight }}>· {product.stock} in stock</span>
                    )}
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
