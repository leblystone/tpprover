import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Lock } from '@phosphor-icons/react';
import Wishlist from '../components/dashboard/Wishlist';
import AddWishlistItemModal from '../components/dashboard/AddWishlistItemModal';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import AddToStockpileBottomSheet from '../components/stockpile/AddToStockpileBottomSheet';
import UpgradeModal from '../components/common/UpgradeModal';
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess';
import { prepareItemForSave } from '../utils/userDataSave';
import { useAppContext } from '../context/AppContext';
import { buildOrderPrefillFromWishlistItem, buildStockpilePrefillFromWishlistItem } from '../utils/wishlistAcquirePrefill';
import { ensurePublicOrderNumbers, getNextPublicOrderNumber } from '../utils/orderNumbers';
import { generateId } from '../utils/string';

export default function WishlistPage() {
  const { theme } = useOutletContext();
  const { isReadOnly } = useSubscriptionAccess();
  const { orders, setOrders, vendors, setVendors } = useAppContext();

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
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrderDraftFromWishlist, setNewOrderDraftFromWishlist] = useState(null);
  const [newOrderModalKey, setNewOrderModalKey] = useState(0);
  const [showStockpileAdd, setShowStockpileAdd] = useState(false);
  const [wishlistStockpilePrefill, setWishlistStockpilePrefill] = useState(null);

  const openAdd = useCallback(() => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }
    setEditingWishlistItem(null);
    setShowAddWishlistModal(true);
  }, [isReadOnly]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', {
      detail: {
        tabs: [{ value: 'wishlist', label: 'Wishlist' }],
        activeTab: 'wishlist',
        onTabChange: () => {},
        onActionClick: openAdd,
        actionDisabled: isReadOnly,
      }
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'));
    };
  }, [openAdd, isReadOnly]);

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

  const handleWishlistAcquire = useCallback((item, destination) => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }
    if (!item?.id) return;
    setWishlist((prev) => {
      const next = prev.filter((w) => String(w.id) !== String(item.id));
      try {
        localStorage.setItem('tpprover_wishlist', JSON.stringify(next));
        localStorage.setItem('tpprover_wishlist_lastUpdate', String(Date.now()));
      } catch (e) {
        console.error('Failed to update wishlist after acquire:', e);
      }
      window.dispatchEvent(new CustomEvent('tpp:wishlist-updated', { detail: { wishlist: next } }));
      return next;
    });
    if (destination === 'order') {
      setNewOrderDraftFromWishlist(buildOrderPrefillFromWishlistItem(item));
      setNewOrderModalKey((k) => k + 1);
      setShowNewOrder(true);
    } else {
      setWishlistStockpilePrefill(buildStockpilePrefillFromWishlistItem(item));
      setShowStockpileAdd(true);
    }
  }, [isReadOnly]);

  /** Soft vision-board canvas: gradients + blobs from the active theme only. */
  const wishlistCanvasStyle = useMemo(() => {
    const p = theme.primary;
    const pl = theme.primaryLight || theme.primary;
    const acc = theme.accent || theme.primaryLight || theme.primary;
    const base = theme.background;
    if (theme.isDark) {
      return {
        backgroundColor: base,
        backgroundImage: `
          radial-gradient(ellipse 90% 70% at 10% 10%, ${p}28 0%, transparent 58%),
          radial-gradient(ellipse 75% 60% at 95% 85%, ${acc}22 0%, transparent 52%),
          radial-gradient(circle at 48% 100%, ${pl}14 0%, transparent 45%)
        `,
        borderColor: `${p}35`,
        boxShadow: `inset 0 1px 0 ${pl}18`,
      };
    }
    return {
      backgroundColor: theme.secondary || base,
      backgroundImage: `
        radial-gradient(ellipse 95% 80% at 0% 0%, ${p}16 0%, transparent 55%),
        radial-gradient(ellipse 85% 70% at 100% 12%, ${acc}1c 0%, transparent 52%),
        radial-gradient(circle at 72% 100%, ${pl}12 0%, transparent 42%)
      `,
      borderColor: `${p}22`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45)`,
    };
  }, [theme]);

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
    <div className="min-h-full w-full max-w-full overflow-x-hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="px-4 pb-12 max-w-5xl mx-auto pt-3">
        <div
          className="relative flex flex-col rounded-3xl border overflow-hidden min-h-[60vh]"
          style={wishlistCanvasStyle}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl z-0" aria-hidden="true">
            <div
              className="absolute -top-24 -left-20 h-64 w-64 rounded-full opacity-[0.2] blur-3xl"
              style={{ backgroundColor: theme.primary }}
            />
            <div
              className="absolute top-[32%] -right-16 h-52 w-52 rounded-full opacity-[0.16] blur-3xl"
              style={{ backgroundColor: theme.primaryLight || theme.primary }}
            />
            <div
              className="absolute -bottom-16 left-[18%] h-48 w-[min(80%,22rem)] rounded-full opacity-[0.14] blur-3xl"
              style={{ backgroundColor: theme.accent || theme.primaryLight || theme.primary }}
            />
          </div>

          <div className="relative z-10 flex flex-col min-h-[60vh] min-w-0 flex-1">
            <div className="flex-1 min-h-0 flex flex-col px-1 py-2 sm:px-2 sm:py-3">
              <Wishlist
                variant="page"
                wishlist={wishlist}
                theme={theme}
                onAdd={openAdd}
                onEdit={openEdit}
                onAcquireDestination={handleWishlistAcquire}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>

          {isReadOnly && (
          <div className="absolute inset-0 rounded-3xl backdrop-blur-sm flex items-center justify-center z-20" style={{ backgroundColor: theme.isDark ? 'rgba(15,18,24,0.75)' : 'rgba(255,255,255,0.82)' }}>
            <div className="text-center p-4 max-w-xs">
              <div className="flex items-center justify-center mb-3" style={{ color: theme.primary }}>
                <Lock size={48} weight="duotone" />
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

      />

      <AddToStockpileBottomSheet
        open={!!showStockpileAdd}
        onClose={() => {
          setShowStockpileAdd(false);
          setWishlistStockpilePrefill(null);
        }}
        theme={theme}
        wishlistPrefill={wishlistStockpilePrefill}
      />

      <OrderDetailsModal
        key={`wishlist-page-order-${newOrderModalKey}`}
        open={!!showNewOrder}
        onClose={() => {
          setShowNewOrder(false);
          setNewOrderDraftFromWishlist(null);
        }}
        order={newOrderDraftFromWishlist}
        theme={theme}
        vendors={vendors}
        isReadOnly={isReadOnly}
        onUpgrade={() => setShowUpgradeModal(true)}
        onSave={(o) => {
          const category = o.category || 'domestic';
          setOrders((prev) => {
            const normalizedPrev = ensurePublicOrderNumbers(prev);
            const nextNumber = getNextPublicOrderNumber(normalizedPrev);
            const newOrder = {
              ...o,
              id: o.id || generateId(),
              category,
              type: category,
              publicOrderNumber: nextNumber,
            };
            return [newOrder, ...normalizedPrev];
          });
          if (o.vendor) {
            setVendors((prev) => {
              const existing = prev.find((v) => v.name === o.vendor);
              if (existing) return prev;
              return [...prev, { id: generateId(), name: o.vendor }];
            });
          }
          setShowNewOrder(false);
          setNewOrderDraftFromWishlist(null);
        }}
        onDelete={() => {
          setShowNewOrder(false);
          setNewOrderDraftFromWishlist(null);
        }}
      />
    </div>
  );
}
