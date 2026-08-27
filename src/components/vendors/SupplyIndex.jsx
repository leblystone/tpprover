import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import {
  ArrowFatUp,
  ArrowFatDown,
  Plus,
  Package,
  Storefront,
  Globe,
  Users,
  Info,
  EyeSlash,
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
  Browser,
  CircleNotch,
  HandFist,
} from '@phosphor-icons/react'
import { SiZelle, SiCashapp, SiVenmo } from 'react-icons/si'
import { FaPaypal, FaAlipay } from 'react-icons/fa'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../config/firebase'
import BottomSheet from '../common/BottomSheet'
import TextInput from '../common/inputs/TextInput'
import { AnimatePresence, motion } from 'framer-motion'
import { executeRecaptcha } from '../../utils/recaptcha'
import { openExternalUrl } from '../../utils/platform'
import { DEV_TEST_UID } from '../../utils/devSubscriptionOverride'
import { DEV_COMMUNITY_EMAIL } from '../../utils/devSeedCommunities'

const DISCOVER_WEB_ORIGIN = 'https://thepepplanner.app'

const WEBSITE_RE = /^https?:\/\/.+/i

function normalizeWebsiteInput(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return WEBSITE_RE.test(withProtocol) ? withProtocol : ''
}

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { type, message } }))
}

const TITLE_CASE_SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'via', 'with'])

