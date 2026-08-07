import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import {
  ArrowFatUp,
  ArrowFatDown,
  Plus,
  Storefront,
  Globe,
  Users,
  Info,
  CaretDown,
  CreditCard,
  Coins,
  Bank,
  CheckCircle,
  SealCheck,
  Rabbit,
  StackPlus,
  Flask,
  Pill,
  Wine,
  TrendUp,
  Boat,
  HourglassHigh,
  EggCrack,
  SealWarning,
  Warning,
  UserMinus,
  Prohibit,
  Gauge,
} from '@phosphor-icons/react'
import { SiZelle, SiCashapp, SiVenmo } from 'react-icons/si'
import { FaPaypal, FaAlipay } from 'react-icons/fa'
import BottomSheet from '../common/BottomSheet'
import { AnimatePresence, motion } from 'framer-motion'

const VenmoIcon = ({ size = 14, style, className }) => (
  <SiVenmo size={size} style={style} className={className} />
)

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESET_TAGS = [
  // Matches VendorDetailsModal labelOptions + icons
  { id: 'reliable',       label: 'Reliable',        short: 'Reliable',  type: 'positive', Icon: CheckCircle },
  { id: 'vetted',         label: 'Vetted',          short: 'Vetted',    type: 'positive', Icon: SealCheck },
  { id: 'fast_shipping',  label: 'Fast Shipping',   short: 'Fast Ship', type: 'positive', Icon: Rabbit },
  { id: 'overfill',       label: 'Overfill',        short: 'Overfill',  type: 'positive', Icon: StackPlus },
  { id: 'glp1',           label: 'GLP1',            short: 'GLP1',      type: 'neutral',  Icon: Flask },
  { id: 'aminos',         label: 'Aminos',          short: 'Aminos',    type: 'neutral',  Icon: Pill },
  { id: 'oils',           label: 'Oils',            short: 'Oils',      type: 'neutral',  Icon: Wine },
  { id: 'pricey',         label: 'Pricey',          short: 'Pricey',    type: 'neutral',  Icon: TrendUp },
  { id: 'reshipper',      label: 'Reshipper',       short: 'Reship',    type: 'positive', Icon: Boat },
  { id: 'slow_shipping',  label: 'Slow Shipping',   short: 'Slow Ship', type: 'negative', Icon: HourglassHigh },
  { id: 'bad_test',       label: 'Bad Test',        short: 'Bad Test',  type: 'negative', Icon: EggCrack },
  { id: 'bad_packaging',  label: 'Bad Packaging',   short: 'Packaging', type: 'negative', Icon: SealWarning },
  { id: 'broken_vials',   label: 'Broken Vials',    short: 'Vials',     type: 'negative', Icon: Warning },
  { id: 'rude_reps',      label: 'Rude Reps',       short: 'Rude',      type: 'negative', Icon: UserMinus },
  { id: 'out_of_service', label: 'Out of Service',  short: 'Offline',   type: 'negative', Icon: Prohibit },
  { id: 'puck_problem',   label: 'Puck Problem',    short: 'Puck',      type: 'negative', Icon: Gauge },
]

// Matches VendorDetailsModal payment options
const PRESET_PAYMENTS = [
  { id: 'card',    label: 'Card',    Icon: CreditCard },
  { id: 'zelle',   label: 'Zelle',   Icon: SiZelle },
  { id: 'crypto',  label: 'Crypto',  Icon: Coins },
  { id: 'paypal',  label: 'PayPal',  Icon: FaPaypal },
  { id: 'wire',    label: 'Wire',    Icon: Bank },
  { id: 'venmo',   label: 'Venmo',   Icon: VenmoIcon },
  { id: 'cashapp', label: 'CashApp', Icon: SiCashapp },
  { id: 'alipay',  label: 'AliPay',  Icon: FaAlipay },
]

function emptyTagCounts() {
  return Object.fromEntries(PRESET_TAGS.map(t => [t.id, 0]))
}

function emptyPaymentCounts() {
  return Object.fromEntries(PRESET_PAYMENTS.map(p => [p.id, 0]))
}

// Matches Vendors page categories: Storefront / Globe / Users
const CATEGORY_META = {
  domestic:      { label: 'Domestic',      Icon: Storefront },
  international: { label: 'International', Icon: Globe },
  groupbuy:      { label: 'Group Buy',     Icon: Users },
}

