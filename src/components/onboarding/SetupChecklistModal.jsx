import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Package,
  ShoppingCart,
  Pill,
  FirstAid,
  Storefront,
  Target,
  CreditCard,
  Truck,
  HouseLine,
  CalendarCheck,
  Syringe,
  TestTube,
  Flask,
  CheckCircle,
  MagnifyingGlass,
  CaretDown,
  Plus,
  Coins,
  Bank,
  GlobeHemisphereWest,
  CalendarX,
  ChartLine,
  LightningA,
  X,
  Star,
} from '@phosphor-icons/react';
import { ChevronRight, ShoppingBag, ClipboardList, Check as LucideCheck, Circle, Sun, Moon } from 'lucide-react';
import { SiZelle, SiCashapp, SiVenmo } from 'react-icons/si';
import { FaPaypal, FaAlipay } from 'react-icons/fa6';
import { useAppContext } from '../../context/AppContext';
import { prepareItemForSave } from '../../utils/userDataSave';
import { generateId } from '../../utils/string';
import { DEFAULT_SETUP_CHECKLIST } from '../../utils/trackingMode';
import { getLocalDateString, formatMMDDYYYY } from '../../utils/date';
import { inferPurposeIconFromCompound, getPurposeIconComponent, getPurposeIconColor, PURPOSE_ICON_WEIGHT } from '../../utils/protocolPurposeIcons';
import { convertForStorage, isConvertibleUnit, getUnitLabel } from '../../utils/unitConversion';
import { getMedications, saveMedications } from '../../utils/medications';
import { OWNER_SELF } from '../../utils/buddies';
import {
  ONBOARDING_PROTOCOL_NAME_PICKS,
  searchCommonProtocolNames,
} from '../../data/commonProtocolNames';
import {
  ONBOARDING_SUPPLEMENT_PICKS,
  searchCommonSupplements,
} from '../../data/commonSupplements';
import {
  formatMedicationLabel,
  searchCommonMedications,
} from '../../data/commonMedications';
import LandingPrivacyModal from '../legal/LandingPrivacyModal';
import VendorCard from '../vendors/VendorCard';
import GoalCard from '../research/GoalCard';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';
import { GOAL_CATEGORIES, LINKED_TYPES, LinkedTargetFields, todayISO, addDaysISO } from '../research/GoalModal';
import { searchCommonGoalTemplates } from '../../data/commonGoalTemplates';
import { buildGoalLiveSnapshot, getLinkedGoalProgress } from '../../utils/goalProgress';
import { getTaskCompletion } from '../../utils/taskCompletion';
import { getProtocolHistory } from '../../utils/protocolHistory';
import { getLabResults } from '../../utils/labResults';
import OnboardingBackButton from './OnboardingBackButton';
import OnboardingLogoFooter from './OnboardingLogoFooter';
import OnboardingQuestionHeader from './OnboardingQuestionHeader';
import stockpileSetupArt from '../../assets/onboarding/stockpile_stock.png';
import ordersSetupArt from '../../assets/onboarding/order_researcher.png';
import supplementsSetupArt from '../../assets/onboarding/supplement_researcher.png';
import medicationsSetupArt from '../../assets/onboarding/medication_researcher.png';
import vendorsSetupArt from '../../assets/onboarding/vendor_researcher.png';
import goalsSetupArt from '../../assets/onboarding/goal_researcher.png';

const ICON_WEIGHT = 'duotone';

const VENDOR_LABEL_OPTIONS = [
  'Reliable', 'Vetted', 'Fast Shipping', 'Overfill', 'GLP1', 'Aminos', 'Oils',
  'Pricey', 'Reshipper', 'Slow Shipping', 'Bad Test', 'Bad Packaging',
  'Broken Vials', 'Rude Reps', 'Out of Service', 'Puck Problem',
];

const VENDOR_GOOD_LABELS = ['Reliable', 'Fast Shipping', 'Overfill', 'Vetted', 'Reshipper'];
const VENDOR_BAD_LABELS = ['Bad Test', 'Bad Packaging', 'Broken Vials', 'Rude Reps', 'Out of Service', 'Puck Problem'];

/** Match VendorCard label chip colors (selected = stronger fill) */
function getVendorLabelChipStyle(label, active, theme) {
  const isDark = !!theme?.isDark;
  const tone = VENDOR_GOOD_LABELS.includes(label)
    ? 'good'
    : VENDOR_BAD_LABELS.includes(label)
      ? 'bad'
      : 'neutral';

  if (!active) {
    if (isDark) {
      if (tone === 'good') return { backgroundColor: 'rgba(60, 78, 58, 0.22)', color: '#dcfce7', borderColor: 'rgba(220, 252, 231, 0.18)' };
      if (tone === 'bad') return { backgroundColor: 'rgba(109, 43, 44, 0.22)', color: '#fee2e2', borderColor: 'rgba(254, 226, 226, 0.18)' };
      return { backgroundColor: 'rgba(68, 104, 121, 0.22)', color: '#dbeafe', borderColor: 'rgba(219, 234, 254, 0.18)' };
    }
    if (tone === 'good') return { backgroundColor: 'rgba(96, 124, 92, 0.12)', color: '#3c4e3a', borderColor: 'rgba(60, 78, 58, 0.18)' };
    if (tone === 'bad') return { backgroundColor: 'rgba(161, 77, 77, 0.12)', color: '#6D2B2C', borderColor: 'rgba(109, 43, 44, 0.18)' };
    return { backgroundColor: 'rgba(173, 195, 209, 0.18)', color: '#1e3a5f', borderColor: 'rgba(30, 58, 95, 0.14)' };
  }

  if (isDark) {
    if (tone === 'good') return { backgroundColor: 'rgba(60, 78, 58, 0.72)', color: '#dcfce7', borderColor: 'rgba(220, 252, 231, 0.35)' };
    if (tone === 'bad') return { backgroundColor: 'rgba(109, 43, 44, 0.72)', color: '#fee2e2', borderColor: 'rgba(254, 226, 226, 0.35)' };
    return { backgroundColor: 'rgba(68, 104, 121, 0.72)', color: '#dbeafe', borderColor: 'rgba(219, 234, 254, 0.35)' };
  }
  if (tone === 'good') return { backgroundColor: 'rgba(96, 124, 92, 0.88)', color: '#fff', borderColor: '#3c4e3a' };
  if (tone === 'bad') return { backgroundColor: 'rgba(161, 77, 77, 0.92)', color: '#fff', borderColor: '#6D2B2C' };
  return { backgroundColor: 'rgba(68, 104, 121, 0.88)', color: '#fff', borderColor: '#1e3a5f' };
}

/** Same star colors + pulse as VendorDetailsModal */
const SETUP_STAR_COLORS = ['#7A8E85', '#6B7F77', '#566D64', '#445952', '#3B4240'];

function SetupStarRating({ rating = 0, onChange, theme, size = 28 }) {
  const value = Number(rating) || 0;
  return (
    <>
      <style>{`
        @keyframes setupStarPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        .setup-star-rating-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .setup-star-rating-btn:hover {
          transform: scale(1.1);
        }
        .setup-star-icon {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .setup-star-icon.filled {
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }
        .setup-star-icon.just-clicked {
          animation: setupStarPulse 0.4s ease-out;
        }
      `}</style>
      <div
        className="flex items-center justify-between w-full rounded-xl p-1.5"
        style={{
          backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.05)' : '#f0eee7'}`,
        }}
        aria-label="Rating"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const isFilled = value >= n;
          return (
            <button
              key={n}
              type="button"
              className="setup-star-rating-btn px-2 py-1.5"
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={(e) => {
                onChange?.(n);
                const root = e.currentTarget.parentElement;
                const stars = root?.querySelectorAll('.setup-star-icon') || [];
                stars.forEach((star, i) => {
                  if (i < n) {
                    star.classList.add('just-clicked');
                    setTimeout(() => star.classList.remove('just-clicked'), 400);
                  }
                });
              }}
            >
              <Star
                size={size}
                weight={isFilled ? 'fill' : 'duotone'}
                className={`setup-star-icon ${isFilled ? 'filled' : ''}`}
                style={{
                  color: isFilled
                    ? SETUP_STAR_COLORS[n - 1]
                    : (theme?.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
                  opacity: isFilled ? 1 : 0.5,
                }}
              />
            </button>
          );
        })}
      </div>
    </>
  );
}

const VENDOR_CONTACT_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'website', label: 'Website' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'discord', label: 'Discord' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_VENDOR_CONTACTS = [
  { type: 'website', value: '' },
  { type: 'email', value: '' },
];

const DEFAULT_VENDOR_PAYMENTS = {
  notes: '',
  card: false,
  zelle: false,
  crypto: false,
  paypal: false,
  wire: false,
  venmo: false,
  cashapp: false,
  alipay: false,
};

const VenmoIcon = ({ size = 18, style, className }) => (
  <SiVenmo size={size} style={style} className={className} />
);

const VENDOR_PAYMENT_OPTIONS = [
  { name: 'Card', key: 'card', Icon: CreditCard },
  { name: 'Zelle', key: 'zelle', Icon: SiZelle },
  { name: 'Crypto', key: 'crypto', Icon: Coins },
  { name: 'PayPal', key: 'paypal', Icon: FaPaypal },
  { name: 'Wire', key: 'wire', Icon: Bank },
  { name: 'Venmo', key: 'venmo', Icon: VenmoIcon },
  { name: 'CashApp', key: 'cashapp', Icon: SiCashapp },
  { name: 'AliPay', key: 'alipay', Icon: FaAlipay },
];

function normalizeVendorPayments(form) {
  const raw = form?.payments && typeof form.payments === 'object' ? form.payments : {};
  return {
    ...DEFAULT_VENDOR_PAYMENTS,
    ...raw,
    notes: raw.notes || '',
  };
}

function getSelectedPaymentLabels(payments) {
  const p = payments && typeof payments === 'object' ? payments : {};
  return VENDOR_PAYMENT_OPTIONS.filter((opt) => !!p[opt.key]).map((opt) => opt.name);
}

function getVendorContactLabel(type) {
  const found = VENDOR_CONTACT_TYPES.find((t) => t.value === type);
  return found?.label || 'Contact';
}

function getVendorContactPlaceholder(type) {
  switch (String(type || '').toLowerCase()) {
    case 'email': return 'name@example.com';
    case 'phone': return '(555) 555-5555';
    case 'whatsapp': return '+1 555-555-5555';
    case 'telegram': return '@telegramname';
    case 'discord': return '@discordname';
    case 'website': return 'https://example.com';
    case 'facebook': return 'facebook.com/username';
    case 'other': return 'Enter contact information';
    default: return 'Enter contact information';
  }
}

function normalizeVendorContacts(form) {
  if (Array.isArray(form?.contacts) && form.contacts.length) {
    return form.contacts.map((c) => ({
      type: c?.type || 'email',
      value: c?.value || '',
    }));
  }
  const legacy = [
    form?.website?.trim() ? { type: 'website', value: form.website.trim() } : null,
    form?.email?.trim() ? { type: 'email', value: form.email.trim() } : null,
  ].filter(Boolean);
  return legacy.length ? legacy : DEFAULT_VENDOR_CONTACTS.map((c) => ({ ...c }));
}

const DAY_OPTIONS = [
  { value: 'Sun', label: 'Sun' },
  { value: 'Mon', label: 'Mon' },
  { value: 'Tue', label: 'Tue' },
  { value: 'Wed', label: 'Wed' },
  { value: 'Thu', label: 'Thu' },
  { value: 'Fri', label: 'Fri' },
  { value: 'Sat', label: 'Sat' },
];

const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SUPPLEMENT_DELIVERY_ICONS = {
  injection: { Icon: Syringe, color: '#8ea5a0' },
  syringe: { Icon: Syringe, color: '#8ea5a0' },
  powder: { Icon: Flask, color: '#8ba4c0' },
  oral: { Icon: Pill, color: '#9ca3af' },
};

