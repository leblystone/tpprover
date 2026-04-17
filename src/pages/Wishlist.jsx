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

      <div className="px-4 pb-12 max-w-lg mx-auto">
        <div className="relative mt-8">
          {/* Decorative Tape */}
          <div className="absolute -top-3 left-4 w-6 h-10 bg-blue-200/90 -rotate-12 z-10 shadow-sm" style={{ backdropFilter: 'blur(2px)' }} />
          <div className="absolute -top-4 right-4 w-6 h-10 bg-blue-200/90 rotate-12 z-10 shadow-sm" style={{ backdropFilter: 'blur(2px)' }} />
          
          <div
            className="rounded-xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.12)] min-h-[60vh] flex flex-col relative"
            style={{ 
              backgroundColor: theme.isDark ? '#262a33' : '#fdfdfd',
              border: `2px solid ${theme.isDark ? '#444' : '#222'}`, 
              color: theme.isDark ? '#f0f0f0' : '#222'
            }}
          >
            {/* Title Oval */}
            <div className="mx-auto mb-8 bg-[#e9cc77] text-[#222] rounded-[100%] px-10 py-2.5 w-max border border-[#dcb755] transform -rotate-1 shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold tracking-widest uppercase font-serif" style={{ fontFamily: "'Caveat', 'Comic Sans MS', cursive" }}>
                Wish List
              </h2>
            </div>

            <div className="flex-1 flex flex-col min-h-0 relative">
              <Wishlist
                variant="page"
                wishlist={wishlist}
                theme={theme}
                onAdd={openAdd}
                onEdit={openEdit}
              />
            </div>

            {/* Hand-drawn heart at bottom */}
            <div className="mt-8 flex justify-center pb-2 opacity-90">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#e07a82">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
          </div>

          {isReadOnly && (
          <div className="absolute inset-0 rounded-xl backdrop-blur-sm flex items-center justify-center z-20" style={{ backgroundColor: theme.isDark ? 'rgba(15,18,24,0.75)' : 'rgba(255,255,255,0.82)' }}>
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
