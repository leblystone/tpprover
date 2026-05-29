/**
 * One-off: migrate lucide-react → @phosphor-icons/react in admin components
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const RENAME = [
  ['CheckCircle2', 'CheckCircle'],
  ['ThermometerSnowflake', 'ThermometerCold'],
  ['MessagesSquare', 'ChatsCircle'],
  ['MessageSquare', 'ChatCircle'],
  ['LayoutDashboard', 'SquaresFour'],
  ['FlaskConical', 'Flask'],
  ['AlertTriangle', 'Warning'],
  ['AlertCircle', 'WarningCircle'],
  ['ExternalLink', 'ArrowSquareOut'],
  ['DollarSign', 'CurrencyDollar'],
  ['TrendingDown', 'TrendDown'],
  ['TrendingUp', 'TrendUp'],
  ['RefreshCw', 'ArrowsClockwise'],
  ['RotateCcw', 'ArrowsCounterClockwise'],
  ['ChevronRight', 'CaretRight'],
  ['ChevronDown', 'CaretDown'],
  ['ChevronUp', 'CaretUp'],
  ['ChevronLeft', 'CaretLeft'],
  ['GripVertical', 'DotsSixVertical'],
  ['ArrowDownCircle', 'ArrowCircleDown'],
  ['MailOpen', 'EnvelopeOpen'],
  ['Smartphone', 'DeviceMobile'],
  ['PartyPopper', 'Confetti'],
  ['HelpCircle', 'Question'],
  ['Loader2', 'CircleNotch'],
  ['Loader', 'CircleNotch'],
  ['Trash2', 'Trash'],
  ['LogOut', 'SignOut'],
  ['Edit3', 'PencilLine'],
  ['Edit', 'PencilSimple'],
  ['MessageCircle', 'ChatCircle'],
  ['BarChart3', 'ChartBar'],
  ['Settings2', 'Gear'],
  ['Link2', 'Link'],
  ['Unlink', 'LinkBreak'],
  ['Sparkles', 'Sparkle'],
  ['WifiOff', 'WifiSlash'],
  ['Wifi', 'WifiHigh'],
  ['History', 'ClockCounterClockwise'],
  ['Apple', 'AppleLogo'],
  ['Award', 'Medal'],
  ['Activity', 'Pulse'],
  ['Flame', 'Fire'],
  ['Zap', 'Lightning'],
  ['Search', 'MagnifyingGlass'],
  ['Send', 'PaperPlaneTilt'],
  ['EyeOff', 'EyeSlash'],
  ['Save', 'FloppyDisk'],
  ['Store', 'Storefront'],
  ['Filter', 'Funnel'],
  ['Target', 'Crosshair'],
  ['Bot', 'Robot'],
  ['FileCheck', 'SealCheck'],
  ['Pencil', 'PencilSimple'],
  ['Monitor', 'Desktop'],
  ['Tablet', 'DeviceTablet'],
  ['Sliders', 'SlidersHorizontal'],
  ['Layers', 'Stack'],
  ['Menu', 'List'],
];

const dirs = [
  path.join(root, 'src/components/admin'),
  path.join(root, 'src/components/common/AdminMessageModal.jsx'),
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const stat = fs.statSync(dir);
  if (stat.isFile() && dir.endsWith('.jsx')) return [...files, dir];
  if (!stat.isDirectory()) return files;
  for (const name of fs.readdirSync(dir)) {
    files = walk(path.join(dir, name), files);
  }
  return files;
}

let fileList = walk(path.join(root, 'src/components/admin'));
const adminModal = path.join(root, 'src/components/common/AdminMessageModal.jsx');
if (fs.existsSync(adminModal)) fileList.push(adminModal);

for (const file of fileList) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('lucide-react')) continue;

  src = src.replace(/from ['"]lucide-react['"]/g, "from '@phosphor-icons/react'");
  for (const [from, to] of RENAME) {
    const reImport = new RegExp(`\\b${from}\\b`, 'g');
    src = src.replace(reImport, to);
  }
  src = src.replace(/\s+strokeWidth=\{[^}]+\}/g, '');
  src = src.replace(/\s+strokeWidth="[^"]*"/g, '');
  src = src.replace(/<Loader2\b/g, '<CircleNotch');
  src = src.replace(/<\/Loader2>/g, '</CircleNotch>');

  fs.writeFileSync(file, src);
  console.log('updated', path.relative(root, file));
}

console.log('done');