/** Title-case vendor names for display (keeps small words lowercase mid-phrase). */
function formatVendorName(name) {
  const raw = String(name || '').trim().replace(/\s+/g, ' ')
  if (!raw) return ''
  return raw
    .split(' ')
    .map((word, i) => {
      const lower = word.toLowerCase()
      if (i > 0 && TITLE_CASE_SMALL.has(lower)) return lower
      // Preserve all-caps brands (GLP, USA) and mixed like "PGB"
      if (/^[A-Z0-9]{2,}$/.test(word) && word === word.toUpperCase()) return word
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

const VenmoIcon = ({ size = 14, style, className }) => (
  <SiVenmo size={size} style={style} className={className} />
)

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESET_TAGS = [
  // Matches VendorCard GOOD / BAD / neutral chip groups
  { id: 'reliable',       label: 'Reliable',        short: 'Reliable',  type: 'positive', Icon: CheckCircle },
  { id: 'vetted',         label: 'Vetted',          short: 'Vetted',    type: 'positive', Icon: SealCheck },
  { id: 'fast_shipping',  label: 'Fast Shipping',   short: 'Fast Ship', type: 'positive', Icon: Rabbit },
  { id: 'overfill',       label: 'Overfill',        short: 'Overfill',  type: 'positive', Icon: StackPlus },
  { id: 'glp1',           label: 'GLP1',            short: 'GLP1',      type: 'neutral',  Icon: Flask },
  { id: 'aminos',         label: 'Aminos',          short: 'Aminos',    type: 'neutral',  Icon: Pill },
  { id: 'oils',           label: 'Oils',            short: 'Oils',      type: 'neutral',  Icon: Wine },
  { id: 'pricey',         label: 'Pricey',          short: 'Pricey',    type: 'neutral',  Icon: TrendUp },
  { id: 'reshipper',      label: 'Reshipper',       short: 'Reship',    type: 'positive', Icon: Boat },
  { id: 'slow_shipping',  label: 'Slow Shipping',   short: 'Slow Ship', type: 'neutral',  Icon: HourglassHigh },
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

function mapFirestoreVendor(docSnap) {
  const data = docSnap.data() || {}
  const lastVoteAt = data.lastVoteAt?.toDate?.()
    ? data.lastVoteAt.toDate().toISOString()
    : (typeof data.lastVoteAt === 'string' ? data.lastVoteAt : null)
  return {
    ...data,
    id: docSnap.id,
    lastVoteAt,
    tags: { ...emptyTagCounts(), ...(data.tags || {}) },
    payments: { ...emptyPaymentCounts(), ...(data.payments || {}) },
  }
}

// Matches Vendors page categories + Supplies (Discover)
const CATEGORY_META = {
  domestic:      { label: 'Domestic',      Icon: Storefront },
  international: { label: 'International', Icon: Globe },
  groupbuy:      { label: 'Group Buy',     Icon: Users },
  supplies:      { label: 'Supplies',      Icon: Package },
}

// Dev-only mock catalogue — NEVER shown to live users (Discover is public-facing).
const INITIAL_MOCK_VENDORS = [
  {
    id: 'v-1',
    isSeed: true,
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
    isSeed: true,
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
    isSeed: true,
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
    isSeed: true,
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
    isSeed: true,
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

const SEED_VENDOR_IDS = new Set(INITIAL_MOCK_VENDORS.map(v => v.id))

/** Seeds only for local DEV or the primary test account — never live users. */
function canShowSupplyIndexSeeds() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) return true
  try {
    const raw = localStorage.getItem('tpprover_user')
    if (!raw) return false
    const user = JSON.parse(raw)
    const uid = user?.uid || user?.id || ''
    const email = String(user?.email || '').toLowerCase()
    return uid === DEV_TEST_UID || email === DEV_COMMUNITY_EMAIL
  } catch {
    return false
  }
}

const STORAGE_KEY_VOTES     = 'tpp_si_votes_v4'
const STORAGE_KEY_TAGS      = 'tpp_si_tags_v4'
const STORAGE_KEY_PAYMENTS  = 'tpp_si_payments_v4'
const STORAGE_KEY_DEV_LOCAL = 'tpp_si_dev_local_v1'
const STORAGE_KEY_VIEW_MODE = 'tpp_si_view_mode_v1'

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
  const idleBg = theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
  const idleBorder = theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const idleColor = theme.isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)'

  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-pressed={isSelected}
      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg touch-manipulation active:scale-95 min-w-0"
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
      <Icon size={20} className="shrink-0" style={{ color: isSelected ? '#fff' : 'inherit' }} />
      <span className="text-sm font-semibold leading-tight truncate text-center">
        {label}
      </span>
      {typeof count === 'number' && (
        <span
          className="text-[10px] tabular-nums font-bold shrink-0 rounded-full px-1.5 py-0.5 leading-none"
          aria-label={`${count} votes`}
          title={`${count} votes`}
          style={{
            color: isSelected ? '#fff' : theme.textLight,
            background: isSelected
              ? 'rgba(255,255,255,0.22)'
              : (theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(47,59,58,0.1)'),
          }}
        >
          ×{count}
        </span>
      )}
    </button>
  )
}

function VoteRail({ userVote, score, positive, scoreColor, onVote, vendorId, theme }) {
  const idle = theme.isDark ? '#71717a' : '#a1a1aa'
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 shrink-0 self-center">
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

function VendorCard({ vendor, userVote, userTags, userPayments, onVote, onTagToggle, onPaymentToggle, onDeepDive, deepDiveBusy, theme }) {
  const [contributeOpen, setContributeOpen] = useState(false)
  const [panelTab, setPanelTab] = useState('labels') // 'labels' | 'payments'
  const score    = netScore(vendor)
  const positive = score >= 0
  const category = CATEGORY_META[vendor.type] || CATEGORY_META.domestic
  const CategoryIcon = category.Icon
  const payments = vendor.payments || emptyPaymentCounts()
  const logoSrc = vendor.logoUrl || vendor.logoFallback || ''
  const topLabels = PRESET_TAGS
    .map(t => {
      const aggregate = vendor.tags?.[t.id] || 0
      // Always surface labels the user just voted for, even if aggregate was stale
      const count = aggregate > 0 ? aggregate : (userTags?.[t.id] ? 1 : 0)
      return { ...t, count }
    })
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)

  const scoreColor = positive
    ? (theme.isDark ? '#6ee7b7' : '#059669')
    : (theme.isDark ? '#fdba74' : '#d97706')

  const divider = theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.08)'

  // Match VendorCard.jsx chip colors exactly
  const labelAccent = (type) => {
    if (theme.isDark) {
      if (type === 'positive') {
        return { bg: 'rgba(60, 78, 58, 0.4)', border: 'rgba(60, 78, 58, 0.55)', color: '#dcfce7' }
      }
      if (type === 'negative') {
        return { bg: 'rgba(109, 43, 44, 0.4)', border: 'rgba(109, 43, 44, 0.55)', color: '#fee2e2' }
      }
      return { bg: 'rgba(68, 104, 121, 0.4)', border: 'rgba(68, 104, 121, 0.55)', color: '#dbeafe' }
    }
    if (type === 'positive') {
      return { bg: 'rgba(96, 124, 92, 0.15)', border: 'rgba(96, 124, 92, 0.28)', color: '#3c4e3a' }
    }
    if (type === 'negative') {
      return { bg: 'rgba(161, 77, 77, 0.15)', border: 'rgba(161, 77, 77, 0.28)', color: '#6D2B2C' }
    }
    return { bg: 'rgba(173, 195, 209, 0.2)', border: 'rgba(173, 195, 209, 0.45)', color: '#1e3a5f' }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: theme.cardBackground,
        border: `1px solid ${theme.border}`,
      }}
    >
      {/* Row 1: full-width logo banner */}
      <div
        className="w-full h-28 flex items-center justify-center"
        style={{
          background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          borderBottom: `1px solid ${divider}`,
        }}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt=""
            className="max-h-[88px] max-w-[85%] w-auto object-contain"
            onError={(e) => {
              if (vendor.logoFallback && e.currentTarget.src !== vendor.logoFallback) {
                e.currentTarget.src = vendor.logoFallback
              } else {
                e.currentTarget.style.display = 'none'
              }
            }}
          />
        ) : (
          <CategoryIcon size={40} weight="duotone" style={{ color: theme.primary, opacity: 0.7 }} />
        )}
      </div>

      {/* Row 2: vote + name / details */}
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
              <p className="font-semibold text-lg leading-tight truncate" style={{ color: theme.text }}>
                {formatVendorName(vendor.name)}
              </p>
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

          {topLabels.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              {topLabels.map(tag => {
                const Icon = tag.Icon
                const accent = labelAccent(tag.type)
                return (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg font-semibold"
                    title={tag.label}
                    style={{
                      color: accent.color,
                      background: accent.bg,
                      border: `1px solid ${accent.border}`,
                    }}
                  >
                    <Icon size={18} weight="duotone" className="shrink-0" />
                    <span className="leading-none">{tag.short || tag.label}</span>
                    <span
                      className="tabular-nums leading-none text-[10px] font-bold rounded-full px-1.5 py-0.5"
                      aria-label={`${tag.count} votes`}
                      style={{
                        color: accent.color,
                        background: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)',
                      }}
                    >
                      ×{tag.count}
                    </span>
                  </span>
                )
              })}
            </div>
          )}

          {/* Vote + Deep Dive — no contact sheet in-app */}
          <div className="mt-2.5" style={{ borderTop: `1px solid ${divider}` }}>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setContributeOpen(v => !v)}
                aria-expanded={contributeOpen}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[12px] font-semibold touch-manipulation transition-opacity active:opacity-90"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  background: contributeOpen
                    ? (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(47,59,58,0.08)')
                    : theme.primary,
                  color: contributeOpen ? theme.text : '#fff',
                  border: contributeOpen ? `1px solid ${theme.border}` : '1px solid transparent',
                  boxShadow: contributeOpen
                    ? 'none'
                    : (theme.isDark ? '0 2px 10px rgba(0,0,0,0.35)' : '0 2px 10px rgba(47,59,58,0.18)'),
                }}
              >
                <HandFist size={16} weight="duotone" />
                <span>{contributeOpen ? 'Hide votes' : 'Your Vote'}</span>
              </button>

              <button
                type="button"
                onClick={() => onDeepDive?.(vendor)}
                disabled={!!deepDiveBusy}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[12px] font-semibold touch-manipulation transition-opacity active:opacity-90 disabled:opacity-50"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.06)',
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                title="Open website details on the Discover web page"
              >
                {deepDiveBusy ? (
                  <CircleNotch size={18} className="animate-spin" />
                ) : (
                  <Browser size={18} weight="duotone" style={{ color: theme.primary }} />
                )}
                <span>Discover More</span>
              </button>
            </div>

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
                      <div className="grid grid-cols-2 gap-2">
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
                      <div className="grid grid-cols-2 gap-2">
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