// Mock data — replace with API call when backend is ready.
const INITIAL_MOCK_VENDORS = [
  {
    id: 'v-1',
    name: 'Peptide Sciences',
    type: 'domestic',
    upvotes: 184,
    downvotes: 42,
    lastVoteAt: '2026-08-05T18:22:00.000Z',
    tags: {
      ...emptyTagCounts(),
      reliable: 143, vetted: 128, fast_shipping: 97, overfill: 54, glp1: 88,
      aminos: 41, oils: 12, pricey: 33, reshipper: 22,
      slow_shipping: 8, bad_test: 4, bad_packaging: 6, broken_vials: 3, rude_reps: 2, out_of_service: 1, puck_problem: 5,
    },
    payments: {
      ...emptyPaymentCounts(),
      card: 62, zelle: 118, crypto: 94, paypal: 41, wire: 28, venmo: 55, cashapp: 22, alipay: 6,
    },
  },
  {
    id: 'v-2',
    name: 'Core Peptides',
    type: 'domestic',
    upvotes: 110,
    downvotes: 18,
    lastVoteAt: '2026-08-04T14:10:00.000Z',
    tags: {
      ...emptyTagCounts(),
      reliable: 89, vetted: 74, fast_shipping: 61, overfill: 40, glp1: 70,
      aminos: 55, oils: 8, pricey: 28, reshipper: 18,
      slow_shipping: 14, bad_test: 5, bad_packaging: 3, broken_vials: 2, rude_reps: 1, out_of_service: 0, puck_problem: 4,
    },
    payments: {
      ...emptyPaymentCounts(),
      card: 48, zelle: 91, crypto: 77, paypal: 33, wire: 12, venmo: 64, cashapp: 38, alipay: 4,
    },
  },
  {
    id: 'v-3',
    name: 'Limitless Life Nootropics',
    type: 'international',
    upvotes: 76,
    downvotes: 31,
    lastVoteAt: '2026-08-03T09:45:00.000Z',
    tags: {
      ...emptyTagCounts(),
      reliable: 52, vetted: 48, fast_shipping: 33, overfill: 19, glp1: 44,
      aminos: 62, oils: 35, pricey: 21, reshipper: 11,
      slow_shipping: 22, bad_test: 9, bad_packaging: 8, broken_vials: 6, rude_reps: 4, out_of_service: 2, puck_problem: 7,
    },
    payments: {
      ...emptyPaymentCounts(),
      card: 35, zelle: 18, crypto: 102, paypal: 56, wire: 44, venmo: 9, cashapp: 7, alipay: 31,
    },
  },
  {
    id: 'v-4',
    name: 'Amino Asylum',
    type: 'groupbuy',
    upvotes: 55,
    downvotes: 67,
    lastVoteAt: '2026-08-01T21:05:00.000Z',
    tags: {
      ...emptyTagCounts(),
      reliable: 21, vetted: 18, fast_shipping: 29, overfill: 12, glp1: 38,
      aminos: 71, oils: 15, pricey: 44, reshipper: 9,
      slow_shipping: 38, bad_test: 31, bad_packaging: 19, broken_vials: 14, rude_reps: 11, out_of_service: 8, puck_problem: 16,
    },
    payments: {
      ...emptyPaymentCounts(),
      card: 14, zelle: 52, crypto: 88, paypal: 21, wire: 8, venmo: 47, cashapp: 29, alipay: 11,
    },
  },
  {
    id: 'v-5',
    name: 'Swisschems',
    type: 'international',
    upvotes: 94,
    downvotes: 24,
    lastVoteAt: '2026-08-06T08:30:00.000Z',
    tags: {
      ...emptyTagCounts(),
      reliable: 78, vetted: 71, fast_shipping: 54, overfill: 31, glp1: 26,
      aminos: 48, oils: 58, pricey: 19, reshipper: 15,
      slow_shipping: 11, bad_test: 7, bad_packaging: 3, broken_vials: 2, rude_reps: 1, out_of_service: 0, puck_problem: 4,
    },
    payments: {
      ...emptyPaymentCounts(),
      card: 41, zelle: 12, crypto: 115, paypal: 49, wire: 67, venmo: 5, cashapp: 3, alipay: 38,
    },
  },
]

