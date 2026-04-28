import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  BadgeCheck, Upload, CheckCircle, AlertTriangle, Loader2,
  X, Share2, ChevronLeft, Star, Pill, TrendingUp, Store,
  Package, Timer, BarChart2, AlertCircle, Gift, ChevronRight, Download,
} from 'lucide-react'
import { useAppContext } from '../../context/AppContext'
import SharedProtocolCard from '../share/SharedProtocolCard'
import SharedProgressCard from '../share/SharedProgressCard'
import SharedVendorCard from '../share/SharedVendorCard'
import logo from '../../assets/tpp_logo.png'
import { getHalfLifeInHours, formatHalfLifeTime } from '../../utils/halfLife'
import { APP_CONFIG } from '../../config/appConfig'
import { isFeatureEnabled } from '../../config/featureFlags'
// ReferralBanner (link-based) removed — sharing is visual/social-card based

const SHARE_INCENTIVE_ENABLED = isFeatureEnabled('ENABLE_SHARE_INCENTIVE')

// ─── OS Detection ─────────────────────────────────────────────────────────────

export function getDeviceOS() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'web'
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // Strip the data:...;base64, prefix — send raw base64 only
      const result = reader.result
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function callVerifyWebhook(file, os) {
  // Convert image to base64 for JSON transport
  const imageBase64 = await fileToBase64(file)

  // Attach Firebase auth token for one-per-user enforcement
  let idToken = null
  try {
    const { getAuth } = await import('firebase/auth')
    const user = getAuth().currentUser
    if (user) idToken = await user.getIdToken()
  } catch { /* non-blocking — verification still works without it */ }

  const res = await fetch(APP_CONFIG.SHARE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ image: imageBase64, mimeType: file.type, os }),
  })

  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  const data = await res.json()
  if (data.status === 'failed') {
    const err = new Error('VERIFICATION_FAILED')
    err.isVerificationFailure = true
    throw err
  }
  return data
}

// ─── Native Redemption Bridge ─────────────────────────────────────────────────

export function triggerNativePromoRedemption(code, os) {
  if (os === 'ios' && window.webkit?.messageHandlers?.storeKit) {
    window.webkit.messageHandlers.storeKit.postMessage({ action: 'presentCodeRedemptionSheet', code })
  } else if (os === 'android' && window.Android?.launchPromoIntent) {
    window.Android.launchPromoIntent(code)
  }
  console.log('[PromoCode] Native redemption triggered — OS:', os, '| Code:', code)
  window.dispatchEvent(new CustomEvent('tpp:promo-redemption', { detail: { code, os } }))
}

// ─── Inline Share Card Components (match SharedProtocolCard / Progress / Vendor) ─

function hexToRgb(hex) {
  const h = (String(hex || '#7F9E95')).replace('#', '')
  if (h.length !== 6) return '127, 158, 149'
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`
}

function ShareCardShell({ theme, title, subtitle, accent = theme.primary, Icon = null, children }) {
  const accentRgb = hexToRgb(accent)
  const card = theme.cardBackground
  const text = theme.text
  return (
    <div
      className="rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
      style={{ fontFamily: 'Poppins, sans-serif', minWidth: 300, backgroundColor: card }}
    >
      <div
        className="relative px-5 pt-5 pb-4 overflow-hidden"
        style={{
          background: `linear-gradient(145deg, rgba(${accentRgb}, 0.14) 0%, rgba(${accentRgb}, 0.04) 60%, ${card} 100%)`,
        }}
      >
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, rgba(${accentRgb}, 0.18) 0%, transparent 70%)` }}
        />
        <div className="flex items-center gap-2 mb-3">
          <img src={logo} alt="TPP" className="h-6 w-6 rounded-full shadow-sm object-cover" />
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-50" style={{ color: text }}>
            The Pep Planner
          </span>
        </div>
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-black text-2xl leading-tight tracking-tight" style={{ color: text }}>{title}</h1>
          {Icon ? (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `rgba(${accentRgb}, 0.16)`, border: `1px solid rgba(${accentRgb}, 0.28)` }}
            >
              <Icon size={14} style={{ color: accent }} />
            </div>
          ) : null}
        </div>
        {subtitle ? (
          <p className="text-[9px] font-semibold opacity-40 mt-1 tracking-wide" style={{ color: text }}>{subtitle}</p>
        ) : null}
      </div>
      <div className="px-5 pb-4">{children}</div>
      <div className="px-5 py-2.5 flex items-center justify-center" style={{ backgroundColor: 'transparent' }}>
        <p className="text-[8px] opacity-30 font-semibold" style={{ color: text }}>For Research &amp; Informational Purposes Only</p>
      </div>
    </div>
  )
}