function SubmitVendorSheet({ open, theme, onClose, onSubmit, devMode = false }) {
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [type, setType] = useState('domestic')
  const [selectedTags, setSelectedTags] = useState({})
  const [selectedPayments, setSelectedPayments] = useState({})
  const [metaTab, setMetaTab] = useState('labels') // 'labels' | 'payments'
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setName('')
      setWebsite('')
      setType('domestic')
      setSelectedTags({})
      setSelectedPayments({})
      setMetaTab('labels')
      setSubmitting(false)
      setError('')
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

  const websiteNormalized = normalizeWebsiteInput(website)
  const canSubmit = !!name.trim() && !!websiteNormalized && !submitting

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !websiteNormalized || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(trimmed, type, Object.keys(selectedTags), Object.keys(selectedPayments), websiteNormalized)
      onClose()
    } catch (err) {
      const msg = err?.message || 'Could not submit. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={devMode ? 'DEV Suggest (local only)' : 'Suggest a Source'}
      theme={theme}
      fitContent
      footer={
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 touch-manipulation inline-flex items-center justify-center gap-2"
          style={{
            background: devMode ? '#b45309' : theme.primary,
            color: theme.textOnPrimary || '#fff',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {submitting ? <CircleNotch size={16} className="animate-spin" /> : null}
          {submitting ? 'Submitting…' : (devMode ? 'Save Locally (DEV)' : 'Submit Anonymously')}
        </button>
      }
    >
      <div
        className="flex items-start gap-2 mb-4 text-xs leading-relaxed px-3 py-2 rounded-xl"
        style={{
          background: theme.isDark ? `${theme.primary}20` : `${theme.primary}12`,
          border: `1px solid ${theme.isDark ? `${theme.primary}40` : `${theme.primary}28`}`,
          color: theme.textLight,
        }}
      >
        <EyeSlash size={15} weight="duotone" className="shrink-0 mt-0.5" style={{ color: devMode ? '#b45309' : theme.primary }} />
        <span>
          {devMode
            ? 'DEV mode: stays on this device only. Not sent to Firestore or other users.'
            : 'Fully anonymous. Website URL required (Discord invite links OK). Reviewed before it appears — no sponsorships, no affiliate links.'}
        </span>
      </div>

      {error && (
        <div
          className="mb-3 text-xs px-3 py-2 rounded-xl"
          style={{
            background: theme.isDark ? 'rgba(251,146,60,0.12)' : 'rgba(217,119,6,0.1)',
            color: theme.isDark ? '#fdba74' : '#b45309',
            border: `1px solid ${theme.isDark ? 'rgba(251,146,60,0.3)' : 'rgba(217,119,6,0.25)'}`,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextInput
          label="Source Name"
          value={name}
          onChange={setName}
          placeholder="e.g. Peptide Sciences"
          theme={theme}
          outlined
          maxLength={80}
          autoFocus={open}
          customTextColor={theme.isDark ? null : '#181A18'}
        />

        <TextInput
          label="Website URL"
          value={website}
          onChange={setWebsite}
          placeholder="https://example.com or discord.gg/invite"
          theme={theme}
          outlined
          maxLength={300}
          customTextColor={theme.isDark ? null : '#181A18'}
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const Icon = meta.Icon
            const selected = type === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-xs font-medium touch-manipulation"
                style={{
                  background: selected
                    ? (theme.isDark ? `${theme.primary}25` : `${theme.primary}18`)
                    : 'transparent',
                  border: `1px solid ${selected ? `${theme.primary}50` : theme.border}`,
                  color: selected ? theme.primary : theme.textLight,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Icon size={22} weight="duotone" />
                {meta.label}
              </button>
            )
          })}
        </div>

        <div>
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
              const active = metaTab === tab.key
              const count = tab.key === 'labels'
                ? Object.keys(selectedTags).length
                : Object.keys(selectedPayments).length
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setMetaTab(tab.key)}
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
                  {count > 0 ? ` (${count})` : ''}
                </button>
              )
            })}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={metaTab}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              {metaTab === 'labels' ? (
                <div className="grid grid-cols-2 gap-2">
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
              ) : (
                <div className="grid grid-cols-2 gap-2">
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
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </form>
    </BottomSheet>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SupplyIndex = forwardRef(function SupplyIndex({ theme }, ref) {
  const [cloudVendors, setCloudVendors] = useState([])
  const [cloudReady, setCloudReady] = useState(false)
  const [vendors, setVendors] = useState(() => (canShowSupplyIndexSeeds() ? INITIAL_MOCK_VENDORS : []))

  const [userVotes, setUserVotes] = useState(() => {
    const raw = loadJSON(STORAGE_KEY_VOTES, {})
    if (canShowSupplyIndexSeeds()) return raw
    const cleaned = { ...raw }
    SEED_VENDOR_IDS.forEach(id => { delete cleaned[id] })
    return cleaned
  })

  const [userTags, setUserTags] = useState(() => {
    const raw = loadJSON(STORAGE_KEY_TAGS, {})
    if (canShowSupplyIndexSeeds()) return raw
    const cleaned = { ...raw }
    SEED_VENDOR_IDS.forEach(id => { delete cleaned[id] })
    return cleaned
  })

  const [userPayments, setUserPayments] = useState(() => {
    const raw = loadJSON(STORAGE_KEY_PAYMENTS, {})
    if (canShowSupplyIndexSeeds()) return raw
    const cleaned = { ...raw }
    SEED_VENDOR_IDS.forEach(id => { delete cleaned[id] })
    return cleaned
  })

  const isDevDiscover = canShowSupplyIndexSeeds()
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitMode, setSubmitMode] = useState('live') // 'live' | 'dev'
  const [viewMode, setViewMode] = useState(() => {
    if (!canShowSupplyIndexSeeds()) return 'live'
    const saved = loadJSON(STORAGE_KEY_VIEW_MODE, 'live')
    return saved === 'dev' ? 'dev' : 'live'
  })
  const [localDevVendors, setLocalDevVendors] = useState(() => {
    if (!canShowSupplyIndexSeeds()) return []
    const saved = loadJSON(STORAGE_KEY_DEV_LOCAL, [])
    return Array.isArray(saved) ? saved : []
  })
  const [openingWeb, setOpeningWeb] = useState(false)
  const [deepDiveVendorId, setDeepDiveVendorId] = useState(null)
  const [sortBy, setSortBy] = useState('score')
  const [categoryFilter, setCategoryFilter] = useState('domestic')

  useImperativeHandle(ref, () => ({
    openSuggestModal: () => {
      setSubmitMode(isDevDiscover && viewMode === 'dev' ? 'dev' : 'live')
      setShowSubmitModal(true)
    },
  }))

  useEffect(() => {
    const q = query(collection(db, 'community_vendors'), where('status', '==', 'approved'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCloudVendors(snap.docs.map(mapFirestoreVendor))
        setCloudReady(true)
      },
      (err) => {
        // Rules/functions not deployed yet, or signed-out — fall back to seeds/local DEV data.
        console.warn('Discover Firestore listener failed:', err?.code || err?.message || err)
        setCloudVendors([])
        setCloudReady(true)
      }
    )
    return unsub
  }, [])

  useEffect(() => {
    const allowSeeds = canShowSupplyIndexSeeds()
    const cloudIds = new Set(cloudVendors.map(v => v.id))
    const localById = Object.fromEntries(localDevVendors.map(v => [v.id, v]))

    // Live view: approved Firestore vendors only (what real users see)
    if (!allowSeeds || viewMode === 'live') {
      setVendors(cloudVendors)
      return
    }

    // DEV view: seeds + local-only suggestions (no live cloud mix)
    const seedList = INITIAL_MOCK_VENDORS
    const seedsMerged = seedList.map(v => {
      const overlay = localById[v.id]
      if (!overlay) return v
      return {
        ...v,
        ...overlay,
        id: v.id,
        isSeed: true,
        tags: { ...emptyTagCounts(), ...(v.tags || {}), ...(overlay.tags || {}) },
        payments: { ...emptyPaymentCounts(), ...(v.payments || {}), ...(overlay.payments || {}) },
      }
    })

    const localOnly = localDevVendors.filter(v => !cloudIds.has(v.id) && !SEED_VENDOR_IDS.has(v.id))
    setVendors([...seedsMerged, ...localOnly])
  }, [cloudVendors, localDevVendors, viewMode])

  useEffect(() => { saveJSON(STORAGE_KEY_VOTES, userVotes) }, [userVotes])
  useEffect(() => { saveJSON(STORAGE_KEY_TAGS, userTags) }, [userTags])
  useEffect(() => { saveJSON(STORAGE_KEY_PAYMENTS, userPayments) }, [userPayments])
  useEffect(() => {
    if (!isDevDiscover) return
    saveJSON(STORAGE_KEY_DEV_LOCAL, localDevVendors)
  }, [localDevVendors, isDevDiscover])
  useEffect(() => {
    if (!isDevDiscover) return
    saveJSON(STORAGE_KEY_VIEW_MODE, viewMode)
  }, [viewMode, isDevDiscover])

  const isCloudVendor = useCallback((vendorId) => {
    return cloudVendors.some(v => v.id === vendorId)
  }, [cloudVendors])

  /** Persist non-cloud vote/label changes into localDevVendors so the merge effect keeps them. */
  const patchNonCloudVendor = useCallback((vendorId, updater) => {
    setLocalDevVendors(prev => {
      const existing = prev.find(v => v.id === vendorId)
      const fromList = vendors.find(v => v.id === vendorId)
      const seed = INITIAL_MOCK_VENDORS.find(v => v.id === vendorId)
      const base = existing || fromList || seed
      if (!base) return prev
      const normalized = {
        ...base,
        tags: { ...emptyTagCounts(), ...(base.tags || {}) },
        payments: { ...emptyPaymentCounts(), ...(base.payments || {}) },
      }
      const next = updater(normalized)
      if (existing) return prev.map(v => (v.id === vendorId ? next : v))
      return [...prev, { ...next, isDevLocal: true }]
    })
  }, [vendors])

  const handleVote = useCallback((vendorId, direction) => {
    setUserVotes(prev => {
      const current = prev[vendorId] ?? null
      const next = current === direction ? null : direction
      const updated = { ...prev, [vendorId]: next }
      if (!isCloudVendor(vendorId)) {
        patchNonCloudVendor(vendorId, (v) => {
          let { upvotes, downvotes } = v
          if (current === 'up') upvotes = Math.max(0, upvotes - 1)
          if (current === 'down') downvotes = Math.max(0, downvotes - 1)
          if (next === 'up') upvotes += 1
          if (next === 'down') downvotes += 1
          return { ...touchLastVote(v), upvotes, downvotes }
        })
      }
      return updated
    })

    if (isCloudVendor(vendorId)) {
      const current = userVotes[vendorId] ?? null
      const next = current === direction ? null : direction
      httpsCallable(functions, 'discoverApi')({ action: 'voteOnDiscoverVendor', vendorId, direction: next })
        .catch((err) => {
          console.warn('voteOnDiscoverVendor failed', err)
          toast('error', 'Could not save vote')
        })
    }
  }, [isCloudVendor, patchNonCloudVendor, userVotes])

  const handleTagToggle = useCallback((vendorId, tagId) => {
    setUserTags(prev => {
      const vendorTags = prev[vendorId] || {}
      const wasSelected = !!vendorTags[tagId]
      const updatedVendorTags = { ...vendorTags, [tagId]: !wasSelected }
      const updated = { ...prev, [vendorId]: updatedVendorTags }
      if (!isCloudVendor(vendorId)) {
        patchNonCloudVendor(vendorId, (v) => {
          const tags = { ...emptyTagCounts(), ...(v.tags || {}) }
          const tagCount = tags[tagId] || 0
          tags[tagId] = wasSelected ? Math.max(0, tagCount - 1) : tagCount + 1
          return touchLastVote({ ...v, tags })
        })
      }
      return updated
    })

    if (isCloudVendor(vendorId)) {
      const wasSelected = !!(userTags[vendorId] || {})[tagId]
      httpsCallable(functions, 'discoverApi')({
        action: 'toggleDiscoverVendorMeta',
        vendorId, kind: 'tag', metaId: tagId, selected: !wasSelected,
      }).catch((err) => {
        console.warn('toggleDiscoverVendorMeta failed', err)
        toast('error', 'Could not save label')
      })
    }
  }, [isCloudVendor, patchNonCloudVendor, userTags])

  const handlePaymentToggle = useCallback((vendorId, paymentId) => {
    setUserPayments(prev => {
      const vendorPays = prev[vendorId] || {}
      const wasSelected = !!vendorPays[paymentId]
      const updatedVendorPays = { ...vendorPays, [paymentId]: !wasSelected }
      const updated = { ...prev, [vendorId]: updatedVendorPays }
      if (!isCloudVendor(vendorId)) {
        patchNonCloudVendor(vendorId, (v) => {
          const payments = { ...emptyPaymentCounts(), ...(v.payments || {}) }
          const payCount = payments[paymentId] || 0
          payments[paymentId] = wasSelected ? Math.max(0, payCount - 1) : payCount + 1
          return touchLastVote({ ...v, payments })
        })
      }
      return updated
    })

    if (isCloudVendor(vendorId)) {
      const wasSelected = !!(userPayments[vendorId] || {})[paymentId]
      httpsCallable(functions, 'discoverApi')({
        action: 'toggleDiscoverVendorMeta',
        vendorId, kind: 'payment', metaId: paymentId, selected: !wasSelected,
      }).catch((err) => {
        console.warn('toggleDiscoverVendorMeta failed', err)
        toast('error', 'Could not save payment')
      })
    }
  }, [isCloudVendor, patchNonCloudVendor, userPayments])

  const handleAddVendor = useCallback(async (name, type = 'domestic', tagIds = [], paymentIds = [], website = '') => {
    const displayName = formatVendorName(name)
    if (submitMode === 'dev') {
      const id = `v-dev-${Date.now()}`
      const tags = emptyTagCounts()
      const payments = emptyPaymentCounts()
      tagIds.filter(tid => Object.prototype.hasOwnProperty.call(tags, tid)).forEach(tid => { tags[tid] = 1 })
      paymentIds.filter(pid => Object.prototype.hasOwnProperty.call(payments, pid)).forEach(pid => { payments[pid] = 1 })
      const domain = (() => {
        try { return new URL(website).hostname.replace(/^www\./i, '') } catch { return '' }
      })()
      const logoFallback = domain
        ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`
        : ''
      const newVendor = {
        id,
        isSeed: true,
        isDevLocal: true,
        name: displayName,
        type,
        website,
        domain,
        logoUrl: logoFallback,
        logoFallback,
        tags,
        payments,
        upvotes: 0,
        downvotes: 0,
        lastVoteAt: (tagIds.length || paymentIds.length) ? new Date().toISOString() : null,
        status: 'approved',
      }
      setLocalDevVendors(prev => [newVendor, ...prev])
      if (tagIds.length) {
        setUserTags(prev => ({
          ...prev,
          [id]: Object.fromEntries(tagIds.map(tid => [tid, true])),
        }))
      }
      if (paymentIds.length) {
        setUserPayments(prev => ({
          ...prev,
          [id]: Object.fromEntries(paymentIds.map(pid => [pid, true])),
        }))
      }
      toast('success', 'DEV only — saved locally, not shared')
      return
    }

    let recaptchaToken = null
    try {
      recaptchaToken = await executeRecaptcha('suggest_vendor')
    } catch (recaptchaError) {
      console.warn('reCAPTCHA failed for suggest_vendor', recaptchaError)
    }

    try {
      const submit = httpsCallable(functions, 'discoverApi')
      await submit({ action: 'submitVendorSuggestion', name: displayName, type, website, tagIds, paymentIds, recaptchaToken })
      toast('success', 'Submitted for review — thanks!')
    } catch (err) {
      const code = err?.code || ''
      const msg = err?.message || 'Submission failed'
      if (code.includes('resource-exhausted') || /daily limit/i.test(msg)) {
        throw new Error('Daily suggestion limit reached. Try again tomorrow.')
      }
      throw new Error(msg.replace(/^Firebase:\s*/i, '').replace(/\s*\([^)]*\)\.?\s*$/, '').trim() || msg)
    }
  }, [submitMode])

  const handleOpenOnWeb = useCallback(async (vendor = null) => {
    if (openingWeb) return
    setOpeningWeb(true)
    if (vendor?.id) setDeepDiveVendorId(vendor.id)
    try {
      const generate = httpsCallable(functions, 'discoverApi')
      const { data } = await generate({ action: 'generateDiscoverToken' })
      const path = data?.urlPath || (data?.token ? `/discover?token=${data.token}` : null)
      if (!path) throw new Error('No token returned')
      const url = new URL(`${DISCOVER_WEB_ORIGIN}${path}`)
      if (vendor?.id) url.searchParams.set('vendor', vendor.id)
      if (vendor?.type) url.searchParams.set('type', vendor.type)
      await openExternalUrl(url.toString())
    } catch (err) {
      console.warn('generateDiscoverToken failed', err)
      toast('error', 'Could not open web Discover')
    } finally {
      setOpeningWeb(false)
      setDeepDiveVendorId(null)
    }
  }, [openingWeb])

  const sortedVendors = [...vendors]
    .filter(v => (v.type || 'domestic') === categoryFilter)
    .sort((a, b) => {
      if (sortBy === 'score') return netScore(b) - netScore(a)
      return a.name.localeCompare(b.name)
    })

  const cardBg = theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)'
  const mutedBorder = theme.isDark ? 'rgba(82,82,91,0.35)' : 'rgba(161,161,170,0.25)'

  const SORT_OPTS = [
    { key: 'score', label: 'Top Rated' },
    { key: 'name', label: 'A–Z' },
  ]
  const CATEGORY_OPTS = [
    { key: 'domestic', label: 'Domestic' },
    { key: 'international', label: 'Intl' },
    { key: 'groupbuy', label: 'Group Buy' },
    { key: 'supplies', label: 'Supplies' },
  ]
  const catIndex = Math.max(0, CATEGORY_OPTS.findIndex(o => o.key === categoryFilter))
  const sortIndex = Math.max(0, SORT_OPTS.findIndex(o => o.key === sortBy))

  return (
    <div className="pb-28">
      <div
        className="rounded-xl px-4 py-3 mb-4 flex items-center justify-center gap-3 text-center"
        style={{ background: cardBg, border: `1px solid ${mutedBorder}` }}
      >
        <Info size={15} weight="duotone" className="shrink-0" style={{ color: theme.primary }} />
        <p className="text-[10px] sm:text-xs leading-relaxed" style={{ color: theme.textLight }}>
          Community-updated sources log. No sponsorships, no affiliate links, no endorsements.
        </p>
      </div>

      <div className="mb-4 space-y-2.5">
        <div
          role="group"
          aria-label="Filter by category"
          className="relative grid p-0.5 rounded-full"
          style={{
            gridTemplateColumns: `repeat(${CATEGORY_OPTS.length}, minmax(0, 1fr))`,
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.07)',
          }}
        >
          <div
            className="absolute top-0.5 bottom-0.5 left-0.5 rounded-full pointer-events-none"
            style={{
              width: `calc((100% - 4px) / ${CATEGORY_OPTS.length})`,
              transform: `translateX(calc(${catIndex} * 100%))`,
              transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
              backgroundColor: theme.primary,
              boxShadow: theme.isDark ? 'none' : `0 1px 4px ${theme.primary}55`,
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
                className="relative z-[1] py-2 px-1 rounded-full text-[11px] font-semibold touch-manipulation"
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

          {isDevDiscover ? (
            <>
              <div
                className="inline-flex ml-auto p-0.5 rounded-full shrink-0"
                role="group"
                aria-label="Discover data source"
                style={{
                  background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  border: `1px solid ${theme.border}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('dev')}
                  aria-pressed={viewMode === 'dev'}
                  className="px-2.5 py-1.5 rounded-full text-[10px] font-bold tracking-wide touch-manipulation"
                  style={{
                    background: viewMode === 'dev' ? '#b45309' : 'transparent',
                    color: viewMode === 'dev' ? '#fff' : theme.textLight,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  title="Show local DEV seeds & suggestions only"
                >
                  DEV
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('live')}
                  aria-pressed={viewMode === 'live'}
                  className="px-2.5 py-1.5 rounded-full text-[10px] font-bold tracking-wide touch-manipulation"
                  style={{
                    background: viewMode === 'live' ? theme.primary : 'transparent',
                    color: viewMode === 'live' ? '#fff' : theme.textLight,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  title="Show live approved community vendors only"
                >
                  LIVE
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubmitMode(viewMode === 'dev' ? 'dev' : 'live')
                  setShowSubmitModal(true)
                }}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full font-semibold touch-manipulation shrink-0"
                style={{
                  backgroundColor: viewMode === 'dev' ? '#b45309' : theme.primary,
                  color: '#fff',
                  WebkitTapHighlightColor: 'transparent',
                  boxShadow: viewMode === 'dev'
                    ? '0 2px 8px rgba(180,83,9,0.35)'
                    : (theme.isDark ? `0 2px 8px ${theme.primary}55` : `0 2px 8px ${theme.primary}40`),
                }}
                title={viewMode === 'dev'
                  ? 'Local only — does not submit to the community queue'
                  : 'Live community submission (goes to admin review)'}
              >
                <Plus size={13} weight="bold" />
                {viewMode === 'dev' ? 'DEV Suggest' : 'Suggest'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = import.meta.env.DEV
                    ? `${window.location.origin}/discover?token=preview`
                    : `${DISCOVER_WEB_ORIGIN}/discover?token=preview`
                  openExternalUrl(url)
                }}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full font-semibold touch-manipulation shrink-0"
                style={{
                  backgroundColor: '#5B5FA8',
                  color: '#fff',
                  WebkitTapHighlightColor: 'transparent',
                  boxShadow: '0 2px 8px rgba(91,95,168,0.35)',
                }}
                title="Open web Discover preview (local: /discover?token=preview)"
              >
                <Browser size={13} weight="bold" />
                DEV Web
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSubmitMode('live')
                setShowSubmitModal(true)
              }}
              className="inline-flex items-center gap-1.5 ml-auto text-xs px-3 py-2 rounded-full font-semibold touch-manipulation shrink-0"
              style={{
                backgroundColor: theme.primary,
                color: theme.textOnPrimary || '#fff',
                WebkitTapHighlightColor: 'transparent',
                boxShadow: theme.isDark ? `0 2px 8px ${theme.primary}55` : `0 2px 8px ${theme.primary}40`,
              }}
            >
              <Plus size={13} weight="bold" />
              Suggest
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {!cloudReady && sortedVendors.length === 0 ? (
          <div className="py-10 flex justify-center">
            <CircleNotch size={22} className="animate-spin" style={{ color: theme.textLight }} />
          </div>
        ) : sortedVendors.length === 0 ? (
          <div
            className="rounded-xl p-8 flex flex-col items-center gap-3 text-center"
            style={{ background: cardBg, border: `1px solid ${mutedBorder}` }}
          >
            <Storefront size={32} weight="duotone" style={{ color: theme.textLight, opacity: 0.4 }} />
            <p className="text-sm font-medium" style={{ color: theme.textLight }}>
              {isDevDiscover && viewMode === 'live'
                ? 'No live approved sources yet'
                : 'No vendors submitted yet'}
            </p>
            <p className="text-xs" style={{ color: theme.textLight, opacity: 0.7 }}>
              {isDevDiscover && viewMode === 'live'
                ? 'Toggle to DEV to work with local seeds, or submit a live suggestion for admin review.'
                : 'Be the first to suggest a vendor for community review.'}
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
              onDeepDive={handleOpenOnWeb}
              deepDiveBusy={openingWeb && deepDiveVendorId === vendor.id}
              theme={theme}
            />
          ))
        )}
      </div>

      <SubmitVendorSheet
        open={showSubmitModal}
        theme={theme}
        onClose={() => setShowSubmitModal(false)}
        onSubmit={handleAddVendor}
        devMode={submitMode === 'dev'}
      />
    </div>
  )
})

export default SupplyIndex
