import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BookHeart, Plus, Lock } from 'lucide-react';
import Wishlist from '../components/dashboard/Wishlist';
import AddWishlistItemModal from '../components/dashboard/AddWishlistItemModal';
import UpgradeModal from '../components/common/UpgradeModal';
import ExpandableTooltip from '../components/ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../utils/widgetTooltips';
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess';
import { prepareItemForSave } from '../utils/userDataSave';

export default function WishlistPage() {
  const { theme } = useOutletContext();
  const { isReadOnly } = useSubscriptionAccess();

  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tpprover_wishlist') || '[]');
    } catch {
      return [];
    }
  });
  const [showAddWishlistModal, setShowAddWishlistModal] = useState(false);
  const [editingWishlistItem, setEditingWishlistItem] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const openAdd = useCallback(() => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }
    setEditingWishlistItem(null);
    setShowAddWishlistModal(true);
  }, [isReadOnly]);

  const openEdit = useCallback((item) => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }
    setEditingWishlistItem(item);
    setShowAddWishlistModal(true);
  }, [isReadOnly]);

  useEffect(() => {
    const loadWishlist = () => {
      try {
        const raw = localStorage.getItem('tpprover_wishlist');
        if (raw) {
          setWishlist(JSON.parse(raw));
        } else {
          setWishlist([]);
        }
      } catch (error) {
        console.error('Error loading wishlist:', error);
        setWishlist([]);
      }
    };

    loadWishlist();

    const handleWishlistUpdated = (e) => {
      if (e.detail?.wishlist) {
        setWishlist(e.detail.wishlist);
      } else {
        loadWishlist();
      }
    };

    const handleCloudDataLoaded = () => {
      loadWishlist();
    };

    window.addEventListener('tpp:wishlist-updated', handleWishlistUpdated);
    window.addEventListener('tpp:cloud-data-loaded', handleCloudDataLoaded);

    const handleStorageChange = (e) => {
      if (e.key === 'tpprover_wishlist') {
        loadWishlist();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('tpp:wishlist-updated', handleWishlistUpdated);
      window.removeEventListener('tpp:cloud-data-loaded', handleCloudDataLoaded);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleSaveItem = (item) => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }

    const newItem = prepareItemForSave(
      { ...item, createdAt: item.createdAt || new Date().toISOString() },
      { isNew: !item.id }
    );

    setWishlist((prev) => {
      const isEdit = item.id && prev.some((i) => i.id === item.id);
      let updated;
      if (isEdit) {
        updated = prev.map((i) => (i.id === item.id ? prepareItemForSave({ ...i, ...newItem }) : i));
      } else {
        updated = [...prev, newItem];
      }

      try {
        localStorage.setItem('tpprover_wishlist', JSON.stringify(updated));
        localStorage.setItem('tpprover_wishlist_lastUpdate', String(Date.now()));
      } catch (e) {
        console.error('Failed to save wishlist to localStorage:', e);
      }

      window.dispatchEvent(new CustomEvent('tpp:wishlist-updated', {
        detail: { wishlist: updated }
      }));

      return updated;
    });

    setShowAddWishlistModal(false);
    setEditingWishlistItem(null);
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { message: item.id ? 'Wishlist item updated' : 'Item added to wishlist', type: 'success' }
    }));
  };

  return (
    <div className="min-h-full w-full max-w-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="px-4 pt-2 pb-3 flex items-center gap-2 flex-wrap justify-between">
        <h1 className="text-xl font-bold min-w-0 flex items-center gap-2" style={{ color: theme.text }}>
          <BookHeart size={22} style={{ color: theme.primary }} className="flex-shrink-0" />
          Wishlist
        </h1>
        <div className="flex items-center gap-2 flex-shrink-0">
        <ExpandableTooltip content={WIDGET_TOOLTIPS.wishlist} theme={theme} position="left" />
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold touch-manipulation active:scale-95 transition-transform flex-shrink-0"
          style={{ backgroundColor: `${theme.primary}18`, color: theme.primary }}
        >
          <Plus size={16} />
          Add
        </button>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="relative">
          <div
            className="rounded-2xl p-4 shadow-[0_2px_14px_rgba(0,0,0,0.06)] min-h-[50vh] flex flex-col"
            style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
          >
            <Wishlist
              variant="page"
              wishlist={wishlist}
              theme={theme}
              onAdd={openAdd}
              onEdit={openEdit}
            />
          </div>

          {isReadOnly && (
          <div className="absolute inset-0 rounded-2xl backdrop-blur-sm flex items-center justify-center z-20" style={{ backgroundColor: theme.isDark ? 'rgba(15,18,24,0.75)' : 'rgba(255,255,255,0.82)' }}>
            <div className="text-center p-4 max-w-xs">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
                <Lock size={24} style={{ color: theme.primary }} />
              </div>
              <p className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>
                Trial has ended
              </p>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm btn-primary-inset"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                Upgrade
              </button>
            </div>
          </div>
          )}
        </div>
      </div>

      <AddWishlistItemModal
        open={showAddWishlistModal}
        onClose={() => { setShowAddWishlistModal(false); setEditingWishlistItem(null); }}
        theme={theme}
        item={editingWishlistItem ?? null}
        onSave={handleSaveItem}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        theme={theme}
        actionAttempted="manage your wishlist"
      />
    </div>
  );
}