const STORAGE_KEY_VOTES     = 'tpp_si_votes_v4'
const STORAGE_KEY_TAGS      = 'tpp_si_tags_v4'
const STORAGE_KEY_PAYMENTS  = 'tpp_si_payments_v4'
const STORAGE_KEY_DATA      = 'tpp_si_data_v4'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* ignore quota errors */ }
}

function getTopTag(tags) {
  let topId = null
  let topCount = 0
  PRESET_TAGS.forEach(({ id }) => {
    if ((tags[id] || 0) > topCount) {
      topCount = tags[id] || 0
      topId = id
    }
  })
  if (!topId) return null
  const tag = PRESET_TAGS.find(t => t.id === topId)
  return { ...tag, count: topCount }
}

function netScore(v) {
  return (v.upvotes || 0) - (v.downvotes || 0)
}

function formatLastVote(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function touchLastVote(vendor) {
  return { ...vendor, lastVoteAt: new Date().toISOString() }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Same visual language as VendorDetailsModal label / payment chips */
function ModalStyleChip({ label, Icon, count, isSelected, onToggle, theme, variant = 'label' }) {
  const selectedBg = variant === 'payment' ? '#445952' : '#6B7F77'
  const selectedBorder = variant === 'payment' ? '#3B4240' : '#566D64'
  const idleBg = theme.isDark ? '#1f2937' : '#f5f4f0'
  const idleBorder = theme.isDark ? 'rgba(255,255,255,0.05)' : '#e8e6df'
  const idleColor = theme.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'

  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-pressed={isSelected}
      className="flex flex-col items-center justify-center p-1.5 rounded-lg touch-manipulation active:scale-95"
      style={{
        backgroundColor: isSelected ? selectedBg : idleBg,
        border: `1px solid ${isSelected ? selectedBorder : idleBorder}`,
        color: isSelected ? '#fff' : idleColor,
        boxShadow: isSelected
          ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)'
          : 'inset 0 1px 3px rgba(0,0,0,0.06)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Icon size={14} className="mb-1" style={{ color: isSelected ? '#fff' : 'inherit' }} />
      <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight">
        {label}
      </span>
      {typeof count === 'number' && (
        <span
          className="text-[9px] tabular-nums mt-0.5 font-semibold"
          style={{ color: isSelected ? 'rgba(255,255,255,0.85)' : theme.textLight }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function VoteRail({ userVote, score, positive, scoreColor, onVote, vendorId, theme }) {
  const idle = theme.isDark ? '#71717a' : '#a1a1aa'
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
      <button
        type="button"
        aria-label="Upvote"
        onClick={() => onVote(vendorId, 'up')}
        className="flex items-center justify-center w-8 h-8 rounded-lg touch-manipulation"
        style={{
          color: userVote === 'up' ? '#34d399' : idle,
          background: userVote === 'up' ? 'rgba(52,211,153,0.12)' : 'transparent',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <ArrowFatUp size={18} weight={userVote === 'up' ? 'fill' : 'duotone'} />
      </button>
      <span className="text-sm font-bold tabular-nums leading-none py-0.5" style={{ color: scoreColor }}>
        {positive ? '+' : ''}{score}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        onClick={() => onVote(vendorId, 'down')}
        className="flex items-center justify-center w-8 h-8 rounded-lg touch-manipulation"
        style={{
          color: userVote === 'down' ? '#fb923c' : idle,
          background: userVote === 'down' ? 'rgba(251,146,60,0.12)' : 'transparent',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <ArrowFatDown size={18} weight={userVote === 'down' ? 'fill' : 'duotone'} />
      </button>
    </div>
  )
}

function VendorCard({ vendor, userVote, userTags, userPayments, onVote, onTagToggle, onPaymentToggle, theme }) {
  const [contributeOpen, setContributeOpen] = useState(false)
  const [panelTab, setPanelTab] = useState('labels') // 'labels' | 'payments'
  const score    = netScore(vendor)
  const topTag   = getTopTag(vendor.tags)
  const positive = score >= 0
  const category = CATEGORY_META[vendor.type] || CATEGORY_META.domestic
  const CategoryIcon = category.Icon
  const payments = vendor.payments || emptyPaymentCounts()
  const totalLabels = PRESET_TAGS.reduce((sum, t) => sum + (vendor.tags[t.id] || 0), 0)
  const totalPayments = PRESET_PAYMENTS.reduce((sum, p) => sum + (payments[p.id] || 0), 0)
  const topPayments = [...PRESET_PAYMENTS]
    .map(p => ({ ...p, count: payments[p.id] || 0 }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  const scoreColor = positive
    ? (theme.isDark ? '#6ee7b7' : '#059669')
    : (theme.isDark ? '#fdba74' : '#d97706')

  const divider = theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.08)'
  const TopIcon = topTag?.Icon
  const topAccent = !topTag ? null
    : topTag.type === 'positive'
      ? { bg: theme.isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.12)', border: theme.isDark ? 'rgba(52,211,153,0.35)' : 'rgba(5,150,105,0.3)', color: theme.isDark ? '#6ee7b7' : '#059669' }
      : topTag.type === 'negative'
        ? { bg: theme.isDark ? 'rgba(251,146,60,0.15)' : 'rgba(217,119,6,0.12)', border: theme.isDark ? 'rgba(251,146,60,0.35)' : 'rgba(217,119,6,0.3)', color: theme.isDark ? '#fdba74' : '#d97706' }
        : { bg: theme.isDark ? `${theme.primary}22` : `${theme.primary}15`, border: `${theme.primary}40`, color: theme.primary }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: theme.cardBackground,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div className="flex gap-3 p-3.5">
        <VoteRail
          userVote={userVote}
          score={score}
          positive={positive}
          scoreColor={scoreColor}
          onVote={onVote}
          vendorId={vendor.id}
          theme={theme}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[15px] leading-snug truncate" style={{ color: theme.text }}>
                {vendor.name}
              </p>
              {topTag && topAccent && (
                <div className="mt-1 flex items-center gap-1.5 min-w-0">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide shrink-0"
                    style={{ color: theme.textLight }}
                  >
                    Top label
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 min-w-0 max-w-full text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                    style={{
                      background: topAccent.bg,
                      border: `1px solid ${topAccent.border}`,
                      color: topAccent.color,
                    }}
                  >
                    {TopIcon && <TopIcon size={13} weight="duotone" className="shrink-0" />}
                    <span className="truncate">{topTag.label}</span>
                    <span className="tabular-nums opacity-80 shrink-0">{topTag.count}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
                title={category.label}
                style={{ color: theme.textLight }}
              >
                <CategoryIcon size={14} weight="duotone" style={{ color: theme.primary }} />
                {category.label}
              </span>
              <span className="text-[10px] text-right" style={{ color: theme.textLight }}>
                Last vote:{' '}
                <span style={{ color: theme.text, fontWeight: 500 }}>
                  {formatLastVote(vendor.lastVoteAt) || '—'}
                </span>
              </span>
            </div>
          </div>

          {topPayments.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              {topPayments.map(p => {
                const Icon = p.Icon
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg font-medium"
                    title={p.label}
                    style={{
                      color: theme.text,
                      background: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(47,59,58,0.05)',
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <Icon size={14} style={{ color: theme.primary }} />
                    <span className="leading-none">{p.label}</span>
                    <span className="tabular-nums leading-none" style={{ color: theme.textLight }}>{p.count}</span>
                  </span>
                )
              })}
            </div>
          )}

          {/* Inline expand — no modal, tap to vote */}
          <div className="mt-2.5" style={{ borderTop: `1px solid ${divider}` }}>
            <button
              type="button"
              onClick={() => setContributeOpen(v => !v)}
              aria-expanded={contributeOpen}
              className="w-full flex items-center justify-between gap-2 py-2 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span className="text-[11px]" style={{ color: theme.textLight }}>
                <span className="font-semibold" style={{ color: theme.text }}>
                  Vote Here!
                </span>
                <span className="opacity-70">
                  {' '}· {totalLabels} labels · {totalPayments} payments
                </span>
              </span>
              <CaretDown
                size={14}
                weight="bold"
                style={{
                  color: theme.textLight,
                  transform: contributeOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 220ms ease',
                }}
              />
            </button>

            <AnimatePresence initial={false}>
              {contributeOpen && (
                <motion.div
                  key="contribute-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="pb-1 pt-0.5">
                    <div
                      className="grid grid-cols-2 p-0.5 rounded-full mb-2.5"
                      style={{
                        background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.07)',
                      }}
                    >
                      {[
                        { key: 'labels', label: 'Labels' },
                        { key: 'payments', label: 'Payments' },
                      ].map(tab => {
                        const active = panelTab === tab.key
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setPanelTab(tab.key)}
                            className="py-1.5 rounded-full text-[11px] font-semibold touch-manipulation"
                            style={{
                              background: active ? theme.cardBackground : 'transparent',
                              color: active ? theme.text : theme.textLight,
                              boxShadow: active && !theme.isDark ? '0 1px 3px rgba(47,59,58,0.08)' : 'none',
                              border: active ? `1px solid ${theme.border}` : '1px solid transparent',
                              WebkitTapHighlightColor: 'transparent',
                            }}
                          >
                            {tab.label}
                          </button>
                        )
                      })}
                    </div>

                    {panelTab === 'labels' ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {PRESET_TAGS.map(tag => (
                          <ModalStyleChip
                            key={tag.id}
                            label={tag.label}
                            Icon={tag.Icon}
                            count={vendor.tags[tag.id] || 0}
                            isSelected={!!(userTags[tag.id])}
                            onToggle={() => onTagToggle(vendor.id, tag.id)}
                            theme={theme}
                            variant="label"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PRESET_PAYMENTS.map(payment => (
                          <ModalStyleChip
                            key={payment.id}
                            label={payment.label}
                            Icon={payment.Icon}
                            count={payments[payment.id] || 0}
                            isSelected={!!(userPayments[payment.id])}
                            onToggle={() => onPaymentToggle(vendor.id, payment.id)}
                            theme={theme}
                            variant="payment"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubmitVendorSheet({ open, theme, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('domestic')
  const [selectedTags, setSelectedTags] = useState({})
  const [selectedPayments, setSelectedPayments] = useState({})

  useEffect(() => {
    if (!open) {
      setName('')
      setType('domestic')
      setSelectedTags({})
      setSelectedPayments({})
    }
  }, [open])

  const toggleTag = (tagId) => {
    setSelectedTags(prev => {
      const next = { ...prev }
      if (next[tagId]) delete next[tagId]
      else next[tagId] = true
      return next
    })
  }

  const togglePayment = (paymentId) => {
    setSelectedPayments(prev => {
      const next = { ...prev }
      if (next[paymentId]) delete next[paymentId]
      else next[paymentId] = true
      return next
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed, type, Object.keys(selectedTags), Object.keys(selectedPayments))
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Suggest a Source"
      theme={theme}
      fitContent
      footer={
        <button
          type="button"
          disabled={!name.trim()}
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 touch-manipulation"
          style={{
            background: theme.primary,
            color: theme.textOnPrimary || '#fff',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Submit Anonymously
        </button>
      }
    >
      <p className="text-xs mb-4 leading-relaxed" style={{ color: theme.textLight }}>
        Fully anonymous. Community-reviewed through votes — no sponsorships, no affiliate links, no endorsements.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Source name (e.g. Peptide Sciences)"
          maxLength={80}
          className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
          style={{
            background: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${theme.border}`,
            color: theme.text,
          }}
          autoFocus={open}
        />

        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const Icon = meta.Icon
            const selected = type === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[10px] font-medium touch-manipulation"
                style={{
                  background: selected
                    ? (theme.isDark ? `${theme.primary}25` : `${theme.primary}18`)
                    : 'transparent',
                  border: `1px solid ${selected ? `${theme.primary}50` : theme.border}`,
                  color: selected ? theme.primary : theme.textLight,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Icon size={18} weight="duotone" />
                {meta.label}
              </button>
            )
          })}
        </div>

        <div>
          <p className="text-[11px] font-semibold mb-2" style={{ color: theme.text }}>
            Labels <span className="font-normal" style={{ color: theme.textLight }}>(optional)</span>
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {PRESET_TAGS.map(tag => (
              <ModalStyleChip
                key={tag.id}
                label={tag.label}
                Icon={tag.Icon}
                isSelected={!!selectedTags[tag.id]}
                onToggle={() => toggleTag(tag.id)}
                theme={theme}
                variant="label"
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold mb-2" style={{ color: theme.text }}>
            Payment methods <span className="font-normal" style={{ color: theme.textLight }}>(optional)</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_PAYMENTS.map(payment => (
              <ModalStyleChip
                key={payment.id}
                label={payment.label}
                Icon={payment.Icon}
                isSelected={!!selectedPayments[payment.id]}
                onToggle={() => togglePayment(payment.id)}
                theme={theme}
                variant="payment"
              />
            ))}
          </div>
        </div>
      </form>
    </BottomSheet>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SupplyIndex = forwardRef(function SupplyIndex({ theme }, ref) {
  // Vendor list — seeded from mock data, then merged with any localStorage mutations
  const [vendors, setVendors] = useState(() => {
    const saved = loadJSON(STORAGE_KEY_DATA, null)
    if (saved && Array.isArray(saved) && saved.length > 0) {
      const seedById = Object.fromEntries(INITIAL_MOCK_VENDORS.map(v => [v.id, v]))
      return saved.map(v => {
        const seed = seedById[v.id]
        const savedTags = v.tags || {}
        const savedTagTotal = Object.values(savedTags).reduce((s, n) => s + (Number(n) || 0), 0)
        const tags = savedTagTotal > 0
          ? { ...emptyTagCounts(), ...savedTags }
          : { ...emptyTagCounts(), ...(seed?.tags || {}) }
        return {
          ...v,
          type: v.type || seed?.type || 'domestic',
          lastVoteAt: v.lastVoteAt || seed?.lastVoteAt || null,
          payments: { ...emptyPaymentCounts(), ...(seed?.payments || {}), ...(v.payments || {}) },
          tags,
        }
      })
    }
    return INITIAL_MOCK_VENDORS
  })

  // User votes: { [vendorId]: 'up' | 'down' }
  const [userVotes, setUserVotes] = useState(() => loadJSON(STORAGE_KEY_VOTES, {}))

  // User tag selections: { [vendorId]: { [tagId]: true } }
  const [userTags, setUserTags] = useState(() => loadJSON(STORAGE_KEY_TAGS, {}))

  // User payment selections: { [vendorId]: { [paymentId]: true } }
  const [userPayments, setUserPayments] = useState(() => loadJSON(STORAGE_KEY_PAYMENTS, {}))

  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [sortBy, setSortBy] = useState('score') // 'score' | 'name'
  const [categoryFilter, setCategoryFilter] = useState('all') // 'all' | 'domestic' | 'international' | 'groupbuy'

  useImperativeHandle(ref, () => ({
    openSuggestModal: () => setShowSubmitModal(true),
  }))

  // Persist whenever vendors change
  useEffect(() => { saveJSON(STORAGE_KEY_DATA, vendors) }, [vendors])
  useEffect(() => { saveJSON(STORAGE_KEY_VOTES, userVotes) }, [userVotes])
  useEffect(() => { saveJSON(STORAGE_KEY_TAGS, userTags) }, [userTags])
  useEffect(() => { saveJSON(STORAGE_KEY_PAYMENTS, userPayments) }, [userPayments])

  // Vote: toggle if same, switch if different, remove if none
  const handleVote = useCallback((vendorId, direction) => {
    setUserVotes(prev => {
      const current = prev[vendorId] ?? null
      const next    = current === direction ? null : direction
      const updated = { ...prev, [vendorId]: next }

      setVendors(vs => vs.map(v => {
        if (v.id !== vendorId) return v
        let { upvotes, downvotes } = v

        // Undo current vote
        if (current === 'up')   upvotes   = Math.max(0, upvotes - 1)
        if (current === 'down') downvotes = Math.max(0, downvotes - 1)

        // Apply next vote
        if (next === 'up')   upvotes   += 1
        if (next === 'down') downvotes += 1

        return { ...touchLastVote(v), upvotes, downvotes }
      }))

      return updated
    })
  }, [])

  // Tag toggle: one selection per tag per vendor, increments/decrements aggregate
  const handleTagToggle = useCallback((vendorId, tagId) => {
    setUserTags(prev => {
      const vendorTags = prev[vendorId] || {}
      const wasSelected = !!vendorTags[tagId]
      const updatedVendorTags = { ...vendorTags, [tagId]: !wasSelected }
      const updated = { ...prev, [vendorId]: updatedVendorTags }

      setVendors(vs => vs.map(v => {
        if (v.id !== vendorId) return v
        const tagCount = v.tags[tagId] || 0
        const newCount = wasSelected ? Math.max(0, tagCount - 1) : tagCount + 1
        return touchLastVote({ ...v, tags: { ...v.tags, [tagId]: newCount } })
      }))

      return updated
    })
  }, [])

  // Payment toggle: same one-per-method rule as labels
  const handlePaymentToggle = useCallback((vendorId, paymentId) => {
    setUserPayments(prev => {
      const vendorPays = prev[vendorId] || {}
      const wasSelected = !!vendorPays[paymentId]
      const updatedVendorPays = { ...vendorPays, [paymentId]: !wasSelected }
      const updated = { ...prev, [vendorId]: updatedVendorPays }

      setVendors(vs => vs.map(v => {
        if (v.id !== vendorId) return v
        const payments = v.payments || emptyPaymentCounts()
        const payCount = payments[paymentId] || 0
        const newCount = wasSelected ? Math.max(0, payCount - 1) : payCount + 1
        return touchLastVote({ ...v, payments: { ...payments, [paymentId]: newCount } })
      }))

      return updated
    })
  }, [])

  const handleAddVendor = useCallback((name, type = 'domestic', tagIds = [], paymentIds = []) => {
    const id = `v-user-${Date.now()}`
    const tags = emptyTagCounts()
    const payments = emptyPaymentCounts()
    const validTagIds = tagIds.filter(tid => Object.prototype.hasOwnProperty.call(tags, tid))
    const validPaymentIds = paymentIds.filter(pid => Object.prototype.hasOwnProperty.call(payments, pid))
    validTagIds.forEach(tid => { tags[tid] = 1 })
    validPaymentIds.forEach(pid => { payments[pid] = 1 })

    const hasVotes = validTagIds.length > 0 || validPaymentIds.length > 0
    const newVendor = {
      id,
      name,
      type,
      upvotes: 0,
      downvotes: 0,
      tags,
      payments,
      lastVoteAt: hasVotes ? new Date().toISOString() : null,
    }
    setVendors(prev => [newVendor, ...prev])

    if (validTagIds.length) {
      setUserTags(prev => ({
        ...prev,
        [id]: Object.fromEntries(validTagIds.map(tid => [tid, true])),
      }))
    }
    if (validPaymentIds.length) {
      setUserPayments(prev => ({
        ...prev,
        [id]: Object.fromEntries(validPaymentIds.map(pid => [pid, true])),
      }))
    }
  }, [])

  const sortedVendors = [...vendors]
    .filter(v => categoryFilter === 'all' || (v.type || 'domestic') === categoryFilter)
    .sort((a, b) => {
      if (sortBy === 'score') return netScore(b) - netScore(a)
      return a.name.localeCompare(b.name)
    })

  const cardBg = theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)'
  const mutedBorder = theme.isDark ? 'rgba(82,82,91,0.35)' : 'rgba(161,161,170,0.25)'

  const SORT_OPTS = [
    { key: 'score', label: 'Top Rated' },
    { key: 'name',  label: 'A–Z' },
  ]
  const CATEGORY_OPTS = [
    { key: 'all',           label: 'All' },
    { key: 'domestic',      label: 'Domestic' },
    { key: 'international', label: 'Intl' },
    { key: 'groupbuy',      label: 'Group Buy' },
  ]
  const catIndex = Math.max(0, CATEGORY_OPTS.findIndex(o => o.key === categoryFilter))
  const sortIndex = Math.max(0, SORT_OPTS.findIndex(o => o.key === sortBy))

  return (
    <div className="pb-28">
      {/* Header banner */}
      <div
        className="rounded-xl px-4 py-3 mb-4 flex items-start gap-3"
        style={{
          background: cardBg,
          border: `1px solid ${mutedBorder}`,
        }}
      >
        <Info size={15} weight="duotone" className="mt-0.5 shrink-0" style={{ color: theme.primary }} />
        <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>
          Community-updated sources log. No sponsorships, no affiliate links, no endorsements.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-4 space-y-2.5">
        {/* Category segmented control — matches Vendors page */}
        <div
          role="group"
          aria-label="Source category"
          className="relative grid p-1 rounded-full"
          style={{
            gridTemplateColumns: `repeat(${CATEGORY_OPTS.length}, minmax(0, 1fr))`,
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(47,59,58,0.09)',
            boxShadow: theme.isDark
              ? 'inset 0 2px 4px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25)'
              : 'inset 0 2px 5px rgba(47,59,58,0.14), inset 0 1px 2px rgba(47,59,58,0.08)',
          }}
        >
          <div
            className="absolute top-1 bottom-1 left-1 rounded-full pointer-events-none"
            style={{
              width: `calc((100% - 8px) / ${CATEGORY_OPTS.length})`,
              transform: `translateX(calc(${catIndex} * 100%))`,
              transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
              backgroundColor: theme.primary || '#7F9E95',
              boxShadow: theme.isDark
                ? `0 3px 10px ${theme.primary}66`
                : `0 3px 10px ${theme.primary}44`,
            }}
            aria-hidden="true"
          />
          {CATEGORY_OPTS.map(opt => {
            const active = categoryFilter === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setCategoryFilter(opt.key)}
                aria-pressed={active}
                className="relative z-[1] py-2 px-0.5 rounded-full text-[11px] sm:text-xs font-semibold leading-tight touch-manipulation"
                style={{
                  color: active ? (theme.textOnPrimary || '#fff') : theme.textLight,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Sort + Suggest */}
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Sort sources"
            className="relative grid p-0.5 rounded-full flex-1 max-w-[220px]"
            style={{
              gridTemplateColumns: `repeat(${SORT_OPTS.length}, minmax(0, 1fr))`,
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.07)',
            }}
          >
            <div
              className="absolute top-0.5 bottom-0.5 left-0.5 rounded-full pointer-events-none"
              style={{
                width: `calc((100% - 4px) / ${SORT_OPTS.length})`,
                transform: `translateX(calc(${sortIndex} * 100%))`,
                transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
                backgroundColor: theme.cardBackground,
                border: `1px solid ${theme.border}`,
                boxShadow: theme.isDark ? 'none' : '0 1px 3px rgba(47,59,58,0.08)',
              }}
              aria-hidden="true"
            />
            {SORT_OPTS.map(opt => {
              const active = sortBy === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSortBy(opt.key)}
                  aria-pressed={active}
                  className="relative z-[1] py-1.5 px-2 rounded-full text-[11px] font-semibold touch-manipulation"
                  style={{
                    color: active ? theme.text : theme.textLight,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-1.5 ml-auto text-xs px-3 py-2 rounded-full font-semibold touch-manipulation shrink-0"
            style={{
              backgroundColor: theme.primary,
              color: theme.textOnPrimary || '#fff',
              WebkitTapHighlightColor: 'transparent',
              boxShadow: theme.isDark
                ? `0 2px 8px ${theme.primary}55`
                : `0 2px 8px ${theme.primary}40`,
            }}
          >
            <Plus size={13} weight="bold" />
            Suggest
          </button>
        </div>
      </div>

      {/* Vendor list */}
      <div className="flex flex-col gap-3">
        {sortedVendors.length === 0 ? (
          <div
            className="rounded-xl p-8 flex flex-col items-center gap-3 text-center"
            style={{ background: cardBg, border: `1px solid ${mutedBorder}` }}
          >
            <Storefront size={32} weight="duotone" style={{ color: theme.textLight, opacity: 0.4 }} />
            <p className="text-sm font-medium" style={{ color: theme.textLight }}>
              No vendors submitted yet
            </p>
            <p className="text-xs" style={{ color: theme.textLight, opacity: 0.7 }}>
              Be the first to suggest a vendor for community review.
            </p>
          </div>
        ) : (
          sortedVendors.map(vendor => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              userVote={userVotes[vendor.id] ?? null}
              userTags={userTags[vendor.id] ?? {}}
              userPayments={userPayments[vendor.id] ?? {}}
              onVote={handleVote}
              onTagToggle={handleTagToggle}
              onPaymentToggle={handlePaymentToggle}
              theme={theme}
            />
          ))
        )}
      </div>

      {/* Submit modal */}
      <SubmitVendorSheet
        open={showSubmitModal}
        theme={theme}
        onClose={() => setShowSubmitModal(false)}
        onSubmit={handleAddVendor}
      />
    </div>
  )
})

export default SupplyIndex