function getDayChipLabels(item) {
  const days = Array.isArray(item?.days) ? item.days : [];
  if (days.length === 0 || days.length === 7) return ['Daily'];
  return [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

// ─── Walkthrough step definitions — full modal field fidelity ──────────
const WALKTHROUGHS = {
  stockpile: [
    { id: 'intro', type: 'intro', title: "Let's build your stockpile!", subtitle: 'Add what’s on hand so you always know what you have left.' },
    { id: 'name', title: 'What peptide do you have?', placeholder: 'e.g. GHK-Cu, My Stack…', field: 'name', type: 'name-chips' },
    {
      id: 'amount',
      title: 'How much per vial?',
      placeholder: '5',
      field: 'mg',
      type: 'text+unit',
      unitField: 'mgUnit',
      unitOptions: ['mg', 'mL', 'g', 'IU'],
      defaultUnit: 'mg',
    },
    {
      id: 'quantity',
      title: 'How many do you have?',
      placeholder: '1',
      field: 'quantity',
      type: 'text+unit',
      unitField: 'unit',
      unitOptions: ['vial', 'kit', 'bottle', 'tablets'],
      defaultUnit: 'vial',
    },
    { id: 'vendor', title: 'Who did you get it from?', placeholder: 'Vendor name (optional)', field: 'vendor', type: 'text', optional: true, privacyNote: true },
    {
      id: 'cost',
      title: 'What did it cost?',
      placeholder: '0.00',
      field: 'cost',
      type: 'cost+per',
      unitField: 'priceUnit',
      unitOptions: ['vial', 'kit', 'mg', 'g', 'IU'],
      defaultUnit: 'vial',
      optional: true,
    },
    { id: 'review', title: 'Well stocked!', type: 'review', subtitle: 'You can always add more vials and supplies later in the app.' },
  ],
  orders: [
    { id: 'intro', type: 'intro', title: 'Track your orders!', subtitle: 'Add what’s on the way so you can follow status from placed to delivered.' },
    { id: 'name', title: 'What did you order?', placeholder: 'e.g. BPC-157, My Stack…', field: 'name', type: 'name-chips' },
    {
      id: 'vendor',
      title: 'Where did you get it from?',
      placeholder: 'Vendor name (optional)',
      field: 'vendor',
      type: 'text',
      optional: true,
      privacyNote: true,
      typeField: 'type',
      typeOptions: [
        { value: 'domestic', label: 'Domestic' },
        { value: 'international', label: 'International' },
        { value: 'groupbuy', label: 'Group Buy' },
      ],
      typeDefault: 'domestic',
    },
    {
      id: 'amount',
      title: 'How much did you order?',
      placeholder: '5',
      field: 'mg',
      type: 'text+unit',
      unitField: 'mgUnit',
      unitOptions: ['mg', 'mL', 'g', 'IU'],
      defaultUnit: 'mg',
      qtyField: 'quantity',
      qtyPlaceholder: '1',
      qtyUnitField: 'unit',
      qtyUnitOptions: ['vial', 'kit', 'bottle', 'tablets'],
      qtyDefaultUnit: 'vial',
    },
    { id: 'price', title: 'What was the price?', placeholder: '0.00 (optional)', field: 'price', type: 'text', optional: true, inputMode: 'decimal' },
    {
      id: 'status',
      title: "What's the status?",
      field: 'status',
      type: 'toggle-group',
      options: [
        { value: 'Order Placed', label: 'Order Placed' },
        { value: 'Shipped', label: 'Shipped' },
        { value: 'Delivered', label: 'Delivered' },
      ],
      defaultValue: 'Order Placed',
    },
    { id: 'review', title: 'Order entered!', type: 'review' },
  ],
  supplements: [
    { id: 'intro', type: 'intro', title: 'Add your supplements!', subtitle: 'Track your daily supplement routine alongside your protocols.' },
    { id: 'name', title: 'What supplement?', placeholder: 'e.g. Vitamin D3, Magnesium…', field: 'name', type: 'name-chips', picks: 'supplements', catalogIdField: 'catalogId' },
    {
      id: 'dose',
      title: "What's the dose?",
      placeholder: 'e.g. 5000 (optional)',
      field: 'dose',
      type: 'text+unit',
      unitField: 'unit',
      unitOptions: ['mg', 'mcg', 'g', 'ml', 'IU'],
      defaultUnit: 'mg',
      optional: true,
    },
    {
      id: 'schedule',
      title: 'When do you take it?',
      field: 'schedule',
      type: 'chips-multi',
      layout: 'toggle',
      options: [
        { value: 'AM', label: 'Morning' },
        { value: 'PM', label: 'Evening' },
      ],
      defaultValue: ['AM'],
      daysField: 'days',
      daysOptions: DAY_OPTIONS,
      daysDefault: [],
      daysHint: 'Leave empty for every day',
    },
    {
      id: 'delivery',
      title: 'How do you take it?',
      field: 'delivery',
      type: 'toggle-group',
      options: [
        { value: 'oral', label: 'Oral', Icon: Pill },
        { value: 'injection', label: 'Injection', Icon: Syringe },
        { value: 'powder', label: 'Powder', Icon: TestTube },
      ],
      defaultValue: 'oral',
    },
    { id: 'review', title: 'Supplement added!', type: 'review', successCheck: true },
  ],
  medications: [
    { id: 'intro', type: 'intro', title: 'Log your medications!', subtitle: 'Keep your routine medications alongside your research.' },
    { id: 'name', title: 'What medication?', placeholder: 'e.g. Lipitor, metformin…', field: 'name', type: 'text', suggest: 'medications', catalogIdField: 'catalogId' },
    {
      id: 'dose',
      title: "What's the dose?",
      placeholder: '500 (optional)',
      field: 'dose',
      type: 'text+unit',
      unitField: 'unit',
      unitOptions: ['mg', 'mcg', 'IU', 'ml', 'g'],
      defaultUnit: 'mg',
      optional: true,
    },
    {
      id: 'schedule',
      title: 'When do you take it?',
      field: 'schedule',
      type: 'chips-multi',
      layout: 'toggle',
      options: [
        { value: 'AM', label: 'Morning' },
        { value: 'PM', label: 'Evening' },
      ],
      defaultValue: ['AM'],
      daysField: 'days',
      daysOptions: DAY_OPTIONS,
      daysDefault: [],
      daysHint: 'Leave empty for every day',
    },
    {
      id: 'delivery',
      title: 'How do you take it?',
      field: 'delivery',
      type: 'toggle-group',
      options: [
        { value: 'oral', label: 'Oral', Icon: Pill },
        { value: 'injection', label: 'Injection', Icon: Syringe },
        { value: 'powder', label: 'Powder', Icon: TestTube },
      ],
      defaultValue: 'oral',
    },
    { id: 'review', title: 'Medication logged!', type: 'review', successCheck: true },
  ],
  vendors: [
    { id: 'intro', type: 'intro', title: 'Add your vendors!', subtitle: 'Keep contacts, payments, and trust notes in one place for the sources you use.' },
    { id: 'name', title: 'Vendor name?', placeholder: 'e.g. Pharm C', field: 'name', type: 'text', privacyNote: true },
    {
      id: 'type',
      title: 'What type of vendor?',
      field: 'type',
      type: 'toggle-group',
      options: [
        { value: 'domestic', label: 'Domestic' },
        { value: 'international', label: 'International' },
        { value: 'groupbuy', label: 'Group Buy' },
      ],
      defaultValue: 'domestic',
    },
    {
      id: 'contact',
      title: 'Ways to get in contact?',
      field: 'contacts',
      type: 'contacts',
      optional: true,
      defaultValue: DEFAULT_VENDOR_CONTACTS,
    },
    {
      id: 'payments',
      title: 'Payment methods?',
      field: 'payments',
      type: 'payment-methods',
      optional: true,
      defaultValue: DEFAULT_VENDOR_PAYMENTS,
    },
    {
      id: 'rating-labels',
      title: 'Rating & labels?',
      type: 'rating-labels',
      ratingField: 'rating',
      labelsField: 'labels',
      options: VENDOR_LABEL_OPTIONS,
      defaultValue: { rating: 0, labels: [] },
      optional: true,
    },
    { id: 'notes', title: 'Any notes?', placeholder: 'Specialties, shipping notes… (optional)', field: 'notes', type: 'textarea', optional: true },
    { id: 'review', title: 'Vendor noted!', type: 'review', successCheck: true, successIcon: GlobeHemisphereWest },
  ],
  goals: [
    { id: 'intro', type: 'intro', title: 'Set a research goal!', subtitle: 'Pick an auto-track goal from your logged data — or write your own and track it your way.' },
    {
      id: 'text',
      title: "What's your goal?",
      placeholder: 'Describe your goal or pick a suggestion',
      field: 'text',
      type: 'goal-compose',
      categoryField: 'category',
      categoryDefault: 'General',
    },
    {
      id: 'target',
      title: "What's your target?",
      type: 'goal-target',
      optional: true,
    },
    {
      id: 'dates',
      title: 'Any dates?',
      type: 'goal-dates',
      optional: true,
    },
    { id: 'notes', title: 'Any notes?', placeholder: 'Details, milestones, or reasoning (optional)', field: 'notes', type: 'textarea', optional: true },
    { id: 'review', title: 'Goal set!', type: 'review', successCheck: true, successIcon: Target },
  ],
};

function goalNeedsFollowUp(linkedType) {
  if (!linkedType || linkedType === 'lowStockCleared') return false;
  if (linkedType === 'complianceGrade' || linkedType === 'labMarker') return true;
  return [
    'weight',
    'bodyfat',
    'streak',
    'hydrationStreak',
    'allTimeDoses',
    'completedProtocols',
    'spendBudget',
  ].includes(linkedType);
}

function goalFollowUpTitle(linkedType) {
  switch (linkedType) {
    case 'weight': return "What's your target weight?";
    case 'bodyfat': return "What's your target body fat?";
    case 'streak': return "What's your streak target?";
    case 'hydrationStreak': return "What's your hydration streak target?";
    case 'complianceGrade': return 'What grade are you aiming for?';
    case 'labMarker': return 'Which lab marker?';
    case 'allTimeDoses': return "What's your dose milestone?";
    case 'completedProtocols': return 'How many protocols finished?';
    case 'spendBudget': return "What's your budget ceiling?";
    default: return "What's your target?";
  }
}

function formatSchedule(schedule) {
  if (!Array.isArray(schedule) || !schedule.length) return 'Morning';
  return schedule.map((s) => (s === 'AM' ? 'Morning' : s === 'PM' ? 'Evening' : s)).join(' & ');
}

function formatDays(days) {
  if (!Array.isArray(days) || !days.length) return 'Every day';
  return days.join(', ');
}

/** Display value for a completed setup walkthrough step chip */
function answerForSetupStep(step, form) {
  if (step?.type === 'goal-compose') {
    const base = (form[step.field] || '').toString().trim();
    if (!base) return '';
    const catVal = form[step.categoryField] ?? step.categoryDefault;
    const parts = [base];
    if (catVal) parts.push(catVal);
    if (form.linkedType) {
      const lt = LINKED_TYPES.find((x) => x.id === form.linkedType);
      parts.push(lt?.label || form.linkedType);
    }
    if (form.linkedTarget) parts.push(`target ${form.linkedTarget}`);
    return parts.join(' · ');
  }
  if (step?.type === 'goal-dates') {
    const start = (form.startDate || '').toString().trim();
    const due = (form.dueDate || '').toString().trim();
    if (!start && !due) return '';
    if (start && due) return `${formatMMDDYYYY(start) || start} → ${formatMMDDYYYY(due) || due}`;
    return due ? `Target ${formatMMDDYYYY(due) || due}` : `Start ${formatMMDDYYYY(start) || start}`;
  }
  if (step?.type === 'goal-target') {
    if (!goalNeedsFollowUp(form.linkedType)) return '';
    if (form.linkedType === 'labMarker') {
      const marker = (form.linkedMarkerName || '').trim();
      const target = (form.linkedTarget || '').toString().trim();
      if (!marker && !target) return '';
      return [marker, target].filter(Boolean).join(' · ');
    }
    const target = (form.linkedTarget || '').toString().trim();
    return target || '';
  }
  if (step?.type === 'contacts') {
    const filled = normalizeVendorContacts(form).filter((c) => (c.value || '').trim());
    if (!filled.length) return '';
    return filled.map((c) => `${getVendorContactLabel(c.type)} ${c.value.trim()}`).join(' · ');
  }
  if (step?.type === 'payment-methods') {
    const labels = getSelectedPaymentLabels(form.payments);
    const notes = (form.payments?.notes || '').trim();
    if (!labels.length && !notes) return '';
    return [labels.join(', '), notes].filter(Boolean).join(' · ');
  }
  if (step?.type === 'text-pair') {
    const parts = (step.fields || [])
      .map((f) => (form[f.field] || '').toString().trim())
      .filter(Boolean);
    return parts.join(' · ');
  }
  if (!step?.field) return '';
  const val = form[step.field];

  switch (step.type) {
    case 'text':
    case 'textarea':
    case 'name-chips': {
      const base = (val || '').toString().trim();
      if (!base) return '';
      if (step.typeField) {
        const typeVal = form[step.typeField] ?? step.typeDefault;
        const typeOpt = step.typeOptions?.find((o) => o.value === typeVal);
        return typeOpt?.label ? `${base} · ${typeOpt.label}` : base;
      }
      if (step.categoryField) {
        const catVal = form[step.categoryField] ?? step.categoryDefault;
        const catOpt = step.categoryOptions?.find((o) => o.value === catVal);
        return catOpt?.label ? `${base} · ${catOpt.label}` : base;
      }
      return base;
    }
    case 'text+unit': {
      const amount = (val || '').toString().trim();
      if (!amount) return '';
      const unit = form[step.unitField] || step.defaultUnit || '';
      let label = `${amount} ${unit}`.trim();
      if (step.qtyField) {
        const qty = (form[step.qtyField] || '').toString().trim();
        if (qty) {
          const qtyUnit = form[step.qtyUnitField] || step.qtyDefaultUnit || '';
          const qtyLabel = ['vial', 'kit', 'bottle', 'tablets'].includes(qtyUnit)
            ? getUnitLabel(qtyUnit, qty)
            : qtyUnit;
          label = `${label} · ${qty} ${qtyLabel}`.trim();
        }
      }
      return label;
    }
    case 'cost+per': {
      const amount = (val || '').toString().trim();
      if (!amount) return '';
      const unit = form[step.unitField] || step.defaultUnit || 'vial';
      return `$${amount} / ${unit}`;
    }
    case 'chips':
    case 'toggle-group':
    case 'category-grid': {
      const v = val ?? step.defaultValue;
      if (v == null || v === '') return '';
      const opt = step.options?.find((o) => o.value === v);
      return opt?.label || String(v);
    }
    case 'chips-multi': {
      const arr = Array.isArray(val) ? val : (step.defaultValue || []);
      if (!arr.length) return '';
      let label = formatSchedule(arr);
      if (step.daysField) {
        const days = Array.isArray(form[step.daysField]) ? form[step.daysField] : [];
        label = `${label} · ${formatDays(days)}`;
      }
      return label;
    }
    case 'chips-multi-days': {
      const arr = Array.isArray(val) ? val : [];
      return formatDays(arr);
    }
    case 'tags': {
      const arr = Array.isArray(val) ? val : [];
      return arr.length ? arr.join(', ') : '';
    }
    case 'rating-labels': {
      const rating = Number(form[step.ratingField || 'rating'] || 0);
      const tags = Array.isArray(form[step.labelsField || 'labels'])
        ? form[step.labelsField || 'labels']
        : [];
      const parts = [];
      if (rating > 0) parts.push(`${rating}★`);
      if (tags.length) parts.push(tags.join(', '));
      return parts.join(' · ');
    }
    case 'date':
      return (val || '').toString().trim();
    case 'stars':
      return val ? `${val} star${Number(val) === 1 ? '' : 's'}` : '';
    default:
      return (val || '').toString().trim();
  }
}

function getReviewFields(itemId, form) {
  switch (itemId) {
    case 'stockpile':
      return [
        { label: 'Name', value: form.name || '–' },
        { label: 'Amount', value: form.mg ? `${form.mg} ${form.mgUnit || 'mg'}` : '–' },
        { label: 'Quantity', value: form.quantity ? `${form.quantity} ${getUnitLabel(form.unit || 'vial', form.quantity)}` : '–' },
        { label: 'Vendor', value: form.vendor?.trim() || 'Not specified' },
        ...(form.cost?.trim()
          ? [{ label: 'Cost', value: `$${form.cost.trim()} / ${form.priceUnit || form.unit || 'vial'}` }]
          : []),
      ];
    case 'orders':
      return [
        { label: 'Vendor', value: form.vendor?.trim() || 'Not specified' },
        { label: 'Type', value: form.type || 'domestic' },
        { label: 'Item', value: form.name || '–' },
        { label: 'Amount', value: form.mg ? `${form.mg} ${form.mgUnit || 'mg'}` : 'Not specified' },
        { label: 'Qty', value: form.quantity ? `${form.quantity} ${getUnitLabel(form.unit || 'vial', form.quantity)}` : 'Not specified' },
        ...(form.price?.trim() ? [{ label: 'Price', value: `$${form.price.trim()}` }] : []),
        { label: 'Status', value: form.status || 'Order Placed' },
      ];
    case 'supplements':
      return [
        { label: 'Name', value: form.name || '–' },
        { label: 'Dose', value: form.dose ? `${form.dose} ${form.unit || 'mg'}` : 'Not specified' },
        { label: 'Schedule', value: formatSchedule(form.schedule) },
        { label: 'Days', value: formatDays(form.days) },
        { label: 'Delivery', value: form.delivery || 'oral' },
      ];
    case 'medications':
      return [
        { label: 'Name', value: form.name || '–' },
        { label: 'Dose', value: form.dose ? `${form.dose} ${form.unit || 'mg'}` : 'Not specified' },
        { label: 'Schedule', value: formatSchedule(form.schedule) },
        { label: 'Days', value: formatDays(form.days) },
        { label: 'Delivery', value: form.delivery || 'oral' },
      ];
    case 'vendors':
      return [
        { label: 'Name', value: form.name || '–' },
        { label: 'Type', value: form.type || 'domestic' },
        {
          label: 'Contacts',
          value: (() => {
            const filled = normalizeVendorContacts(form).filter((c) => (c.value || '').trim());
            return filled.length
              ? filled.map((c) => `${getVendorContactLabel(c.type)}: ${c.value.trim()}`).join(', ')
              : 'Not added';
          })(),
        },
        {
          label: 'Payments',
          value: (() => {
            const labels = getSelectedPaymentLabels(form.payments);
            const notes = (form.payments?.notes || '').trim();
            if (!labels.length && !notes) return 'None';
            return [labels.join(', '), notes].filter(Boolean).join(' · ');
          })(),
        },
        { label: 'Labels', value: Array.isArray(form.labels) && form.labels.length ? form.labels.join(', ') : 'None' },
        { label: 'Notes', value: form.notes || 'None' },
      ];
    case 'goals':
      return [
        { label: 'Category', value: form.category || 'General' },
        { label: 'Goal', value: form.text || '–' },
        {
          label: 'Auto-track',
          value: form.linkedType
            ? (LINKED_TYPES.find((lt) => lt.id === form.linkedType)?.label || form.linkedType)
            : 'Manual',
        },
        ...(form.linkedType === 'labMarker' && form.linkedMarkerName
          ? [{ label: 'Marker', value: form.linkedMarkerName }]
          : []),
        ...(form.linkedTarget
          ? [{
              label: 'Target',
              value: form.linkedMarkerUnit
                ? `${form.linkedTarget} ${form.linkedMarkerUnit}`
                : String(form.linkedTarget),
            }]
          : []),
        { label: 'Start', value: form.startDate ? (formatMMDDYYYY(form.startDate) || form.startDate) : 'Today' },
        { label: 'Target date', value: form.dueDate ? (formatMMDDYYYY(form.dueDate) || form.dueDate) : 'No date set' },
        { label: 'Notes', value: form.notes || 'None' },
      ];
    default:
      return [];
  }
}

const SETUP_ITEMS = [
  { id: 'stockpile', label: 'Stockpile', description: 'Vials & supplies on hand', icon: Package, art: stockpileSetupArt },
  { id: 'orders', label: 'Orders', description: 'Pending or scheduled orders', icon: ShoppingCart, art: ordersSetupArt },
  { id: 'supplements', label: 'Supplements', description: 'Daily supplements schedule', icon: Pill, art: supplementsSetupArt },
  { id: 'medications', label: 'Medications', description: 'Routine medications', icon: FirstAid, art: medicationsSetupArt },
  { id: 'vendors', label: 'Vendors', description: 'Where you source research', icon: Storefront, art: vendorsSetupArt },
  { id: 'goals', label: 'Goals', description: 'Research goals to track', icon: Target, art: goalsSetupArt },
];

/**
 * Post-first-protocol optional setup checklist.
 * Selected items get inline guided walkthroughs that mirror in-app modal fields.
 */
export default function SetupChecklistModal({ open, theme, onComplete, onBack, fillParent = false }) {
  const {
    setStockpile,
    setOrders,
    orders,
    addSupplement,
    updateSupplement,
    addVendor,
    setMedications,
    metrics = [],
    protocols = [],
    supplements = [],
    reconItems = [],
    stockpile = [],
  } = useAppContext();

  const [selected, setSelected] = useState({ ...DEFAULT_SETUP_CHECKLIST });
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [walkthrough, setWalkthrough] = useState({ stepIndex: 0, form: {} });
  /** Per-section form + saved entity id so back/forward keeps answers and updates instead of duplicating */
  const [sectionDrafts, setSectionDrafts] = useState({});
  /** 1 = forward (slide from right), -1 = back (slide from left) */
  const [navDirection, setNavDirection] = useState(1);
  const [customNameMode, setCustomNameMode] = useState(false);
  const [showCustomSuggestions, setShowCustomSuggestions] = useState(false);
  const [openContactDropdown, setOpenContactDropdown] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    if (!open || !showCustomSuggestions) return undefined;
    const onPointerDown = (e) => {
      if (e.target.closest?.('[data-setup-suggest]')) return;
      setShowCustomSuggestions(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, showCustomSuggestions]);

  if (!open) return null;

  const primary = theme?.primary || '#7F9E95';
  const text = theme?.text || '#1f2937';
  const muted = theme?.isDark ? 'rgba(255,255,255,0.65)' : '#6b7280';
  const cardBg = theme?.isDark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const border = theme?.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const bg = theme?.isDark
    ? 'linear-gradient(180deg, #14191f 0%, #0e1219 100%)'
    : 'linear-gradient(180deg, #F5F3EF 0%, #E8E6E1 100%)';
  const dimProgress = theme?.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';

  const inQueue = queueIndex >= 0 && queue.length > 0;
  const current = inQueue ? queue[queueIndex] : null;
  const wtSteps = inQueue ? (WALKTHROUGHS[current.id] || []) : [];
  const wtStep = wtSteps[walkthrough.stepIndex];
  const isIntroStep = wtStep?.type === 'intro';
  const isReviewStep = wtStep?.type === 'review';
  const isLastQueueItem = queueIndex >= queue.length - 1;

  const toggle = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allChecked = SETUP_ITEMS.every((item) => Boolean(selected[item.id]));
  const anyChecked = SETUP_ITEMS.some((item) => Boolean(selected[item.id]));

  const toggleCheckAll = () => {
    const next = !allChecked;
    setSelected((prev) => {
      const updated = { ...prev };
      SETUP_ITEMS.forEach((item) => { updated[item.id] = next; });
      return updated;
    });
  };

  const finish = (checklist) => {
    onComplete?.(checklist || selected);
  };

  const resetWalkthroughUi = () => {
    setWalkthrough({ stepIndex: 0, form: {} });
    setCustomNameMode(false);
    setShowCustomSuggestions(false);
    setOpenContactDropdown(null);
  };

  const openSectionAt = (list, index, drafts, direction = 1) => {
    setNavDirection(direction);
    if (index < 0 || index >= list.length) {
      setQueue([]);
      setQueueIndex(-1);
      resetWalkthroughUi();
      if (index >= list.length) finish(selected);
      return;
    }
    const section = list[index];
    const draft = drafts[section.id];
    const steps = WALKTHROUGHS[section.id] || [];
    const reviewIdx = steps.findIndex((s) => s.type === 'review');
    const startStep = draft?.entityId && reviewIdx >= 0 ? reviewIdx : 0;
    setQueueIndex(index);
    setCustomNameMode(false);
    setShowCustomSuggestions(false);
    setWalkthrough({
      stepIndex: startStep,
      form: draft?.form ? { ...draft.form } : {},
    });
  };

  const advanceQueue = (list, index, drafts = sectionDrafts) => {
    openSectionAt(list, index + 1, drafts, 1);
  };

  const handleContinue = () => {
    const checked = SETUP_ITEMS.filter((i) => selected[i.id]);
    if (checked.length === 0) {
      finish(selected);
      return;
    }
    setSectionDrafts({});
    setNavDirection(1);
    setQueue(checked);
    setQueueIndex(-1);
    resetWalkthroughUi();
    advanceQueue(checked, -1, {});
  };

  // ─── Walkthrough save — canonical shapes matching in-app modals ────
  // Returns entity id so re-visiting a section updates instead of duplicating.
  const saveWalkthroughItem = (itemId, form, existingId = null) => {
    const today = getLocalDateString();
    const isUpdate = Boolean(existingId);

    switch (itemId) {
      case 'stockpile': {
        if (!form.name?.trim() || !form.mg?.toString().trim() || !form.quantity?.toString().trim()) {
          return existingId || null;
        }
        let quantity = form.quantity;
        let unit = form.unit || 'vial';
        if (isConvertibleUnit?.(unit)) {
          try {
            const converted = convertForStorage(quantity, unit);
            if (converted) {
              quantity = converted.quantity ?? quantity;
              unit = converted.unit ?? unit;
            }
          } catch { /* keep raw */ }
        }
        const saved = prepareItemForSave({
          ...(existingId ? { id: existingId } : {}),
          name: form.name.trim(),
          mg: String(form.mg).trim(),
          mgUnit: form.mgUnit || 'mg',
          quantity: String(quantity),
          unit,
          vendor: form.vendor?.trim() || '',
          vendorId: null,
          cost: form.cost?.trim() || '',
          priceUnit: form.priceUnit || form.unit || 'vial',
          capColor: '',
          purity: '',
          batchNumber: '',
          date: today,
          documentation: [],
          purposeIcon: inferPurposeIconFromCompound(form.name.trim()) || null,
        }, { isNew: !isUpdate });
        setStockpile?.((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (isUpdate) {
            const idx = list.findIndex((i) => String(i.id) === String(existingId));
            if (idx >= 0) {
              const next = [...list];
              next[idx] = { ...list[idx], ...saved };
              return next;
            }
          }
          return [saved, ...list];
        });
        if (!isUpdate) {
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: `${saved.name} added to stockpile`, type: 'success' },
          }));
        }
        return saved.id;
      }

      case 'orders': {
        if (!form.name?.trim()) return existingId || null;
        const itemName = form.name.trim();
        const itemIdLocal = generateId(12);
        const item = {
          id: itemIdLocal,
          name: itemName,
          mg: form.mg?.toString().trim() || '',
          mgUnit: form.mgUnit || 'mg',
          quantity: form.quantity?.toString().trim() || '',
          unit: form.unit || 'vial',
          price: form.price?.trim() || '',
          costPerMg: '',
        };
        const status = form.status || 'Order Placed';
        const type = form.type || 'domestic';
        const orderList = Array.isArray(orders) ? orders : [];
        const saved = prepareItemForSave({
          ...(existingId ? { id: existingId } : {}),
          vendor: form.vendor?.trim() || '',
          vendorId: null,
          category: type,
          type,
          status,
          date: new Date().toISOString(),
          shipDate: status === 'Shipped' || status === 'Delivered' ? today : '',
          deliveryDate: status === 'Delivered' ? today : '',
          tracking: '',
          shippingCost: '',
          notes: '',
          attachments: [],
          ownerId: OWNER_SELF,
          items: [item],
          peptide: itemName,
          peptideName: itemName,
          mg: item.mg,
          unit: item.unit,
          quantity: item.quantity,
          cost: item.price,
          price: item.price,
          ...(isUpdate ? {} : { publicOrderNumber: orderList.length + 1 }),
        }, { isNew: !isUpdate });
        setOrders?.((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (isUpdate) {
            const idx = list.findIndex((i) => String(i.id) === String(existingId));
            if (idx >= 0) {
              const next = [...list];
              next[idx] = {
                ...list[idx],
                ...saved,
                publicOrderNumber: list[idx].publicOrderNumber ?? saved.publicOrderNumber,
              };
              return next;
            }
          }
          return [saved, ...list];
        });
        if (!isUpdate) {
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: `Order for ${itemName} logged`, type: 'success' },
          }));
        }
        return saved.id;
      }

      case 'supplements': {
        if (!form.name?.trim()) return existingId || null;
        const payload = prepareItemForSave({
          ...(existingId ? { id: existingId } : {}),
          name: form.name.trim(),
          dose: form.dose?.trim() || '',
          unit: form.unit || 'mg',
          schedule: Array.isArray(form.schedule) && form.schedule.length ? form.schedule : ['AM'],
          days: Array.isArray(form.days) ? form.days : [],
          delivery: form.delivery || 'oral',
          catalogId: form.catalogId || null,
          ownerId: OWNER_SELF,
          active: true,
        }, { isNew: !isUpdate });
        if (isUpdate) {
          updateSupplement?.(payload);
        } else {
          addSupplement?.(payload);
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: `${payload.name} added to supplements`, type: 'success' },
          }));
        }
        return payload.id;
      }

      case 'medications': {
        if (!form.name?.trim()) return existingId || null;
        const saved = prepareItemForSave({
          ...(existingId ? { id: existingId } : {}),
          name: form.name.trim(),
          dose: form.dose?.toString().trim() || '',
          unit: form.unit || 'mg',
          schedule: Array.isArray(form.schedule) && form.schedule.length ? form.schedule : ['AM'],
          days: Array.isArray(form.days) ? form.days : [],
          delivery: form.delivery || 'oral',
          notes: '',
          startDate: '',
          endDate: '',
          protocolIds: [],
          catalogId: form.catalogId || null,
          brandName: form.brandName || undefined,
          genericName: form.genericName || undefined,
        }, { isNew: !isUpdate });
        const existingMeds = getMedications();
        const next = isUpdate
          ? existingMeds.map((m) => (String(m.id) === String(existingId) ? { ...m, ...saved } : m))
          : [saved, ...existingMeds.filter((m) => m.id !== saved.id)];
        if (isUpdate && !next.some((m) => String(m.id) === String(existingId))) {
          next.unshift(saved);
        }
        saveMedications(next);
        setMedications?.(next);
        if (!isUpdate) {
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: `${saved.name} added to medications`, type: 'success' },
          }));
        }
        return saved.id;
      }

      case 'vendors': {
        if (!form.name?.trim()) return existingId || null;
        const contacts = normalizeVendorContacts(form)
          .map((c) => ({ type: c.type || 'email', value: (c.value || '').trim() }))
          .filter((c) => c.value);
        const website = contacts.find((c) => c.type === 'website')?.value || '';
        const payload = {
          ...(existingId ? { id: existingId } : {}),
          name: form.name.trim(),
          type: form.type || 'domestic',
          rating: Math.max(0, Math.min(5, Number(form.rating) || 0)),
          contacts,
          payments: normalizeVendorPayments(form),
          platforms: { website, telegram: '', reddit: '', discord: '' },
          reliability: 'Unknown',
          notes: form.notes?.trim() || '',
          labels: Array.isArray(form.labels) ? form.labels : [],
          ownerId: OWNER_SELF,
          isAutoCreated: false,
          needsCompletion: false,
          createdAt: new Date().toISOString(),
        };
        const withId = prepareItemForSave(payload, { isNew: !isUpdate });
        addVendor?.(withId);
        if (!isUpdate) {
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: `${form.name.trim()} added to vendors`, type: 'success' },
          }));
        }
        return withId.id;
      }

      case 'goals': {
        if (!form.text?.trim()) return existingId || null;
        const goalText = form.text.trim();
        let linkedStartValue = form.linkedStartValue ?? null;
        if (linkedStartValue == null && (form.linkedType === 'weight' || form.linkedType === 'bodyfat')) {
          const snap = buildGoalLiveSnapshot({
            metrics,
            protocols,
            supplements,
            reconItems,
            orders,
            stockpile,
            taskCompletion: getTaskCompletion(),
            protocolHistory: getProtocolHistory(),
            labResults: getLabResults(),
          });
          linkedStartValue = form.linkedType === 'weight' ? snap.weight : snap.bodyfat;
        }
        const saved = prepareItemForSave({
          ...(existingId ? { id: existingId } : {}),
          text: goalText,
          title: goalText,
          startDate: form.startDate || today,
          dueDate: form.dueDate || null,
          targetDate: form.dueDate || null,
          notes: form.notes?.trim() || '',
          completed: false,
          category: form.category || 'General',
          linkedType: form.linkedType || null,
          linkedTarget: form.linkedTarget != null && form.linkedTarget !== ''
            ? form.linkedTarget
            : (form.linkedType === 'complianceGrade' ? 'A' : null),
          linkedMarkerKey: form.linkedMarkerKey || null,
          linkedMarkerName: form.linkedMarkerName || null,
          linkedMarkerUnit: form.linkedMarkerUnit || null,
          linkedStartValue: linkedStartValue ?? null,
        }, { isNew: !isUpdate });
        try {
          const existing = JSON.parse(localStorage.getItem('tpprover_user_goals') || '[]');
          const list = Array.isArray(existing) ? existing : [];
          const updated = isUpdate
            ? list.map((g) => (String(g.id) === String(existingId) ? { ...g, ...saved } : g))
            : [saved, ...list];
          if (isUpdate && !updated.some((g) => String(g.id) === String(existingId))) {
            updated.unshift(saved);
          }
          localStorage.setItem('tpprover_user_goals', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('tpp:user-goals-updated', { detail: { goals: updated } }));
        } catch { /* ignore */ }
        if (!isUpdate) {
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: 'Goal added', type: 'success' },
          }));
        }
        return saved.id;
      }
      default:
        return existingId || null;
    }
  };

  const updateForm = (updates) => {
    setWalkthrough((prev) => ({ ...prev, form: { ...prev.form, ...updates } }));
  };

  const seedDefaultsForStep = (step, form) => {
    if (step?.type === 'contacts') {
      if (Array.isArray(form.contacts) && form.contacts.length) return form;
      return { ...form, contacts: normalizeVendorContacts(form) };
    }
    if (step?.type === 'goal-dates') {
      if (!form.startDate) {
        return { ...form, startDate: todayISO() };
      }
      return form;
    }
    if (step?.type === 'payment-methods') {
      if (form.payments && typeof form.payments === 'object') return form;
      return { ...form, payments: normalizeVendorPayments(form) };
    }
    if (step?.type === 'rating-labels') {
      let next = form;
      if (next.rating == null && step.defaultValue?.rating != null) {
        next = { ...next, rating: step.defaultValue.rating };
      }
      if (!Array.isArray(next.labels)) {
        next = { ...next, labels: step.defaultValue?.labels || [] };
      }
      return next;
    }
    let next = form;
    if (step?.categoryField && form[step.categoryField] == null && step.categoryDefault != null) {
      next = { ...next, [step.categoryField]: step.categoryDefault };
    }
    if (!step?.field) return next;
    if (next[step.field] != null) return next;
    if (step.defaultValue == null) return next;
    return { ...next, [step.field]: step.defaultValue };
  };

  const canProceed = (() => {
    if (isIntroStep || isReviewStep) return true;
    if (!wtStep) return true;
    if (wtStep.optional) return true;
    if (['chips', 'chips-multi', 'chips-multi-days', 'toggle-group', 'category-grid', 'tags', 'stars', 'rating-labels', 'contacts', 'payment-methods', 'goal-dates', 'goal-target'].includes(wtStep.type)) {
      return true;
    }
    if (wtStep.type === 'name-chips' || wtStep.type === 'goal-compose') {
      return !!(walkthrough.form[wtStep.field]?.toString().trim());
    }
    const val = walkthrough.form[wtStep.field];
    return !!(val?.toString().trim());
  })();

  const nameChipPicks = wtStep?.picks === 'supplements'
    ? ONBOARDING_SUPPLEMENT_PICKS
    : ONBOARDING_PROTOCOL_NAME_PICKS;

  const customNameSuggestions = (
    customNameMode && (walkthrough.form.name || '').trim()
      ? (wtStep?.picks === 'supplements'
        ? searchCommonSupplements(walkthrough.form.name, 8)
        : searchCommonProtocolNames(walkthrough.form.name, 8))
      : []
  );

  const textSuggestItems = (
    wtStep?.type === 'text'
    && wtStep?.suggest === 'medications'
    && showCustomSuggestions
    && (walkthrough.form[wtStep.field] || '').trim()
      ? searchCommonMedications(walkthrough.form[wtStep.field], 10)
      : []
  );

  const goalSuggestions = (() => {
    if (wtStep?.type !== 'goal-compose' || !showCustomSuggestions) return [];
    const q = (walkthrough.form.text || '').trim();
    if (q) return searchCommonGoalTemplates(q, 6);
    return LINKED_TYPES.filter((lt) => lt.id !== null).map((lt) => ({
      id: lt.id,
      name: lt.label,
      description: 'Auto-track from your logged data',
      category: lt.category,
      linkedType: lt.id,
      _isLinkedTypeShortcut: true,
    }));
  })();

  const applyGoalSuggestion = (t) => {
    const linkedMeta = LINKED_TYPES.find((lt) => lt.id === (t.linkedType ?? null));
    updateForm({
      text: t._isLinkedTypeShortcut
        ? ((walkthrough.form.text || '').trim() || t.name)
        : (t.id === 'manual' ? '' : t.name),
      category: t.category || linkedMeta?.category || walkthrough.form.category || 'General',
      linkedType: t.linkedType ?? null,
      linkedTarget: t.linkedType === 'complianceGrade' ? 'A' : '',
      linkedMarkerKey: '',
      linkedMarkerName: '',
      linkedMarkerUnit: '',
    });
    setShowCustomSuggestions(false);
  };

  const handleWalkthroughNext = () => {
    if (isReviewStep) {
      const hasData = current.id === 'goals'
        ? walkthrough.form.text?.trim()
        : walkthrough.form.name?.trim();
      const existingId = sectionDrafts[current.id]?.entityId || null;
      const entityId = hasData
        ? saveWalkthroughItem(current.id, walkthrough.form, existingId)
        : existingId;
      const nextDrafts = {
        ...sectionDrafts,
        [current.id]: {
          form: { ...walkthrough.form },
          entityId: entityId || existingId || null,
        },
      };
      setSectionDrafts(nextDrafts);
      advanceQueue(queue, queueIndex, nextDrafts);
      return;
    }

    // Seed defaults for choice steps before advancing
    let nextForm = seedDefaultsForStep(wtStep, walkthrough.form);
    if (wtStep?.type === 'text+unit' && wtStep.unitField && !nextForm[wtStep.unitField]) {
      nextForm = { ...nextForm, [wtStep.unitField]: wtStep.defaultUnit };
    }
    if (wtStep?.qtyUnitField && !nextForm[wtStep.qtyUnitField] && wtStep.qtyDefaultUnit) {
      nextForm = { ...nextForm, [wtStep.qtyUnitField]: wtStep.qtyDefaultUnit };
    }
    if (wtStep?.type === 'cost+per' && wtStep.unitField && !nextForm[wtStep.unitField]) {
      const fromQty = (wtStep.unitOptions || []).includes(nextForm.unit)
        ? nextForm.unit
        : (wtStep.defaultUnit || 'vial');
      nextForm = {
        ...nextForm,
        [wtStep.unitField]: fromQty,
      };
    }
    if (wtStep?.typeField && !nextForm[wtStep.typeField] && wtStep.typeDefault) {
      nextForm = { ...nextForm, [wtStep.typeField]: wtStep.typeDefault };
    }

    if (walkthrough.stepIndex < wtSteps.length - 1) {
      let nextIndex = walkthrough.stepIndex + 1;
      while (
        nextIndex < wtSteps.length
        && wtSteps[nextIndex]?.type === 'goal-target'
        && !goalNeedsFollowUp(nextForm.linkedType)
      ) {
        nextIndex += 1;
      }
      setWalkthrough((prev) => ({
        ...prev,
        form: nextForm,
        stepIndex: nextIndex,
      }));
    }
  };

  const handleWalkthroughBack = () => {
    if (walkthrough.stepIndex > 0) {
      setCustomNameMode(false);
      setShowCustomSuggestions(false);
      let prevIndex = walkthrough.stepIndex - 1;
      while (
        prevIndex >= 0
        && wtSteps[prevIndex]?.type === 'goal-target'
        && !goalNeedsFollowUp(walkthrough.form.linkedType)
      ) {
        prevIndex -= 1;
      }
      if (prevIndex >= 0) {
        setWalkthrough((prev) => ({ ...prev, stepIndex: prevIndex }));
        return;
      }
      // Fall through to leave section if we skipped past the start
    }

    // Leaving this section — stash answers so forward/back restores them
    const nextDrafts = {
      ...sectionDrafts,
      [current.id]: {
        form: { ...walkthrough.form },
        entityId: sectionDrafts[current.id]?.entityId || null,
      },
    };
    setSectionDrafts(nextDrafts);

    if (queueIndex <= 0) {
      setNavDirection(-1);
      setQueue([]);
      setQueueIndex(-1);
      resetWalkthroughUi();
    } else {
      openSectionAt(queue, queueIndex - 1, nextDrafts, -1);
    }
  };

  const handleWalkthroughSkip = () => {
    // Intro: skip the whole section. Questions: skip this step only.
    // Review: leave without saving.
    if (isIntroStep || isReviewStep) {
      const nextDrafts = {
        ...sectionDrafts,
        [current.id]: {
          form: { ...walkthrough.form },
          entityId: sectionDrafts[current.id]?.entityId || null,
        },
      };
      setSectionDrafts(nextDrafts);
      advanceQueue(queue, queueIndex, nextDrafts);
      return;
    }
    handleWalkthroughNext();
  };

  // Shared field chrome
  const fieldClass = 'w-full px-4 py-3.5 rounded-2xl border text-base font-medium outline-none transition-shadow';
  const focusHandlers = {
    onFocus: (e) => {
      e.target.style.borderColor = primary;
      e.target.style.boxShadow = `0 0 0 2px ${primary}33`;
    },
    onBlur: (e) => {
      e.target.style.borderColor = border;
      e.target.style.boxShadow = 'none';
    },
  };

  const chipButton = (active, label, onClick, key) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className="px-4 py-2.5 rounded-full text-sm font-semibold border transition-colors active:scale-95"
      style={{
        backgroundColor: active ? primary : cardBg,
        borderColor: active ? primary : border,
        color: active ? (theme?.textOnPrimary || '#fff') : text,
        boxShadow: active ? `0 0 0 2px ${primary}33` : undefined,
      }}
    >
      {label}
    </button>
  );

  // ─── Step content renderer ─────────────────────────────────────────
  const renderStepContent = (step, form) => {
    if (step?.type === 'intro') {
      return (
        <div className="text-center">
          {current?.art && (
            <div className="w-64 h-64 sm:w-72 sm:h-72 mx-auto mb-4 flex items-center justify-center">
              <img
                src={current.art}
                alt=""
                className="w-full h-full object-contain"
                draggable={false}
                style={{ mixBlendMode: theme?.isDark ? 'screen' : 'multiply' }}
              />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-black leading-tight text-center mb-3" style={{ color: text }}>
            {step.title}
          </h1>
          {step.subtitle && (
            <p className="text-base leading-relaxed max-w-xs mx-auto" style={{ color: muted }}>
              {step.subtitle}
            </p>
          )}
        </div>
      );
    }

    if (!step || step.type === 'review') {
      // Stockpile review mirrors On Hand StockpileGroupCard chrome
      if (current?.id === 'stockpile') {
        const name = (form.name || '').trim() || 'Untitled';
        const iconId = inferPurposeIconFromCompound(name);
        const PurposeIcon = iconId ? getPurposeIconComponent(iconId) : Package;
        const iconColor = iconId ? getPurposeIconColor(iconId) : primary;
        const mg = form.mg?.toString().trim() || '?';
        const mgUnit = form.mgUnit || 'mg';
        const qty = form.quantity?.toString().trim() || '1';
        const unit = form.unit || 'vial';
        const vendor = form.vendor?.trim() || '—';
        const cost = form.cost?.trim();
        const priceUnit = form.priceUnit || unit;
        const mgNum = Number(mg);
        const qtyNum = Number(qty);
        const totalStock = Number.isFinite(mgNum) && Number.isFinite(qtyNum) && qtyNum > 0
          ? Math.round(mgNum * qtyNum * 100) / 100
          : mg;
        return (
          <div
            className="rounded-2xl p-3 sm:p-3.5"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${border}`,
              boxShadow: theme?.isDark
                ? '0 8px 24px rgba(0,0,0,0.35)'
                : '0 8px 24px rgba(0,0,0,0.06)',
            }}
          >
            <div className="flex items-center gap-2 mb-3 min-w-0">
              <div
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl"
                style={{ backgroundColor: `${iconColor}22` }}
              >
                <PurposeIcon
                  size={22}
                  weight={PURPOSE_ICON_WEIGHT}
                  style={{ color: iconColor }}
                  aria-hidden
                />
              </div>
              <h3
                className="flex-1 min-w-0 font-semibold truncate text-lg"
                style={{ color: text, fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.01em' }}
                title={name}
              >
                {name}
              </h3>
              <div className="flex items-baseline gap-1 flex-shrink-0">
                <span
                  className="text-xl font-black leading-none tracking-tight"
                  style={{ color: primary, fontFamily: 'Poppins, sans-serif' }}
                >
                  {totalStock}
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wide opacity-70"
                  style={{ color: text, fontFamily: 'Poppins, sans-serif' }}
                >
                  {mgUnit}
                </span>
              </div>
            </div>

            <div
              className="rounded-xl border overflow-hidden"
              style={{
                borderColor: theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                backgroundColor: `${primary}08`,
                borderLeftColor: primary,
                borderLeftWidth: '3px',
              }}
            >
              <div className="flex items-center gap-2 px-3 py-2.5 min-h-[48px]">
                <span
                  className="flex-1 min-w-0 text-sm font-bold truncate"
                  style={{ color: text, fontFamily: 'Poppins, sans-serif' }}
                  title={vendor}
                >
                  {vendor}
                </span>
                <span className="text-sm font-bold flex-shrink-0" style={{ color: text, opacity: 0.72 }}>
                  {mg}{mgUnit}
                </span>
                <span
                  className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
                  style={{
                    color: theme?.isDark ? 'rgba(226,232,240,0.72)' : 'rgba(47,59,58,0.68)',
                    backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  {qty} {getUnitLabel(unit, qty)}
                </span>
              </div>
            </div>

            {cost ? (
              <p
                className="mt-2.5 text-xs font-semibold text-center"
                style={{ color: muted, fontFamily: 'Poppins, sans-serif' }}
              >
                ${cost} / {priceUnit}
              </p>
            ) : null}
          </div>
        );
      }

      // Orders review mirrors Orders page card chrome
      if (current?.id === 'orders') {
        const itemName = (form.name || '').trim() || 'Untitled';
        const vendor = form.vendor?.trim() || '—';
        const typeRaw = (form.type || 'domestic').toLowerCase();
        const typeLabel = typeRaw === 'international'
          ? 'International'
          : typeRaw === 'groupbuy'
            ? 'Group buy'
            : 'Domestic';
        const status = form.status || 'Order Placed';
        const statusLower = status.toLowerCase();
        const statusStep = statusLower.includes('deliver')
          ? 3
          : (statusLower.includes('ship') || statusLower.includes('transit') ? 2 : 1);
        const accent = statusLower.includes('deliver')
          ? (theme?.success || '#8ca68c')
          : (statusLower.includes('ship') || statusLower.includes('transit')
            ? (theme?.isDark ? '#60a5fa' : '#2563eb')
            : primary);
        const mg = form.mg?.toString().trim();
        const mgUnit = form.mgUnit || 'mg';
        const qty = form.quantity?.toString().trim();
        const unit = form.unit || 'vial';
        const price = form.price?.trim();
        const todayLabel = formatMMDDYYYY(getLocalDateString()) || formatMMDDYYYY(new Date());
        const timelineSteps = [
          { key: 'placed', label: 'Placed', Icon: CreditCard },
          { key: 'transit', label: 'In transit', Icon: Truck },
          { key: 'delivered', label: 'Delivered', Icon: HouseLine },
        ];
        const lineColor = theme?.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

        return (
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${border}`,
              boxShadow: theme?.isDark
                ? '0 8px 24px rgba(0,0,0,0.35)'
                : '0 8px 24px rgba(0,0,0,0.06)',
            }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
              style={{ backgroundColor: accent, opacity: 0.95 }}
              aria-hidden
            />
            <div className="relative pl-4 pr-4 pt-4 pb-3">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    color: text,
                    border: `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                  }}
                >
                  New
                </span>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: `${primary}18`,
                    color: theme?.primaryDark || primary,
                    border: `1px solid ${primary}30`,
                  }}
                >
                  {typeLabel}
                </span>
              </div>

              <h3 className="font-bold text-lg leading-tight truncate" style={{ color: text }}>
                {itemName}
              </h3>

              <div className="mt-3 mb-0.5" aria-label="Order status progress">
                <div className="flex items-start w-full">
                  {timelineSteps.map((st, idx) => {
                    const n = idx + 1;
                    const complete = statusStep >= n;
                    const lineComplete = statusStep > n;
                    const StepIcon = st.Icon;
                    return (
                      <React.Fragment key={st.key}>
                        <div className="flex flex-col items-center w-[4.5rem] sm:w-24 shrink-0">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-full border-2"
                            style={{
                              borderColor: complete ? primary : lineColor,
                              backgroundColor: complete ? `${primary}22` : 'transparent',
                              color: complete ? (theme?.primaryDark || text) : muted,
                            }}
                          >
                            {StepIcon ? (
                              <StepIcon
                                size={20}
                                weight="duotone"
                                aria-hidden
                                style={{ opacity: complete ? 1 : 0.35 }}
                              />
                            ) : complete ? (
                              <LucideCheck className="h-5 w-5" strokeWidth={3} />
                            ) : (
                              <Circle className="h-2.5 w-2.5 opacity-40" fill="currentColor" />
                            )}
                          </div>
                          <span
                            className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-center leading-tight px-0.5"
                            style={{ color: complete ? text : muted, opacity: complete ? 1 : 0.65 }}
                          >
                            {st.label}
                          </span>
                        </div>
                        {idx < timelineSteps.length - 1 && (
                          <div className="flex-1 flex items-center pt-[17px] px-0.5 min-w-[8px]">
                            <div
                              className="h-0.5 w-full rounded-full"
                              style={{
                                backgroundColor: lineComplete ? primary : lineColor,
                                opacity: lineComplete ? 0.85 : 1,
                              }}
                              aria-hidden
                            />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3.5 mt-3">
                <div>
                  <div
                    className="text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-2 opacity-65"
                    style={{ color: text }}
                  >
                    <ShoppingBag size={18} strokeWidth={2.25} style={{ color: accent, flexShrink: 0 }} />
                    Contents
                    <div className="h-px flex-1 opacity-25" style={{ backgroundColor: accent }} />
                  </div>
                  <div
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5"
                    style={{
                      backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                    }}
                  >
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: accent, opacity: 0.8 }}
                    />
                    <span className="flex-1 min-w-0 truncate text-[12px] font-medium" style={{ color: text }}>
                      {itemName}
                    </span>
                    {mg ? (
                      <span
                        className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                        style={{
                          backgroundColor: `${accent}18`,
                          color: theme?.primaryDark || accent,
                          border: `1px solid ${accent}25`,
                        }}
                      >
                        {mg}{mgUnit}
                      </span>
                    ) : null}
                    {qty ? (
                      <span
                        className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
                        style={{
                          backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)',
                          color: text,
                        }}
                      >
                        {qty} {getUnitLabel(unit, qty)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div
                    className="text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-2 opacity-75"
                    style={{ color: text }}
                  >
                    <ClipboardList size={18} strokeWidth={2.25} style={{ color: accent, flexShrink: 0 }} />
                    Summary
                    <div className="h-px flex-1 opacity-25" style={{ backgroundColor: accent }} />
                  </div>
                  <div
                    className="relative rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[12px] mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CalendarCheck size={16} weight="duotone" color={accent} style={{ flexShrink: 0 }} />
                        <span className="font-medium truncate tabular-nums" style={{ color: text }}>
                          {todayLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Storefront size={16} weight="duotone" color={accent} style={{ flexShrink: 0 }} />
                        <span className="font-medium truncate" style={{ color: text }}>{vendor}</span>
                      </div>
                    </div>
                    {price ? (
                      <div className="text-center pt-1">
                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-55" style={{ color: text }}>
                          Total
                        </div>
                        <div className="text-xl font-black tabular-nums" style={{ color: text }}>
                          {Number.isFinite(Number(price))
                            ? `$${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : `$${price}`}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Supplements review mirrors Supplements page card chrome
      if (current?.id === 'supplements' || current?.id === 'medications') {
        const name = (form.name || '').trim() || 'Untitled';
        const dose = form.dose?.toString().trim() || '';
        const unit = form.unit || '';
        const doseLabel = [dose, unit].filter(Boolean).join(' ');
        const schedule = Array.isArray(form.schedule) && form.schedule.length ? form.schedule : ['AM'];
        const hasAM = schedule.includes('AM');
        const hasPM = schedule.includes('PM');
        const deliveryKey = String(form.delivery || 'oral').toLowerCase();
        const iconCfg = SUPPLEMENT_DELIVERY_ICONS[deliveryKey] || SUPPLEMENT_DELIVERY_ICONS.oral;
        const DeliveryIcon = iconCfg.Icon;
        const textLight = theme?.textLight || muted;
        const dayLabels = getDayChipLabels(form);

        return (
          <div
            className="relative text-left rounded-[20px] p-3.5 flex flex-col justify-between"
            style={{
              backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.95)',
              border: `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
              boxShadow: theme?.isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 4px 16px rgba(0,0,0,0.04)',
              minHeight: '110px',
            }}
          >
            <div className="relative z-10 w-full flex items-start gap-3 mb-2">
              <DeliveryIcon size={28} color={iconCfg.color} weight="duotone" aria-hidden />
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="font-bold text-sm truncate" style={{ color: text }}>
                  {name}
                </h3>
                {doseLabel ? (
                  <p className="text-xs truncate mt-0.5" style={{ color: textLight }}>
                    {doseLabel}
                  </p>
                ) : null}
              </div>
            </div>

            <div
              className="relative z-10 mt-auto pt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-t"
              style={{ borderColor: theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
                {dayLabels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums"
                    style={{
                      color: textLight,
                      backgroundColor: theme?.isDark ? `${primary}18` : `${primary}0d`,
                      border: `1px solid ${border}`,
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5 shrink-0 items-center">
                {hasAM && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: theme?.isDark ? `${theme?.primaryLight || primary}70` : primary,
                      color: theme?.textOnPrimary || '#fff',
                      border: `1px solid ${theme?.primaryDark || primary}`,
                    }}
                  >
                    <Sun size={14} strokeWidth={2} aria-hidden />
                    AM
                  </span>
                )}
                {hasPM && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: theme?.primaryDark || primary,
                      color: theme?.textOnPrimary || '#fff',
                      border: `1px solid ${theme?.isDark ? `${primary}90` : (theme?.primaryDark || primary)}`,
                    }}
                  >
                    <Moon size={14} strokeWidth={2} aria-hidden />
                    PM
                  </span>
                )}
                {!hasAM && !hasPM && (
                  <span className="text-xs font-medium" style={{ color: textLight }}>
                    Unscheduled
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Vendors review mirrors Vendors page VendorCard
      if (current?.id === 'vendors') {
        const contacts = normalizeVendorContacts(form)
          .map((c) => ({ type: c.type || 'email', value: (c.value || '').trim() }))
          .filter((c) => c.value);
        const vendorPreview = {
          id: 'setup-preview',
          name: (form.name || '').trim() || 'Untitled',
          type: form.type || 'domestic',
          rating: Math.max(0, Math.min(5, Number(form.rating) || 0)),
          contacts,
          labels: Array.isArray(form.labels) ? form.labels : [],
          notes: form.notes?.trim() || '',
          payments: normalizeVendorPayments(form),
          ownerId: OWNER_SELF,
        };
        return (
          <div className="pointer-events-none select-none">
            <VendorCard vendor={vendorPreview} theme={theme} isPublicView hideFooter />
          </div>
        );
      }

      // Goals review mirrors Goals page Active GoalCard
      if (current?.id === 'goals') {
        const goalText = (form.text || '').trim() || 'Untitled goal';
        const snapshot = buildGoalLiveSnapshot({
          metrics,
          protocols,
          supplements,
          reconItems,
          orders,
          stockpile,
          taskCompletion: getTaskCompletion(),
          protocolHistory: getProtocolHistory(),
          labResults: getLabResults(),
        });
        let linkedStartValue = form.linkedStartValue ?? null;
        if (linkedStartValue == null && (form.linkedType === 'weight' || form.linkedType === 'bodyfat')) {
          linkedStartValue = form.linkedType === 'weight' ? snapshot.weight : snapshot.bodyfat;
        }
        const goalPreview = {
          id: 'setup-preview',
          text: goalText,
          title: goalText,
          category: form.category || 'General',
          notes: form.notes?.trim() || '',
          startDate: form.startDate || todayISO(),
          dueDate: form.dueDate || null,
          targetDate: form.dueDate || null,
          completed: false,
          linkedType: form.linkedType || null,
          linkedTarget: form.linkedTarget != null && form.linkedTarget !== ''
            ? form.linkedTarget
            : (form.linkedType === 'complianceGrade' ? 'A' : null),
          linkedMarkerKey: form.linkedMarkerKey || null,
          linkedMarkerName: form.linkedMarkerName || null,
          linkedMarkerUnit: form.linkedMarkerUnit || null,
          linkedStartValue,
        };
        const cardTheme = {
          ...theme,
          text: theme?.text || text,
          textLight: theme?.textLight || muted,
          border: theme?.border || border,
          cardBackground: theme?.cardBackground || cardBg,
          primary,
          background: theme?.background || cardBg,
        };
        const linkedProgress = goalPreview.linkedType
          ? getLinkedGoalProgress(goalPreview, snapshot)
          : null;
        return (
          <div className="pointer-events-none select-none">
            <GoalCard
              goal={goalPreview}
              theme={cardTheme}
              linkedProgress={linkedProgress}
            />
          </div>
        );
      }

      const Icon = current?.icon;
      const fields = getReviewFields(current?.id, form);
      return (
        <div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${border}`,
              borderLeft: `4px solid ${primary}`,
            }}
          >
            <div className="px-4 pt-4 pb-3">
              {Icon && (
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={17} weight={ICON_WEIGHT} color={primary} aria-hidden />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>
                    {current.label}
                  </span>
                </div>
              )}
              {fields.map(({ label, value }, i) => (
                <div
                  key={label}
                  className="flex items-start gap-3 py-2"
                  style={{ borderTop: i > 0 ? `1px solid ${border}` : 'none' }}
                >
                  <span className="text-xs font-semibold w-24 flex-shrink-0 pt-0.5" style={{ color: muted }}>
                    {label}
                  </span>
                  <span className="text-sm font-semibold flex-1 leading-snug" style={{ color: text }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    switch (step.type) {
      case 'name-chips':
        return (
          <div className="space-y-4">
            {!customNameMode && (
              <div className="flex flex-wrap justify-center gap-2">
                {nameChipPicks.map((pick, i) => {
                  const active = form[step.field] === pick.name;
                  return (
                    <motion.button
                      key={pick.id}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3, ease: 'easeOut' }}
                      onClick={() => {
                        const picked = pick.name;
                        const catalogPatch = step.catalogIdField
                          ? { [step.catalogIdField]: pick.id }
                          : {};
                        updateForm({ [step.field]: picked, ...catalogPatch });
                        setTimeout(() => {
                          setWalkthrough((prev) => ({
                            ...prev,
                            form: { ...prev.form, [step.field]: picked, ...catalogPatch },
                            stepIndex: Math.min(prev.stepIndex + 1, wtSteps.length - 1),
                          }));
                        }, 220);
                      }}
                      className="px-4 py-2.5 rounded-full text-sm font-medium border transition-colors active:scale-95"
                      style={{
                        backgroundColor: active ? primary : cardBg,
                        borderColor: active ? primary : border,
                        color: active ? (theme?.textOnPrimary || '#fff') : text,
                        boxShadow: active ? `0 0 0 2px ${primary}33` : undefined,
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {pick.name}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {customNameMode && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative space-y-2"
                data-setup-suggest
              >
                <input
                  type="text"
                  value={form[step.field] || ''}
                  onChange={(e) => {
                    const next = { [step.field]: e.target.value };
                    if (step.catalogIdField) next[step.catalogIdField] = null;
                    updateForm(next);
                    setShowCustomSuggestions(e.target.value.trim().length > 0);
                  }}
                  onBlur={() => setTimeout(() => setShowCustomSuggestions(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canProceed) handleWalkthroughNext();
                  }}
                  placeholder={step.placeholder || 'e.g. GHK-Cu, My Stack…'}
                  className={fieldClass}
                  style={{ backgroundColor: cardBg, borderColor: border, color: text }}
                  autoFocus
                  {...focusHandlers}
                  onFocus={(e) => {
                    focusHandlers.onFocus(e);
                    if ((form[step.field] || '').trim()) setShowCustomSuggestions(true);
                  }}
                />
                {showCustomSuggestions && customNameSuggestions.length > 0 && (
                  <div
                    className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                    style={{
                      backgroundColor: theme?.isDark ? '#1a2028' : '#fff',
                      border: `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }}
                  >
                    {customNameSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const catalogPatch = step.catalogIdField
                            ? { [step.catalogIdField]: item.id }
                            : {};
                          updateForm({ [step.field]: item.name, ...catalogPatch });
                          setShowCustomSuggestions(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-sm hover:opacity-90"
                        style={{
                          color: text,
                          borderBottom: `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                        }}
                      >
                        <span className="font-medium">{item.name}</span>
                        {item.category && (
                          <span className="block text-[11px] opacity-50">{item.category}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCustomNameMode(false);
                    const clearPatch = step.catalogIdField
                      ? { [step.field]: '', [step.catalogIdField]: null }
                      : { [step.field]: '' };
                    updateForm(clearPatch);
                    setShowCustomSuggestions(false);
                  }}
                  className="text-xs opacity-50 hover:opacity-80 block"
                  style={{ color: muted }}
                >
                  ← Back to suggestions
                </button>
              </motion.div>
            )}

            {!customNameMode && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomNameMode(true);
                    const clearPatch = step.catalogIdField
                      ? { [step.field]: '', [step.catalogIdField]: null }
                      : { [step.field]: '' };
                    updateForm(clearPatch);
                  }}
                  className="text-base font-semibold opacity-70 hover:opacity-100 px-4 py-2 rounded-xl"
                  style={{ color: primary }}
                >
                  + Something else…
                </button>
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <div className="relative" data-setup-suggest>
              <input
                key={step.id}
                type="text"
                inputMode={step.inputMode || 'text'}
                value={form[step.field] || ''}
                onChange={(e) => {
                  const next = { [step.field]: e.target.value };
                  if (step.suggest === 'medications') {
                    if (step.catalogIdField) next[step.catalogIdField] = null;
                    next.brandName = '';
                    next.genericName = '';
                    setShowCustomSuggestions(e.target.value.trim().length > 0);
                  }
                  updateForm(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canProceed) handleWalkthroughNext();
                }}
                placeholder={step.placeholder}
                className={fieldClass}
                style={{ backgroundColor: cardBg, borderColor: border, color: text }}
                {...focusHandlers}
                onFocus={(e) => {
                  focusHandlers.onFocus(e);
                  if (step.suggest === 'medications' && (form[step.field] || '').trim()) {
                    setShowCustomSuggestions(true);
                  }
                }}
              />
              {step.suggest === 'medications' && showCustomSuggestions && textSuggestItems.length > 0 && (
                <div
                  className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                  style={{
                    backgroundColor: theme?.isDark ? '#1a2028' : '#fff',
                    border: `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  }}
                >
                  {textSuggestItems.map((med) => (
                    <button
                      key={med.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        const label = formatMedicationLabel(med);
                        updateForm({
                          [step.field]: label,
                          ...(step.catalogIdField ? { [step.catalogIdField]: med.id } : {}),
                          brandName: med.brandName,
                          genericName: med.genericName,
                        });
                        setShowCustomSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm flex items-start gap-2 hover:opacity-90"
                      style={{
                        color: text,
                        borderBottom: `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                      }}
                    >
                      <MagnifyingGlass size={14} className="mt-0.5 shrink-0 opacity-40" />
                      <span>
                        <span className="font-medium">{formatMedicationLabel(med)}</span>
                        {med.category && (
                          <span className="block text-[11px] opacity-50">{med.category}</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {step.typeField && Array.isArray(step.typeOptions) && (
              <div
                className="inline-flex w-full rounded-xl overflow-hidden"
                style={{ backgroundColor: cardBg, border: `1px solid ${border}` }}
              >
                {step.typeOptions.map((opt) => {
                  const toggleVal = form[step.typeField] ?? step.typeDefault;
                  const active = toggleVal === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateForm({ [step.typeField]: opt.value })}
                      className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                      style={{
                        backgroundColor: active
                          ? primary
                          : (theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                        color: active ? (theme?.textOnPrimary || '#fff') : muted,
                        border: 'none',
                        boxShadow: active
                          ? `inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px ${primary}40`
                          : (theme?.isDark
                            ? 'inset 0 1px 2px rgba(0,0,0,0.35)'
                            : 'inset 0 1px 2px rgba(0,0,0,0.08)'),
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
            {step.privacyNote && (
              <p
                className="mt-0 text-[11px] leading-relaxed"
                style={{ color: muted, opacity: 0.72 }}
              >
                Your data is only yours — we never sell or share who you source from.{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="underline underline-offset-2 hover:opacity-100"
                  style={{ color: muted, opacity: 0.9 }}
                >
                  Privacy
                </button>
              </p>
            )}
            {step.categoryField && Array.isArray(step.categoryOptions) && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {step.categoryOptions.map((opt) => {
                  const catVal = form[step.categoryField] ?? step.categoryDefault;
                  const active = catVal === opt.value;
                  const Icon = opt.Icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateForm({ [step.categoryField]: opt.value })}
                      className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl border transition-all active:scale-95"
                      style={{
                        backgroundColor: active ? primary : cardBg,
                        borderColor: active ? primary : border,
                        color: active ? (theme?.textOnPrimary || '#fff') : text,
                        boxShadow: active ? `0 2px 8px ${primary}40` : 'none',
                      }}
                    >
                      {Icon && (
                        <Icon
                          size={24}
                          weight={ICON_WEIGHT}
                          color={active ? (theme?.textOnPrimary || '#fff') : primary}
                        />
                      )}
                      <span className="text-xs font-bold uppercase tracking-wider">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'goal-compose': {
        const catVal = form[step.categoryField] ?? step.categoryDefault ?? 'General';
        const linkedLabel = form.linkedType
          ? (LINKED_TYPES.find((lt) => lt.id === form.linkedType)?.label || form.linkedType)
          : null;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {GOAL_CATEGORIES.map(({ id, label, Icon, color }) => {
                const selected = catVal === id;
                const accent = color || primary;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updateForm({ [step.categoryField]: id })}
                    className="w-full inline-flex justify-center items-center gap-1.5 px-2 py-2 rounded-full text-xs font-semibold transition-all active:scale-95"
                    style={{
                      backgroundColor: selected
                        ? accent
                        : (theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      color: selected ? '#fff' : muted,
                      border: `1px solid ${selected ? accent : border}`,
                    }}
                  >
                    <Icon size={14} weight={selected ? 'fill' : 'duotone'} />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="relative" data-setup-suggest>
              <div className="relative">
                <input
                  type="text"
                  value={form[step.field] || ''}
                  onChange={(e) => {
                    updateForm({ [step.field]: e.target.value });
                    setShowCustomSuggestions(true);
                  }}
                  placeholder={step.placeholder || 'Describe your goal or pick a suggestion'}
                  className={`${fieldClass}${(linkedLabel || (form[step.field] || '').trim()) ? ' pr-12' : ''}`}
                  style={{ backgroundColor: cardBg, borderColor: border, color: text }}
                  {...focusHandlers}
                  onFocus={(e) => {
                    focusHandlers.onFocus(e);
                    setShowCustomSuggestions(true);
                  }}
                  onClick={() => setShowCustomSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canProceed) handleWalkthroughNext();
                  }}
                />
                {(linkedLabel || (form[step.field] || '').trim()) && (
                  <button
                    type="button"
                    aria-label="Clear"
                    onClick={() => {
                      updateForm({
                        [step.field]: '',
                        linkedType: null,
                        linkedTarget: '',
                        linkedMarkerKey: '',
                        linkedMarkerName: '',
                        linkedMarkerUnit: '',
                      });
                      setShowCustomSuggestions(true);
                    }}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-11 rounded-r-2xl hover:opacity-70 transition-opacity"
                    style={{ color: muted }}
                  >
                    <X size={18} weight="bold" />
                  </button>
                )}
              </div>
              {showCustomSuggestions && goalSuggestions.length > 0 && (
                <div
                  className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-52 overflow-y-auto"
                  style={{
                    backgroundColor: theme?.isDark ? (theme?.cardBackground || '#1a2028') : '#fff',
                    border: `1px solid ${border}`,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                  }}
                >
                  {!(form[step.field] || '').trim() && (
                    <div
                      className="px-3 py-1.5 flex items-center gap-1.5"
                      style={{ borderBottom: `1px solid ${border}` }}
                    >
                      <ChartLine size={11} style={{ color: muted }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>
                        Auto-track from data
                      </span>
                    </div>
                  )}
                  {goalSuggestions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="w-full text-left px-3 py-2.5 hover:opacity-90 transition-opacity"
                      style={{ borderBottom: `1px solid ${border}` }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyGoalSuggestion(t)}
                    >
                      <div className="flex items-center gap-2">
                        {t._isLinkedTypeShortcut || t.linkedType
                          ? <ChartLine size={12} style={{ color: primary }} />
                          : <MagnifyingGlass size={12} style={{ color: muted }} />
                        }
                        <span className="text-sm font-semibold" style={{ color: text }}>{t.name}</span>
                      </div>
                      {t.description && (
                        <p className="text-[10px] mt-0.5 pl-5" style={{ color: muted }}>{t.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {linkedLabel && (
                <span
                  className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{
                    backgroundColor: `${primary}22`,
                    color: primary,
                    border: `1px solid ${primary}44`,
                  }}
                >
                  <LightningA size={13} weight="duotone" />
                  Auto-Tracking
                </span>
              )}
            </div>
          </div>
        );
      }

      case 'goal-target': {
        if (!goalNeedsFollowUp(form.linkedType)) {
          return (
            <p className="text-sm" style={{ color: muted }}>
              No target needed for this goal type.
            </p>
          );
        }
        return (
          <LinkedTargetFields
            form={form}
            setForm={(updater) => {
              setWalkthrough((prev) => ({
                ...prev,
                form: typeof updater === 'function'
                  ? updater(prev.form)
                  : { ...prev.form, ...updater },
              }));
            }}
            theme={theme}
          />
        );
      }

      case 'goal-dates': {
        const start = form.startDate || todayISO();
        const due = form.dueDate || '';
        const quickOpts = [
          { label: '30 days', days: 30 },
          { label: '90 days', days: 90 },
        ];
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <GlassmorphismDatePicker
                  value={start}
                  onChange={(dateString) => updateForm({ startDate: dateString || todayISO() })}
                  theme={theme}
                  placeholder="Start Date"
                  outlined
                  label="Start Date"
                  Icon={CalendarX}
                  iconWeight="duotone"
                  customTextColor={theme?.isDark ? null : text}
                  customShadow={theme?.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                />
              </div>
              <div>
                <GlassmorphismDatePicker
                  value={due}
                  onChange={(dateString) => updateForm({ dueDate: dateString || '' })}
                  theme={theme}
                  placeholder="Target Date"
                  outlined
                  label="Target Date"
                  Icon={CalendarX}
                  iconWeight="duotone"
                  customTextColor={theme?.isDark ? null : text}
                  customShadow={theme?.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                />
                <div className="flex gap-1.5 mt-2">
                  {quickOpts.map(({ label, days }) => {
                    const presetDate = addDaysISO(start, days);
                    const selected = due === presetDate;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => updateForm({ dueDate: presetDate, startDate: start })}
                        className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                        style={{
                          backgroundColor: selected
                            ? `${primary}22`
                            : (theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                          color: selected ? primary : muted,
                          border: `1px solid ${selected ? `${primary}40` : border}`,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="text-xs" style={{ color: muted }}>
              Optional — you can add dates later
            </p>
          </div>
        );
      }

      case 'text-pair':
        return (
          <div className="space-y-3">
            {(step.fields || []).map((f, idx) => (
              <div key={f.field} className="space-y-1.5">
                {f.label && (
                  <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: muted }}>
                    {f.label}
                  </label>
                )}
                <input
                  type="text"
                  inputMode={f.inputMode || 'text'}
                  value={form[f.field] || ''}
                  onChange={(e) => updateForm({ [f.field]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canProceed && idx === (step.fields.length - 1)) {
                      handleWalkthroughNext();
                    }
                  }}
                  placeholder={f.placeholder}
                  className={fieldClass}
                  style={{ backgroundColor: cardBg, borderColor: border, color: text }}
                  {...focusHandlers}
                />
              </div>
            ))}
          </div>
        );

      case 'contacts': {
        const contacts = normalizeVendorContacts(form);
        const setContacts = (next) => {
          updateForm({ contacts: next });
          setOpenContactDropdown(null);
        };
        return (
          <div className="space-y-3">
            {contacts.map((c, idx) => (
              <div key={`contact-${idx}`} className="relative">
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 min-w-0 flex items-stretch rounded-2xl overflow-hidden"
                    style={{
                      border: `1px solid ${border}`,
                      backgroundColor: cardBg,
                    }}
                  >
                    <button
                      type="button"
                      className="border-r flex items-center gap-1.5 px-3 py-3.5 flex-shrink-0"
                      style={{ borderColor: border, color: text }}
                      onClick={() => setOpenContactDropdown((prev) => (prev === idx ? null : idx))}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                        {getVendorContactLabel(c.type)}
                      </span>
                      <CaretDown
                        size={10}
                        className={`transition-transform duration-200 ${openContactDropdown === idx ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <input
                      type="text"
                      value={c.value || ''}
                      onChange={(e) => {
                        const next = contacts.map((row, i) => (
                          i === idx ? { ...row, value: e.target.value } : row
                        ));
                        updateForm({ contacts: next });
                      }}
                      onFocus={() => setOpenContactDropdown(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && canProceed) handleWalkthroughNext();
                      }}
                      placeholder={getVendorContactPlaceholder(c.type)}
                      className="flex-1 min-w-0 px-3 py-3.5 text-base font-medium outline-none bg-transparent"
                      style={{ color: text }}
                    />
                  </div>
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setContacts(contacts.filter((_, i) => i !== idx))}
                      className="text-xs font-semibold px-2 py-2 opacity-50 hover:opacity-100"
                      style={{ color: muted }}
                      aria-label="Remove contact"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {openContactDropdown === idx && (
                  <div
                    className="absolute left-0 mt-1 rounded-xl overflow-hidden border shadow-lg max-h-56 overflow-y-auto"
                    style={{
                      top: '100%',
                      zIndex: 50,
                      backgroundColor: theme?.isDark ? 'rgba(24, 28, 36, 0.98)' : '#fff',
                      borderColor: theme?.isDark ? 'rgba(255,255,255,0.1)' : border,
                      width: '168px',
                    }}
                  >
                    {VENDOR_CONTACT_TYPES.map((option, i, arr) => (
                      <button
                        key={option.value}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const next = contacts.map((row, j) => (
                            j === idx ? { ...row, type: option.value } : row
                          ));
                          setContacts(next);
                        }}
                        className="w-full text-left px-3 py-2 text-sm font-medium"
                        style={{
                          color: c.type === option.value ? primary : text,
                          backgroundColor: c.type === option.value ? `${primary}12` : 'transparent',
                          borderBottom: i < arr.length - 1
                            ? `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`
                            : 'none',
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setContacts([...contacts, { type: 'email', value: '' }]);
              }}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
              style={{
                backgroundColor: `${primary}15`,
                color: primary,
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <Plus size={16} weight="bold" />
              Another contact
            </button>
          </div>
        );
      }

      case 'payment-methods': {
        const payments = normalizeVendorPayments(form);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {VENDOR_PAYMENT_OPTIONS.map(({ name, key, Icon }) => {
                const active = !!payments[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateForm({
                      payments: { ...payments, [key]: !payments[key] },
                    })}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl transition-all duration-200 active:scale-95"
                    style={{
                      backgroundColor: active
                        ? primary
                        : (theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      border: `1px solid ${active ? (theme?.primaryDark || primary) : border}`,
                      color: active ? (theme?.textOnPrimary || '#fff') : muted,
                      boxShadow: active
                        ? `inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px ${primary}40`
                        : (theme?.isDark
                          ? 'inset 0 1px 2px rgba(0,0,0,0.35)'
                          : 'inset 0 1px 2px rgba(0,0,0,0.08)'),
                    }}
                  >
                    <Icon size={18} className="mb-1.5" style={{ color: active ? (theme?.textOnPrimary || '#fff') : 'inherit' }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{name}</span>
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={payments.notes || ''}
              onChange={(e) => updateForm({
                payments: { ...payments, notes: e.target.value },
              })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canProceed) handleWalkthroughNext();
              }}
              placeholder="Preferences / fees / tips (optional)"
              className={fieldClass}
              style={{ backgroundColor: cardBg, borderColor: border, color: text }}
              {...focusHandlers}
            />
          </div>
        );
      }

      case 'cost+per': {
        const qtyUnit = form.unit;
        const allowed = step.unitOptions || [];
        const seeded = allowed.includes(qtyUnit) ? qtyUnit : (step.defaultUnit || 'vial');
        const unitVal = form[step.unitField] || seeded;
        return (
          <div
            className="flex items-stretch rounded-2xl overflow-hidden"
            style={{
              border: `1px solid ${border}`,
              backgroundColor: cardBg,
              boxShadow: theme?.isDark
                ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                : 'inset 0 1px 2px rgba(0,0,0,0.08)',
            }}
          >
            <span
              className="flex items-center pl-4 pr-1 text-base font-semibold flex-shrink-0"
              style={{ color: muted }}
            >
              $
            </span>
            <input
              key={step.id}
              type="text"
              inputMode="decimal"
              value={form[step.field] || ''}
              onChange={(e) => updateForm({ [step.field]: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter' && canProceed) handleWalkthroughNext(); }}
              placeholder={step.placeholder}
              className="flex-1 min-w-0 py-3.5 pr-1 outline-none text-base font-medium bg-transparent"
              style={{ color: text }}
              aria-label={step.title || step.field}
            />
            <span
              className="flex items-center pr-2 text-[11px] font-medium flex-shrink-0"
              style={{ color: muted }}
            >
              per
            </span>
            <div
              className="flex flex-shrink-0"
              style={{ borderLeft: `1px solid ${border}` }}
            >
              {step.unitOptions.map((opt) => {
                const active = unitVal === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateForm({ [step.unitField]: opt })}
                    className="px-2.5 py-3.5 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95"
                    style={{
                      backgroundColor: active
                        ? primary
                        : (theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      color: active ? (theme?.textOnPrimary || '#fff') : muted,
                      border: 'none',
                      boxShadow: active
                        ? `inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px ${primary}40`
                        : (theme?.isDark
                          ? 'inset 0 1px 2px rgba(0,0,0,0.35)'
                          : 'inset 0 1px 2px rgba(0,0,0,0.08)'),
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'textarea':
        return (
          <textarea
            key={step.id}
            value={form[step.field] || ''}
            onChange={(e) => updateForm({ [step.field]: e.target.value })}
            placeholder={step.placeholder}
            rows={3}
            className={`${fieldClass} resize-none`}
            style={{ backgroundColor: cardBg, borderColor: border, color: text }}
            {...focusHandlers}
          />
        );

      case 'text+unit': {
        const unitVal = form[step.unitField] || step.defaultUnit;
        const qtyNum = Number(form[step.field]);
        const pluralizeContainers = step.unitOptions?.some((o) =>
          ['vial', 'kit', 'bottle', 'tablets'].includes(o)
        );
        const renderUnitRow = ({
          fieldKey,
          value,
          onValueChange,
          placeholder,
          ariaLabel,
          unitField,
          unitVal: activeUnit,
          unitOptions,
          pluralize,
          pluralQty,
        }) => (
          <div
            className="flex items-stretch rounded-2xl overflow-hidden"
            style={{
              border: `1px solid ${border}`,
              backgroundColor: cardBg,
              boxShadow: theme?.isDark
                ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                : 'inset 0 1px 2px rgba(0,0,0,0.08)',
            }}
          >
            <input
              key={fieldKey}
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canProceed) handleWalkthroughNext(); }}
              placeholder={placeholder}
              className="flex-1 min-w-0 py-3.5 pl-4 pr-2 outline-none text-base font-medium bg-transparent"
              style={{ color: text }}
              aria-label={ariaLabel}
            />
            <div
              className="flex flex-shrink-0"
              style={{ borderLeft: `1px solid ${border}` }}
            >
              {unitOptions.map((opt) => {
                const active = activeUnit === opt;
                const label = pluralize
                  ? getUnitLabel(opt, pluralQty > 1 ? pluralQty : 1)
                  : opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateForm({ [unitField]: opt })}
                    className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                    style={{
                      backgroundColor: active
                        ? primary
                        : (theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      color: active ? (theme?.textOnPrimary || '#fff') : muted,
                      border: 'none',
                      boxShadow: active
                        ? `inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px ${primary}40`
                        : (theme?.isDark
                          ? 'inset 0 1px 2px rgba(0,0,0,0.35)'
                          : 'inset 0 1px 2px rgba(0,0,0,0.08)'),
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        );

        const qtyFieldVal = step.qtyField ? (form[step.qtyField] || '') : '';
        const qtyUnitVal = step.qtyUnitField
          ? (form[step.qtyUnitField] || step.qtyDefaultUnit)
          : null;
        const qtyPluralize = step.qtyUnitOptions?.some((o) =>
          ['vial', 'kit', 'bottle', 'tablets'].includes(o)
        );

        return (
          <div className="space-y-3">
            {renderUnitRow({
              fieldKey: `${step.id}-amount`,
              value: form[step.field] || '',
              onValueChange: (v) => updateForm({ [step.field]: v }),
              placeholder: step.placeholder,
              ariaLabel: step.title || step.field,
              unitField: step.unitField,
              unitVal,
              unitOptions: step.unitOptions,
              pluralize: pluralizeContainers,
              pluralQty: qtyNum,
            })}
            {step.qtyField && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium px-0.5" style={{ color: muted }}>
                  Quantity
                </p>
                {renderUnitRow({
                  fieldKey: `${step.id}-qty`,
                  value: qtyFieldVal,
                  onValueChange: (v) => updateForm({ [step.qtyField]: v }),
                  placeholder: step.qtyPlaceholder || '1',
                  ariaLabel: 'Quantity',
                  unitField: step.qtyUnitField,
                  unitVal: qtyUnitVal,
                  unitOptions: step.qtyUnitOptions,
                  pluralize: qtyPluralize,
                  pluralQty: Number(qtyFieldVal),
                })}
              </div>
            )}
          </div>
        );
      }

      case 'chips': {
        const chipVal = form[step.field] ?? step.defaultValue;
        return (
          <div className="flex flex-wrap gap-2">
            {step.options.map((opt) => chipButton(
              chipVal === opt.value,
              opt.label,
              () => updateForm({ [step.field]: opt.value }),
              opt.value
            ))}
          </div>
        );
      }

      case 'chips-multi':
      case 'chips-multi-days': {
        const multiVal = form[step.field] ?? step.defaultValue ?? [];
        const toggleMulti = (opt, active) => {
          const prev = Array.isArray(multiVal) ? multiVal : [];
          let next = active
            ? prev.filter((v) => v !== opt.value)
            : [...prev, opt.value];
          if (step.layout === 'toggle' && next.length === 0 && Array.isArray(step.defaultValue) && step.defaultValue.length) {
            next = [...step.defaultValue];
          }
          updateForm({ [step.field]: next });
        };

        if (step.layout === 'toggle') {
          const daysField = step.daysField;
          const daysVal = daysField
            ? (form[daysField] ?? step.daysDefault ?? [])
            : [];
          return (
            <div className="space-y-4">
              <div
                className="inline-flex w-full rounded-xl overflow-hidden"
                style={{ backgroundColor: cardBg, border: `1px solid ${border}` }}
              >
                {step.options.map((opt) => {
                  const active = Array.isArray(multiVal) && multiVal.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleMulti(opt, active)}
                      className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                      style={{
                        backgroundColor: active
                          ? primary
                          : (theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                        color: active ? (theme?.textOnPrimary || '#fff') : muted,
                        border: 'none',
                        boxShadow: active
                          ? `inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px ${primary}40`
                          : (theme?.isDark
                            ? 'inset 0 1px 2px rgba(0,0,0,0.35)'
                            : 'inset 0 1px 2px rgba(0,0,0,0.08)'),
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {daysField && Array.isArray(step.daysOptions) && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {step.daysOptions.map((opt) => {
                      const active = Array.isArray(daysVal) && daysVal.includes(opt.value);
                      return chipButton(
                        active,
                        opt.label,
                        () => {
                          const prev = Array.isArray(daysVal) ? daysVal : [];
                          const next = active
                            ? prev.filter((v) => v !== opt.value)
                            : [...prev, opt.value];
                          updateForm({ [daysField]: next });
                        },
                        opt.value
                      );
                    })}
                  </div>
                  {step.daysHint && (
                    <p className="text-xs" style={{ color: muted }}>{step.daysHint}</p>
                  )}
                </div>
              )}
              {step.hint && (
                <p className="text-xs" style={{ color: muted }}>{step.hint}</p>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {step.options.map((opt) => {
                const active = Array.isArray(multiVal) && multiVal.includes(opt.value);
                return chipButton(
                  active,
                  opt.label,
                  () => toggleMulti(opt, active),
                  opt.value
                );
              })}
            </div>
            {step.hint && (
              <p className="text-xs" style={{ color: muted }}>{step.hint}</p>
            )}
          </div>
        );
      }

      case 'toggle-group': {
        const toggleVal = form[step.field] ?? step.defaultValue;
        return (
          <div
            className="inline-flex w-full rounded-xl overflow-hidden"
            style={{ backgroundColor: cardBg, border: `1px solid ${border}` }}
          >
            {step.options.map((opt) => {
              const active = toggleVal === opt.value;
              const Icon = opt.Icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateForm({ [step.field]: opt.value })}
                  className={`flex-1 ${Icon ? 'flex flex-col items-center justify-center gap-1 py-3' : 'py-2.5'} text-xs font-bold uppercase tracking-wider transition-all active:scale-95`}
                  style={{
                    backgroundColor: active
                      ? primary
                      : (theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                    color: active ? (theme?.textOnPrimary || '#fff') : muted,
                    border: 'none',
                    boxShadow: active
                      ? `inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px ${primary}40`
                      : (theme?.isDark
                        ? 'inset 0 1px 2px rgba(0,0,0,0.35)'
                        : 'inset 0 1px 2px rgba(0,0,0,0.08)'),
                  }}
                >
                  {Icon && (
                    <Icon
                      size={18}
                      weight={active ? 'fill' : 'duotone'}
                      color={active ? (theme?.textOnPrimary || '#fff') : muted}
                    />
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>
        );
      }

      case 'stars': {
        const rating = Number(form[step.field] || 0);
        return (
          <SetupStarRating
            rating={rating}
            theme={theme}
            onChange={(n) => updateForm({ [step.field]: n })}
          />
        );
      }

      case 'rating-labels': {
        const ratingField = step.ratingField || 'rating';
        const labelsField = step.labelsField || 'labels';
        const rating = Number(form[ratingField] || 0);
        const tags = Array.isArray(form[labelsField]) ? form[labelsField] : [];
        return (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2.5 text-center" style={{ color: muted }}>
                Rating
              </p>
              <SetupStarRating
                rating={rating}
                theme={theme}
                onChange={(n) => updateForm({ [ratingField]: n })}
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: muted }}>
                Labels
              </p>
              <div className="flex flex-wrap gap-2">
                {(step.options || []).map((label) => {
                  const active = tags.includes(label);
                  const chipStyle = getVendorLabelChipStyle(label, active, theme);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        const next = active
                          ? tags.filter((t) => t !== label)
                          : [...tags, label];
                        updateForm({ [labelsField]: next });
                      }}
                      className="px-4 py-2.5 rounded-full text-sm font-semibold border transition-colors active:scale-95"
                      style={{
                        backgroundColor: chipStyle.backgroundColor,
                        borderColor: chipStyle.borderColor,
                        color: chipStyle.color,
                        boxShadow: active ? `0 0 0 2px ${chipStyle.borderColor}55` : undefined,
                        opacity: active ? 1 : 0.92,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'category-grid': {
        const catVal = form[step.field] ?? step.defaultValue;
        return (
          <div className="grid grid-cols-2 gap-2">
            {step.options.map((opt) => {
              const active = catVal === opt.value;
              const Icon = opt.Icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateForm({ [step.field]: opt.value })}
                  className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl border transition-all active:scale-95"
                  style={{
                    backgroundColor: active ? primary : cardBg,
                    borderColor: active ? primary : border,
                    color: active ? (theme?.textOnPrimary || '#fff') : text,
                    boxShadow: active ? `0 2px 8px ${primary}40` : 'none',
                  }}
                >
                  {Icon && (
                    <Icon
                      size={24}
                      weight={ICON_WEIGHT}
                      color={active ? (theme?.textOnPrimary || '#fff') : primary}
                    />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider">{opt.label}</span>
                </button>
              );
            })}
          </div>
        );
      }

      case 'tags': {
        const tags = Array.isArray(form[step.field]) ? form[step.field] : [];
        return (
          <div className="flex flex-wrap gap-2">
            {step.options.map((label) => {
              const active = tags.includes(label);
              const chipStyle = getVendorLabelChipStyle(label, active, theme);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? tags.filter((t) => t !== label)
                      : [...tags, label];
                    updateForm({ [step.field]: next });
                  }}
                  className="px-4 py-2.5 rounded-full text-sm font-semibold border transition-colors active:scale-95"
                  style={{
                    backgroundColor: chipStyle.backgroundColor,
                    borderColor: chipStyle.borderColor,
                    color: chipStyle.color,
                    boxShadow: active ? `0 0 0 2px ${chipStyle.borderColor}55` : undefined,
                    opacity: active ? 1 : 0.92,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        );
      }

      case 'date':
        return (
          <div className="space-y-3">
            <GlassmorphismDatePicker
              value={form[step.field] || ''}
              onChange={(dateString) => updateForm({ [step.field]: dateString || '' })}
              theme={theme}
              placeholder="mm/dd/yyyy"
              outlined
              label="Target date"
              Icon={CalendarX}
              iconWeight="duotone"
              customTextColor={theme?.isDark ? null : text}
              customShadow={theme?.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
            />
            <p className="text-xs" style={{ color: muted }}>
              Optional — you can add a target date later
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const screenTransition = { duration: 0.4, ease: [0.22, 1, 0.36, 1] };
  const screenVariants = {
    enter: (dir) => ({ opacity: 0, x: dir >= 0 ? 28 : -28 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir >= 0 ? -20 : 20 }),
  };

  return (
    <div
      className={`${fillParent ? 'absolute inset-0' : 'fixed inset-0 z-[10020]'} flex flex-col`}
      style={{
        background: bg,
        paddingTop: fillParent ? 0 : 'max(1.5rem, var(--safe-area-top, 0px))',
        paddingBottom: fillParent ? 0 : 'max(1.5rem, var(--safe-area-bottom, 0px))',
      }}
    >
      <div className="flex-1 px-5 pt-8 sm:pt-10 pb-2 min-h-0 flex flex-col max-w-lg mx-auto w-full">

        <div className="flex-1 min-h-0 relative">
          <AnimatePresence mode="sync" initial={false}>
            {!inQueue ? (
              <motion.div
                key="checklist"
                className="absolute inset-0 flex flex-col justify-center overflow-y-auto"
                custom={navDirection}
                variants={screenVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={screenTransition}
              >
              <OnboardingQuestionHeader
                className="mb-6"
                theme={theme}
                align="left"
                title={(
                  <>
                    Good momentum - let&apos;s
                    <br />
                    keep going.
                  </>
                )}
              />

              <div className="flex justify-end mb-2 -mt-3">
                <button
                  type="button"
                  onClick={toggleCheckAll}
                  className="text-xs font-bold uppercase tracking-wider py-1.5 px-1 active:scale-95 transition-opacity hover:opacity-80"
                  style={{ color: primary }}
                >
                  {allChecked ? 'Uncheck all' : 'Check all'}
                </button>
              </div>

              <div className="space-y-2 mb-8">
                {SETUP_ITEMS.map((item, i) => {
                  const Icon = item.icon;
                  const on = Boolean(selected[item.id]);
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => toggle(item.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left"
                      style={{
                        backgroundColor: cardBg,
                        borderColor: on ? primary : border,
                        boxShadow: on ? `0 0 0 1px ${primary}55` : undefined,
                      }}
                    >
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${primary}18`, color: primary }}
                      >
                        <Icon size={22} weight={ICON_WEIGHT} color={primary} aria-hidden />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold" style={{ color: text }}>{item.label}</span>
                        <span className="block text-xs opacity-70" style={{ color: muted }}>{item.description}</span>
                      </span>
                      <span
                        className="w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: on ? primary : 'transparent',
                          borderColor: on ? primary : border,
                          color: '#fff',
                        }}
                      >
                        {on ? <Check size={14} weight="bold" /> : null}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 items-center gap-3 pt-2">
                <div className="flex justify-start">
                  {onBack && (
                    <OnboardingBackButton onClick={onBack} theme={theme} />
                  )}
                </div>
                <div className="flex justify-center" />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="inline-flex items-center gap-2 whitespace-nowrap px-6 py-3 rounded-full text-sm font-bold shadow-md active:scale-95"
                    style={{ backgroundColor: primary, color: theme?.textOnPrimary || '#fff' }}
                  >
                    {anyChecked
                      ? <>Continue <ChevronRight className="w-4 h-4" /></>
                      : 'No thanks!'}
                  </button>
                </div>
              </div>
              </motion.div>
            ) : (
              <motion.div
                key={`walk-${current?.id}-${queueIndex}`}
                className="absolute inset-0 flex flex-col min-h-0"
                custom={navDirection}
                variants={screenVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={screenTransition}
              >
                {(() => {
                  const sectionCount = Math.max(1, queue.length);
                  const stepsInSection = Math.max(1, wtSteps.length);
                  const withinPct = Math.min(
                    100,
                    ((walkthrough.stepIndex + 1) / stepsInSection) * 100
                  );
                  return (
                    <motion.div
                      className="flex-shrink-0 mb-3"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.32, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="flex gap-1.5 mb-1.5 px-1">
                        {queue.map((section, i) => {
                          const fillPct =
                            i < queueIndex
                              ? 100
                              : i === queueIndex
                                ? withinPct
                                : 0;
                          return (
                            <div
                              key={section.id}
                              className="h-1 flex-1 rounded-full overflow-hidden"
                              style={{ backgroundColor: dimProgress }}
                              aria-hidden
                            >
                              <div
                                className="h-full rounded-full transition-all duration-300 ease-out"
                                style={{
                                  width: `${fillPct}%`,
                                  backgroundColor: primary,
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs font-medium px-1" style={{ color: muted }}>
                        {current?.label} · {queueIndex + 1} of {sectionCount}
                      </p>
                    </motion.div>
                  );
                })()}

            <div className="flex-1 min-h-0 relative flex flex-col">
              {/* Prior answers float at top — click to jump back and edit */}
              <div className="absolute top-0 inset-x-0 z-10 space-y-2 overflow-hidden pointer-events-none">
                <AnimatePresence initial={false}>
                  {!isIntroStep && !isReviewStep && wtSteps
                    .slice(0, walkthrough.stepIndex)
                    .filter((s) => {
                      if (s.type === 'intro' || s.type === 'review') return false;
                      if (s.type === 'goal-target' && !goalNeedsFollowUp(walkthrough.form.linkedType)) {
                        return false;
                      }
                      return true;
                    })
                    .slice(-3)
                    .map((s) => {
                      const answer = answerForSetupStep(s, walkthrough.form);
                      const jumpIndex = wtSteps.findIndex((x) => x.id === s.id);
                      const chipTitle = s.type === 'goal-target'
                        ? goalFollowUpTitle(walkthrough.form.linkedType)
                        : s.title;
                      return (
                        <motion.button
                          key={`${current?.id}-chip-${s.id}`}
                          type="button"
                          onClick={() => {
                            if (jumpIndex >= 0) {
                              setWalkthrough((prev) => ({ ...prev, stepIndex: jumpIndex }));
                            }
                          }}
                          className="w-full text-left rounded-xl px-3 py-2.5 border pointer-events-auto backdrop-blur-sm"
                          style={{
                            backgroundColor: theme?.isDark ? 'rgba(20,25,31,0.92)' : 'rgba(255,255,255,0.92)',
                            borderColor: border,
                          }}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4, scale: 0.98 }}
                          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <p
                            className="text-[11px] font-semibold uppercase tracking-wide opacity-55"
                            style={{ color: muted }}
                          >
                            {chipTitle}
                          </p>
                          {answer ? (
                            <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: text }}>
                              {answer}
                            </p>
                          ) : (
                            <p className="text-sm font-medium mt-0.5 opacity-50 italic" style={{ color: muted }}>
                              Skipped
                            </p>
                          )}
                        </motion.button>
                      );
                    })}
                </AnimatePresence>
              </div>

              {/* Active question stays centered */}
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center">
                <div className="w-full">
              {!isIntroStep && (
                <div className={isReviewStep ? 'text-center mb-5' : 'mb-5'}>
                  <h1
                    className={`text-2xl sm:text-3xl font-black leading-tight ${isReviewStep ? 'text-center inline-flex items-center justify-center gap-2' : 'text-left'}`}
                    style={{ color: text }}
                  >
                    {wtStep?.type === 'goal-target'
                      ? goalFollowUpTitle(walkthrough.form.linkedType)
                      : (wtStep?.title || '')}
                    {isReviewStep && wtStep?.successCheck && (() => {
                      const SuccessIcon = wtStep.successIcon || CheckCircle;
                      return (
                        <SuccessIcon
                          size={28}
                          weight="duotone"
                          color={primary}
                          className="flex-shrink-0"
                          aria-hidden
                        />
                      );
                    })()}
                  </h1>
                  {isReviewStep && wtStep?.subtitle && (
                    <p
                      className="mt-2 text-sm leading-relaxed max-w-sm mx-auto"
                      style={{ color: muted }}
                    >
                      {wtStep.subtitle}
                    </p>
                  )}
                </div>
              )}

              <AnimatePresence mode="sync">
                <motion.div
                  key={`${current?.id}-${walkthrough.stepIndex}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-10"
                >
                  {renderStepContent(wtStep, walkthrough.form)}
                </motion.div>
              </AnimatePresence>

              <div className="relative z-0 grid grid-cols-3 items-center gap-3 pt-6">
                <div className="flex justify-start">
                  <OnboardingBackButton onClick={handleWalkthroughBack} theme={theme} />
                </div>
                <div className="flex justify-center">
                  {!isReviewStep && (
                    <button
                      type="button"
                      onClick={handleWalkthroughSkip}
                      className="text-sm font-medium opacity-70 hover:opacity-100"
                      style={{ color: muted }}
                    >
                      Skip for now
                    </button>
                  )}
                </div>
                <div className="flex justify-end">
                  {!isReviewStep ? (
                    <button
                      type="button"
                      onClick={handleWalkthroughNext}
                      disabled={!canProceed}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap px-5 py-3 rounded-full text-sm font-bold shadow-md active:scale-95 transition-opacity"
                      style={{
                        backgroundColor: primary,
                        color: theme?.textOnPrimary || '#fff',
                        opacity: canProceed ? 1 : 0.45,
                      }}
                    >
                      {isIntroStep
                        ? <>Let&apos;s go <ChevronRight className="w-4 h-4" /></>
                        : <>Next <ChevronRight className="w-4 h-4" /></>}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleWalkthroughNext}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap px-5 py-3 rounded-full text-sm font-bold shadow-md active:scale-95"
                      style={{ backgroundColor: primary, color: theme?.textOnPrimary || '#fff' }}
                    >
                      {isLastQueueItem
                        ? 'Finish setup'
                        : <>Keep going <ChevronRight className="w-4 h-4 flex-shrink-0" /></>}
                    </button>
                  )}
                </div>
              </div>
                </div>
              </div>
            </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <OnboardingLogoFooter />

      {showPrivacy && (
        <LandingPrivacyModal
          open={showPrivacy}
          onClose={() => setShowPrivacy(false)}
          theme={theme}
        />
      )}
    </div>
  );
}