function SharedInventoryCard({ stockpile, theme }) {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  // Aggregate by peptide name — sum total mg/g/ml (mg × quantity) per name+unit combo
  const totals = {}
  ;(stockpile || []).filter(s => !s.isMock).forEach(s => {
    const name    = (s.name || 'Unnamed').trim()
    const mgEach  = parseFloat(s.mg) || 0
    const qty     = Number(s.quantity) || 0
    const mgUnit  = s.mgUnit || 'mg'
    const key     = `${name}||${mgUnit}`
    if (!totals[key]) totals[key] = { name, total: 0, mgUnit }
    totals[key].total += mgEach * qty
  })
  const rows = Object.values(totals).sort((a, b) => a.name.localeCompare(b.name))
  const visible = rows.slice(0, 10)
  const overflow = rows.length - visible.length

  return (
    <ShareCardShell theme={theme} title="Inventory Snapshot" subtitle={today} Icon={Package}>
      {rows.length === 0 ? (
        <p className="text-xs text-center py-6 opacity-50" style={{ color: theme.text }}>No inventory items yet.</p>
      ) : (
        <div className="rounded-xl px-3 py-2" style={{ backgroundColor: `rgba(${hexToRgb(theme.primary)}, 0.07)`, border: `1px solid rgba(${hexToRgb(theme.primary)}, 0.16)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)' }}>
          {visible.map(({ name, total, mgUnit }) => {
            const isOut = total <= 0
            const isLow = !isOut && total < 1
            const display = Number.isInteger(total) ? `${total}` : parseFloat(total.toFixed(2)).toString()
            return (
              <div key={name} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: `rgba(${hexToRgb(theme.primary)}, 0.12)` }}>
                <span className="text-[10px] font-medium truncate flex-1 mr-2 opacity-70" style={{ color: theme.text }}>{name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[12px] font-black tabular-nums" style={{ color: isOut ? theme.error : isLow ? '#d97706' : theme.primary }}>
                    {isOut ? 'Out' : display}
                    {!isOut && <span className="text-[9px] font-semibold opacity-60 ml-0.5">{mgUnit}</span>}
                  </span>
                  {isOut && <AlertCircle size={10} style={{ color: theme.error }} />}
                  {isLow && <AlertCircle size={10} style={{ color: '#d97706' }} />}
                  {!isOut && !isLow && <CheckCircle size={10} style={{ color: theme.primary, opacity: 0.6 }} />}
                </div>
              </div>
            )
          })}
          {overflow > 0 && (
            <p className="text-[10px] opacity-40 text-center pt-2" style={{ color: theme.text }}>+{overflow} more items</p>
          )}
        </div>
      )}
    </ShareCardShell>
  )
}

function SharedHalfLifeCard({ protocols, theme }) {
  const peptideMap = {}
  ;(protocols || []).filter(p => p.active !== false).forEach(proto => {
    ;(proto.peptides || []).forEach(pep => {
      if (!pep.name) return
      const hl = getHalfLifeInHours(pep)
      if (hl > 0 && !peptideMap[pep.name]) peptideMap[pep.name] = hl
    })
  })
  const entries = Object.entries(peptideMap).sort((a, b) => b[1] - a[1])
  const maxHL = entries[0]?.[1] || 1
  return (
    <ShareCardShell theme={theme} title="Half-Life Reference" subtitle="Active protocol peptides" Icon={Timer}>
      {entries.length === 0 ? (
        <p className="text-xs text-center py-6 opacity-50" style={{ color: theme.text }}>No peptides with half-life data found.</p>
      ) : (
        <div className="rounded-xl px-3 py-3 space-y-3" style={{ backgroundColor: `rgba(${hexToRgb(theme.primary)}, 0.07)`, border: `1px solid rgba(${hexToRgb(theme.primary)}, 0.16)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)' }}>
          {entries.map(([name, hl]) => (
            <div key={name}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-medium opacity-65" style={{ color: theme.text }}>{name}</span>
                <span className="text-[13px] font-black tabular-nums" style={{ color: theme.primary }}>{formatHalfLifeTime(hl)}</span>
              </div>
              <div className="h-[4px] rounded-full overflow-hidden" style={{ backgroundColor: `rgba(${hexToRgb(theme.primary)}, 0.14)` }}>
                <div className="h-full rounded-full" style={{ width: `${Math.round((hl / maxHL) * 100)}%`, backgroundColor: theme.primary }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </ShareCardShell>
  )
}

function SharedAnalyticsCard({ protocols, orders, stockpile, supplements, theme }) {
  const activeProtocols = (protocols || []).filter(p => p.active !== false).length
  const totalOrders = (orders || []).length
  const deliveredOrders = (orders || []).filter(o => o.status === 'Delivered').length
  const lowStock = (stockpile || []).filter(s => !s.isMock && Number(s.quantity) <= 1).length
  const suppCount = (supplements || []).length
  let totalSpend = 0
  ;(orders || []).forEach(o => {
    if (o.items?.length) totalSpend += o.items.reduce((s, it) => s + ((parseFloat(it.price) || 0) * (parseInt(it.quantity, 10) || 1)), 0)
    else if (o.cost) totalSpend += parseFloat(String(o.cost).replace(/[^0-9.]/g, '')) || 0
  })
  const accentRgb = hexToRgb(theme.primary)
  const tileStyle = { backgroundColor: `rgba(${accentRgb}, 0.07)`, border: `1px solid rgba(${accentRgb}, 0.16)` }
  const stats = [
    { label: 'Active Protocols', value: activeProtocols, color: theme.primary },
    { label: 'Supplements',      value: suppCount,       color: theme.primary },
    { label: 'Orders',           value: `${deliveredOrders}/${totalOrders}`, color: theme.text },
    { label: 'Low Stock',        value: lowStock, color: lowStock > 0 ? theme.error : theme.primary },
    { label: 'Total Spend',      value: `$${totalSpend.toFixed(0)}`, color: theme.text, wide: true },
  ]
  return (
    <ShareCardShell theme={theme} title="Research Analytics" subtitle="My research snapshot" Icon={BarChart2}>
      <div className="grid grid-cols-2 gap-2">
        {stats.map(({ label, value, color, wide }) => (
          <div key={label} className={`p-3 rounded-xl${wide ? ' col-span-2' : ''}`} style={tileStyle}>
            <div className="text-[7.5px] font-bold uppercase tracking-[0.18em] mb-1.5" style={{ color: theme.primary, opacity: 0.6 }}>{label}</div>
            <div className="text-[22px] font-black leading-none tabular-nums" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>
    </ShareCardShell>
  )
}

// ─── Banner ───────────────────────────────────────────────────────────────────

export function ShareIncentiveBanner({ theme, onOpen, fullPage }) {
  if (!fullPage) return null
  const isDisabled = !SHARE_INCENTIVE_ENABLED
  // Match BottomNavigation "3 Months Free" expanded-menu promo tile
  const tileBg = theme.isDark
    ? 'linear-gradient(135deg, rgba(30, 36, 46, 0.6) 0%, rgba(22, 28, 38, 0.6) 100%)'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(249, 250, 251, 0.8) 100%)'
  return (
    <>
      <button
        type="button"
        onClick={() => { if (!isDisabled) onOpen?.() }}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        className={`group relative w-full flex items-center justify-between px-4 py-3.5 mb-4 rounded-2xl transition-all duration-300 touch-manipulation overflow-hidden ${isDisabled ? 'cursor-not-allowed' : 'active:scale-95'}`}
        style={{
          background: tileBg,
          border: `1px solid ${theme.primary}50`,
          WebkitTapHighlightColor: 'transparent',
          boxShadow: theme.isDark
            ? '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
          pointerEvents: isDisabled ? 'none' : 'auto',
          filter: isDisabled ? 'grayscale(1)' : 'none',
        }}
      >
        {!isDisabled && (
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${theme.primary}28 50%, transparent 100%)`,
            backgroundSize: '100% 200%',
            animation: 'tpp-share-incentive-shimmer 2.2s ease-in-out infinite',
          }}
        />
        )}
        <div
          className={`absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none ${isDisabled ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}
          style={{ background: `radial-gradient(circle at center, ${theme.primary}15 0%, transparent 70%)` }}
        />
        <div className="relative flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${isDisabled ? '' : 'group-hover:scale-110'}`} style={{ backgroundColor: `${theme.primary}20` }}>
            <Gift size={16} style={{ color: isDisabled ? theme.textLight : theme.primary }} />
          </div>
          <div className="text-left min-w-0">
            <div className="text-sm font-bold" style={{ color: isDisabled ? theme.textLight : theme.text, opacity: isDisabled ? 0.75 : 1 }}>Unlock 3 Months Free</div>
            <div className="text-[11px] leading-snug" style={{ color: theme.textLight, opacity: isDisabled ? 0.7 : 0.9 }}>
              {isDisabled ? 'Coming soon' : 'Share your results to claim your reward'}
            </div>
          </div>
        </div>
        <ChevronRight size={16} className={`relative flex-shrink-0 transition-transform ${isDisabled ? '' : 'group-hover:translate-x-0.5'}`} style={{ color: isDisabled ? theme.textLight : theme.primary, opacity: isDisabled ? 0.75 : 1 }} />
      </button>
      <style>{`
        @keyframes tpp-share-incentive-shimmer {
          0%   { background-position: 0% 100%; }
          50%  { background-position: 0% 0%;   }
          100% { background-position: 0% 100%; }
        }
      `}</style>
    </>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const SHARE_TYPES = [
  { key: 'protocol-structure', label: 'Protocol Card',     icon: Pill,       pool: 'protocol', emptyText: 'No protocols yet.' },
  { key: 'protocol-progress',  label: 'Progress Snapshot', icon: TrendingUp, pool: 'protocol', emptyText: 'No protocols yet.' },
  { key: 'vendor',             label: 'Vendor Card',       icon: Store,      pool: 'vendor',   emptyText: 'No vendors yet.'   },
  { key: 'inventory',          label: 'Inventory',         icon: Package,    pool: 'none' },
  { key: 'halflife',           label: 'Half-Life Chart',   icon: Timer,      pool: 'none' },
  { key: 'analytics',          label: 'Analytics',         icon: BarChart2,  pool: 'none' },
]

export default function ShareIncentiveModal({ open, onClose, theme, defaultShareType = 'protocol-structure' }) {
  const { protocols = [], vendors = [], stockpile = [], orders = [], supplements = [] } = useAppContext() || {}

  const [uploadState, setUploadState] = useState('idle') // 'idle'|'verifying'|'success'|'error'
  const [promoCode, setPromoCode] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [step1Phase, setStep1Phase] = useState('type') // 'type'|'pick'
  const [selectedShareType, setSelectedShareType] = useState(defaultShareType)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const fileInputRef = useRef(null)
  const cardCaptureRef = useRef(null)
  const deviceOS = getDeviceOS()

  const activeType = SHARE_TYPES.find(t => t.key === selectedShareType) || SHARE_TYPES[0]
  const items = activeType.pool === 'protocol' ? protocols : activeType.pool === 'vendor' ? vendors : []

  const fullReset = () => {
    setUploadState('idle'); setPromoCode(null); setCurrentStep(1)
    setStep1Phase('type'); setSelectedShareType(defaultShareType)
    setSelectedItem(null); setShowGuidelines(false); setIsDragging(false)
  }

  const handleClose = () => { fullReset(); onClose() }

  const resetUpload = () => {
    setUploadState('idle'); setPromoCode(null); setIsDragging(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = (file) => {
    if (!file || uploadState === 'verifying') return
    setUploadState('verifying'); setPromoCode(null)
    callVerifyWebhook(file, deviceOS)
      .then(data => { setPromoCode(data.promoCode || null); setUploadState('success') })
      .catch(err => { setUploadState('error'); if (!err.isVerificationFailure) console.error('[ShareIncentive]', err.message) })
  }

  const handleRedeem = () => { if (!promoCode) return; onClose(); triggerNativePromoRedemption(promoCode, deviceOS) }
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }

  // ── Toast helper ──────────────────────────────────────────────────────────
  const fireToast = (message, type = 'info') => {
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message, type } }))
  }

  // ── Card capture helpers ───────────────────────────────────────────────────
  const captureCardAsPng = async () => {
    const { toPng } = await import('html-to-image')
    return toPng(cardCaptureRef.current, { pixelRatio: 2, cacheBust: true })
  }

  const handleShareCard = async () => {
    if (isCapturing || !cardCaptureRef.current) return
    setIsCapturing(true)
    try {
      const dataUrl = await captureCardAsPng()
      const fileName = `tpp-card-${Date.now()}.png`
      const shareTitle = 'The Pep Planner'
      const shareText = 'Check out my research snapshot from The Pep Planner.'
      const shareUrl = typeof window !== 'undefined' ? window.location.origin : undefined

      // ① Native Capacitor Share (iOS / Android) — triggers native app chooser
      if (deviceOS === 'ios' || deviceOS === 'android') {
        const [{ Share }, { Filesystem, Directory }] = await Promise.all([
          import('@capacitor/share'),
          import('@capacitor/filesystem'),
        ])
        const base64 = dataUrl.split(',')[1]
        await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache })
        const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache })
        const result = await Share.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
          files: [uri],
          dialogTitle: 'Share your snapshot',
        })
        // Capacitor returns activityType if the user chose something, undefined if dismissed.
        if (!result?.activityType) {
          fireToast('Share cancelled.', 'info')
        }
        return
      }

      // ② Web Share API with file (Chrome mobile, Safari 15+) — triggers app chooser
      if (navigator.share) {
        try {
          let shared = false
          if (navigator.canShare) {
            const blob = await (await fetch(dataUrl)).blob()
            const file = new File([blob], fileName, { type: 'image/png' })
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ title: shareTitle, text: shareText, files: [file] })
              shared = true
            } else if (navigator.canShare({ title: shareTitle, text: shareText, url: shareUrl })) {
              await navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
              shared = true
            }
          }
          if (!shared) {
            await navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
          }
          return
        } catch (err) {
          if (err?.name === 'AbortError') {
            fireToast('Share cancelled.', 'info')
            return
          }
          // Not a user cancel — fall through to download
          console.warn('[ShareCard] Web Share failed, falling back to download:', err)
        }
      }

      // ③ Download fallback (desktop / unsupported)
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = fileName
      a.click()
      fireToast('Card saved — share it from your downloads!', 'success')
    } catch (err) {
      console.error('[ShareCard]', err)
      fireToast('Could not share the card. Please try downloading instead.', 'error')
    } finally {
      setIsCapturing(false)
    }
  }

  const handleDownloadCard = async () => {
    if (isCapturing || !cardCaptureRef.current) return
    setIsCapturing(true)
    try {
      const dataUrl = await captureCardAsPng()
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `tpp-card-${Date.now()}.png`
      a.click()
    } catch (err) {
      console.error('[DownloadCard]', err)
    } finally {
      setIsCapturing(false)
    }
  }

  const handleSelectType = (key) => { if (key === selectedShareType) return; setSelectedShareType(key); setSelectedItem(null) }

  const handleChooseType = (key) => {
    const t = SHARE_TYPES.find(x => x.key === key)
    if (!t) return
    if (t.pool === 'none') { setCurrentStep(2); return }
    setStep1Phase('pick')
  }

  const getItemName = (item) => item?.protocolName || item?.name || 'Unnamed'
  const getItemSubtitle = (item) => {
    if (!item) return ''
    if (activeType.pool === 'protocol') { const c = item.peptides?.length || 0; return `${c} peptide${c !== 1 ? 's' : ''}` }
    return item.rating ? `${item.rating}/5 rating` : 'No rating'
  }

  useEffect(() => { if (!open) return; fullReset() }, [open, defaultShareType]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const progressSteps = [{ id: 1, label: 'Create' }, { id: 2, label: 'Post' }, { id: 3, label: 'Upload' }]

  const renderPreviewCard = (item) => {
    if (selectedShareType === 'protocol-structure') return <SharedProtocolCard item={item} theme={theme} />
    if (selectedShareType === 'protocol-progress')  return <SharedProgressCard item={item} theme={theme} />
    if (selectedShareType === 'vendor')             return <SharedVendorCard vendor={item} theme={theme} />
    if (selectedShareType === 'inventory')          return <SharedInventoryCard stockpile={stockpile} theme={theme} />
    if (selectedShareType === 'halflife')           return <SharedHalfLifeCard protocols={protocols} theme={theme} />
    if (selectedShareType === 'analytics')          return <SharedAnalyticsCard protocols={protocols} orders={orders} stockpile={stockpile} supplements={supplements} theme={theme} />
    return null
  }

  // ── Card preview viewport ─────────────────────────────────────────────────
  // Renders the card at full size inside a scrollable, padded container.
  // The padding ensures the card's native shadow isn't clipped and it floats cleanly.
  const CardPreviewViewport = ({ children }) => (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: '20px',
        backgroundColor: theme.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.015)',
        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}`,
        boxShadow: theme.isDark 
          ? 'inset 0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.4)' 
          : 'inset 0 8px 32px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(0,0,0,0.03)',
      }}
    >
      {/* Top & bottom inner gradients for depth */}
      <div className="absolute top-0 left-0 right-0 h-6 z-10 pointer-events-none" 
        style={{ background: `linear-gradient(to bottom, ${theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)'}, transparent)` }} />
      <div className="absolute bottom-0 left-0 right-0 h-8 z-10 pointer-events-none" 
        style={{ background: `linear-gradient(to top, ${theme.isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.04)'}, transparent)` }} />

      <div
        style={{
          maxHeight: '310px',
          overflowY: 'auto',
          // Hide scrollbar for a cleaner modern look
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>
        <div className="px-5 py-6 flex justify-center pointer-events-none">
          {/* We wrap children in a full-width container so max-w-sm on the cards centers nicely */}
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  )

  // Pearlescent left-to-right diagonal highlight
  const PearlOverlay = () => (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 'inherit', zIndex: 10 }}>
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: 0,
        width: '38%',
        height: '130%',
        transform: 'skewX(-14deg)',
        background: `linear-gradient(
          90deg,
          transparent                  0%,
          ${theme.primary}06          20%,
          rgba(255,255,255,0.10)       38%,
          rgba(255,255,255,0.20)       50%,
          rgba(255,255,255,0.10)       62%,
          ${theme.primary}06          80%,
          transparent                  100%
        )`,
        animation: 'pearlLR 5s ease-in-out infinite',
      }} />
      <style>{`
        @keyframes pearlLR {
          0%   { left: -45%; opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { left: 115%; opacity: 0; }
        }
      `}</style>
    </div>
  )

  const modal = (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className="relative w-full max-w-[420px] mx-auto rounded-[28px] overflow-hidden"
        style={{
          backgroundColor: theme.cardBackground,
          border: `1px solid ${theme.border}`,
          boxShadow: theme.isDark
            ? '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 32px 80px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.4)',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto',
        }}
      >
        <PearlOverlay />
        {/* Header */}
        <div className="relative px-6 pt-6 pb-2">
          <button type="button" onClick={handleClose} className="absolute top-4 right-4 p-1.5 rounded-full transition-all hover:scale-110 active:scale-95"
            style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: theme.textLight }} aria-label="Close">
            <X size={16} />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
              {/* Soft outer glow */}
              <div className="absolute inset-0 rounded-full blur-[6px] opacity-20" style={{ backgroundColor: theme.primary }} />
              {/* Inner glass pill */}
              <div className="absolute inset-[3px] rounded-full flex items-center justify-center shadow-sm"
                style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.primary}30` }}>
                <BadgeCheck size={22} style={{ color: theme.primary }} />
              </div>
            </div>
            <div>
              <div className="text-xl font-black tracking-tight leading-tight" style={{ color: theme.text }}>3 Months Free</div>
              <div className="text-[12px] mt-0.5 font-medium" style={{ color: theme.textLight }}>Your data is worth 3 free months.</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">

          {/* Progress bar */}
          <div className="flex items-center justify-center mb-1">
            {progressSteps.map((step, idx) => {
              const isActive = currentStep === step.id
              const isDone = currentStep > step.id || (step.id === 3 && uploadState === 'success')
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 transition-all duration-300"
                      style={{
                        backgroundColor: isDone || isActive ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                        color: isDone || isActive ? theme.textOnPrimary : theme.textLight,
                        boxShadow: isActive ? `0 0 0 4px ${theme.primary}15` : 'none'
                      }}>
                      {isDone ? '✓' : step.id}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider transition-all duration-300 mt-0.5"
                      style={{ color: isActive ? theme.text : isDone ? theme.primary : theme.textLight, opacity: isActive || isDone ? 1 : 0.5 }}>
                      {step.label}
                    </span>
                  </div>
                  {idx < progressSteps.length - 1 && (
                    <div className="h-[2px] rounded-full mb-4 transition-all duration-300 mx-2"
                      style={{ width: '40px', backgroundColor: currentStep > step.id ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') }} />
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* STEP 1 */}
          {currentStep === 1 && (
            step1Phase === 'type' ? (() => {
              const sampleItem = items[0] || null
              const isNonePool = activeType.pool === 'none'
              const canContinue = isNonePool || items.length > 0
              return (
                <div className="space-y-3">
                  {/* Modern segmented type tiles */}
                  <div className="grid grid-cols-3 gap-[2px] p-1 rounded-[12px]" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    {SHARE_TYPES.map(({ key, label, icon: Icon }) => {
                      const isSel = selectedShareType === key
                      return (
                        <button key={key} type="button" onClick={() => handleSelectType(key)}
                          className="relative flex flex-col items-center justify-center gap-1 rounded-[10px] py-[6px] px-1 transition-all"
                          style={{
                            backgroundColor: isSel ? theme.cardBackground : 'transparent',
                            boxShadow: isSel ? (theme.isDark ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 6px rgba(0,0,0,0.06)') : 'none',
                          }}>
                          <Icon size={14} strokeWidth={isSel ? 2.5 : 2} style={{ color: isSel ? theme.primary : theme.textLight, opacity: isSel ? 1 : 0.6 }} />
                          <span className="text-[8.5px] font-bold text-center leading-none" style={{ color: isSel ? theme.text : theme.textLight, opacity: isSel ? 1 : 0.6 }}>{label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Live preview — modern scrollable viewport */}
                  {isNonePool ? (
                    <CardPreviewViewport>{renderPreviewCard(null)}</CardPreviewViewport>
                  ) : sampleItem ? (
                    <div style={{ position: 'relative' }}>
                      <CardPreviewViewport>{renderPreviewCard(sampleItem)}</CardPreviewViewport>
                      {items.length > 1 && (
                        <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded z-10"
                          style={{ backgroundColor: `${theme.primary}22`, color: theme.primary }}>Preview</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-6 rounded-xl text-xs text-center px-4"
                      style={{ color: theme.textLight, border: `1px solid ${theme.border}`, backgroundColor: theme.secondary }}>
                      {activeType.emptyText}
                    </div>
                  )}

                  {/* Share / Download row */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button type="button" onClick={handleShareCard} disabled={isCapturing || (!isNonePool && !sampleItem)}
                      className="group flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                      style={{
                        backgroundColor: `${theme.primary}12`, color: theme.primary,
                        boxShadow: `inset 0 0 0 1px ${theme.primary}20, inset 0 2px 4px ${theme.primary}15`
                      }}>
                      {isCapturing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} className="transition-transform group-hover:scale-110" />}
                      Share
                    </button>
                    <button type="button" onClick={handleDownloadCard} disabled={isCapturing || (!isNonePool && !sampleItem)}
                      className="group flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.text,
                        boxShadow: theme.isDark ? 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 0 0 1px rgba(0,0,0,0.06), inset 0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                      {isCapturing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} className="transition-transform group-hover:scale-110" />}
                      Download
                    </button>
                  </div>

                  <button type="button" onClick={() => handleChooseType(selectedShareType)} disabled={!canContinue}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
                    style={{
                      backgroundColor: theme.primary, color: theme.textOnPrimary,
                      boxShadow: canContinue ? `0 4px 14px ${theme.primary}40, inset 0 2px 4px rgba(255,255,255,0.15)` : 'none'
                    }}>
                    {isNonePool ? "I've posted this →" : `Choose specific ${activeType.pool} →`}
                  </button>
                </div>
              )
            })()
            : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <button type="button" onClick={() => { setStep1Phase('type'); setSelectedItem(null) }}
                    className="p-1.5 rounded-full transition-all hover:scale-110 active:scale-95" 
                    style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: theme.textLight }}>
                    <ChevronLeft size={16} strokeWidth={2.5} />
                  </button>
                  <p className="text-[13px] font-bold tracking-tight" style={{ color: theme.text }}>
                    Choose a {activeType.pool === 'vendor' ? 'Vendor' : 'Protocol'}
                  </p>
                </div>

                <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: '180px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {items.map(item => {
                    const isSel = selectedItem?.id === item.id
                    return (
                      <button key={item.id} type="button" onClick={() => setSelectedItem(item)}
                        className="group w-full text-left rounded-[16px] px-4 py-3 transition-all flex items-center justify-between gap-3 active:scale-[0.98]"
                        style={{
                          backgroundColor: isSel ? `${theme.primary}12` : theme.secondary,
                          border: `1px solid ${isSel ? theme.primary : theme.border}`,
                          boxShadow: isSel ? `0 4px 16px ${theme.primary}20, inset 0 2px 4px rgba(255,255,255,0.15)` : (theme.isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.02)'),
                        }}>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate transition-colors" style={{ color: isSel ? theme.primary : theme.text }}>{getItemName(item)}</div>
                          <div className="text-[10px] font-medium mt-0.5" style={{ color: theme.textLight }}>{getItemSubtitle(item)}</div>
                        </div>
                        {activeType.pool === 'vendor' && item.rating > 0 && (
                          <div className="flex items-center gap-[2px] shrink-0 mr-1">
                            {[1,2,3,4,5].map(n => <Star key={n} size={10} style={{ fill: item.rating >= n ? '#fbbf24' : 'transparent', color: item.rating >= n ? '#fbbf24' : theme.border }} />)}
                          </div>
                        )}
                        <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 transition-all"
                          style={{
                            backgroundColor: isSel ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                            boxShadow: isSel ? 'none' : `inset 0 0 0 1px ${theme.border}`,
                          }}>
                          {isSel && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.textOnPrimary }} />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {selectedItem && (
                  <CardPreviewViewport>{renderPreviewCard(selectedItem)}</CardPreviewViewport>
                )}

                {selectedItem && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button type="button" onClick={handleShareCard} disabled={isCapturing}
                      className="group flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                      style={{
                        backgroundColor: `${theme.primary}12`, color: theme.primary,
                        boxShadow: `inset 0 0 0 1px ${theme.primary}20, inset 0 2px 4px ${theme.primary}15`
                      }}>
                      {isCapturing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} className="transition-transform group-hover:scale-110" />}
                      Share
                    </button>
                    <button type="button" onClick={handleDownloadCard} disabled={isCapturing}
                      className="group flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.text,
                        boxShadow: theme.isDark ? 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 0 0 1px rgba(0,0,0,0.06), inset 0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                      {isCapturing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} className="transition-transform group-hover:scale-110" />}
                      Download
                    </button>
                  </div>
                )}

                <button type="button" onClick={() => setCurrentStep(2)} disabled={!selectedItem}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    backgroundColor: theme.primary, color: theme.textOnPrimary,
                    boxShadow: selectedItem ? `0 4px 14px ${theme.primary}40, inset 0 2px 4px rgba(255,255,255,0.15)` : 'none'
                  }}>
                  I&apos;ve posted this →
                </button>
              </div>
            )
          )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl px-3 py-3" style={{ backgroundColor: theme.secondary, border: `1px solid ${theme.border}` }}>
                <Share2 size={15} style={{ color: theme.primary }} />
                <div className="text-sm font-semibold" style={{ color: theme.text }}>Post publicly</div>
              </div>
              <button type="button" onClick={() => setShowGuidelines(v => !v)} className="text-xs underline" style={{ color: theme.primary }}>
                {showGuidelines ? 'Hide guidelines' : 'View guidelines'}
              </button>
              {showGuidelines && (
                <ul className="space-y-1 text-xs" style={{ color: theme.textLight }}>
                  <li>• Use Instagram, X, Reddit, Facebook, or similar</li>
                  <li>• Keep your post visible so verification can pass</li>
                </ul>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setCurrentStep(1)} className="flex-1 py-2.5 rounded-lg text-xs font-semibold border" style={{ borderColor: theme.border, color: theme.text }}>Back</button>
                <button type="button" onClick={() => setCurrentStep(3)} className="flex-1 py-2.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Continue</button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {currentStep === 3 && (
            <div className="space-y-3">
              {uploadState === 'idle' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg p-2 text-[11px]" style={{ backgroundColor: `${theme.primary}12`, border: `1px solid ${theme.border}` }}>
                      <div className="flex items-center gap-1.5 mb-1" style={{ color: theme.primary }}><CheckCircle size={12} /><span className="font-semibold">Good</span></div>
                      <div style={{ color: theme.textLight }}>Full post + graphic visible</div>
                    </div>
                    <div className="rounded-lg p-2 text-[11px]" style={{ backgroundColor: `${theme.error}10`, border: `1px solid ${theme.border}` }}>
                      <div className="flex items-center gap-1.5 mb-1" style={{ color: theme.error }}><AlertTriangle size={12} /><span className="font-semibold">Bad</span></div>
                      <div style={{ color: theme.textLight }}>Cropped, blurry, or hidden post</div>
                    </div>
                  </div>
                  <div role="button" tabIndex={0}
                    className="relative rounded-xl flex flex-col items-center justify-center text-center cursor-pointer select-none"
                    style={{ border: `2px dashed ${isDragging ? theme.primary : theme.border}`, backgroundColor: isDragging ? `${theme.primary}12` : theme.secondary, padding: '24px 18px', transition: 'all 0.15s ease' }}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${theme.primary}15` }}>
                      <Upload size={22} style={{ color: theme.primary }} />
                    </div>
                    <div className="text-sm font-semibold mb-1" style={{ color: theme.text }}>{isDragging ? 'Drop to upload' : 'Upload Screenshot'}</div>
                    <div className="text-xs" style={{ color: theme.textLight }}>Tap to select or drag &amp; drop</div>
                    <div className="text-[10px] mt-2" style={{ color: theme.textLight }}>PNG · JPG · HEIC · WEBP</div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={e => handleFile(e.target.files?.[0])} />
                  </div>
                  <div className="text-[11px]" style={{ color: theme.textLight }}>Verification usually takes &lt;10s.</div>
                </>
              )}

              {uploadState === 'verifying' && (
                <div className="rounded-xl flex flex-col items-center justify-center text-center" style={{ border: `2px dashed ${theme.border}`, backgroundColor: theme.secondary, padding: '28px 20px' }}>
                  <Loader2 size={30} className="animate-spin mb-2" style={{ color: theme.primary }} />
                  <div className="text-sm font-semibold" style={{ color: theme.text }}>Verifying screenshot...</div>
                  <div className="text-xs mt-1" style={{ color: theme.textLight }}>This usually takes &lt;10 seconds</div>
                </div>
              )}

              {uploadState === 'error' && (
                <div className="rounded-xl flex flex-col items-center justify-center text-center" style={{ border: `2px solid ${theme.error}55`, backgroundColor: `${theme.error}10`, padding: '20px 16px' }}>
                  <AlertTriangle size={22} style={{ color: theme.error }} className="mb-2" />
                  <div className="text-sm font-semibold mb-1" style={{ color: theme.text }}>Couldn&apos;t verify this screenshot</div>
                  <div className="text-xs mb-3" style={{ color: theme.textLight }}>Make sure it clearly shows The Pep Planner graphic.</div>
                  <button type="button" onClick={resetUpload} className="px-4 py-2 rounded-lg text-xs font-semibold border"
                    style={{ backgroundColor: theme.secondary, borderColor: theme.border, color: theme.text }}>Try again</button>
                </div>
              )}

              {uploadState === 'success' && (
                <div className="rounded-xl flex flex-col items-center justify-center text-center" style={{ border: `2px solid ${theme.primary}55`, backgroundColor: `${theme.primary}0e`, padding: '20px 16px' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})` }}>
                    <CheckCircle size={22} style={{ color: theme.textOnPrimary }} />
                  </div>
                  <div className="text-base font-bold mb-1" style={{ color: theme.text }}>Verified! Ready to redeem.</div>
                  {promoCode && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3" style={{ backgroundColor: theme.secondary, border: `1px solid ${theme.border}` }}>
                      <span className="text-xs" style={{ color: theme.textLight }}>Code:</span>
                      <span className="text-sm font-mono font-bold tracking-widest" style={{ color: theme.text }}>{promoCode}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRedeem}
                    disabled={!SHARE_INCENTIVE_ENABLED}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${SHARE_INCENTIVE_ENABLED ? 'active:scale-[0.97]' : 'cursor-not-allowed'}`}
                    style={{
                      backgroundColor: SHARE_INCENTIVE_ENABLED ? theme.primary : theme.secondary,
                      color: SHARE_INCENTIVE_ENABLED ? theme.textOnPrimary : theme.textLight,
                      opacity: SHARE_INCENTIVE_ENABLED ? 1 : 0.8,
                    }}
                  >
                    {SHARE_INCENTIVE_ENABLED ? 'Claim 3 Months Free' : 'Claim 3 Months Free (Coming Soon)'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1">
          <p className="text-[10px] text-center leading-relaxed" style={{ color: theme.textLight }}>
            <span className="block">By participating you agree to our promotional terms.</span>
            <span className="block">One redemption per account.</span>
          </p>
        </div>
      </div>

      {/* Hidden full-size card for image capture — off-screen, not display:none */}
      <div aria-hidden="true" style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '380px', pointerEvents: 'none', zIndex: -1 }}>
        <div ref={cardCaptureRef}>
          {(() => {
            const captureItem = activeType.pool === 'none' ? null : (selectedItem || items[0] || null)
            return renderPreviewCard(captureItem)
          })()}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
