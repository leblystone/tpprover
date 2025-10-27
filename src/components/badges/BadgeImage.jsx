import React from 'react'
import { Award, Trophy, Star, Target, Shield, PackageCheck, ClipboardList, FlaskConical, Archive, Pill, BookOpen, DollarSign, TrendingUp, Landmark, Flame, Gem, Beaker, Atom, Users, Crown } from 'lucide-react'
import { Zap } from '../../icons/lucide-safe'

function hashString(input) {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

const SHAPES = {
  shield: 'polygon(50% 0%, 95% 20%, 95% 60%, 50% 100%, 5% 60%, 5% 20%)',
  circle: 'circle(50% at 50% 50%)',
  hexagon: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
};

function pickShape(name) {
    if (typeof name !== 'string' || !name) return Object.values(SHAPES)[0];
    const hash = hashString(name);
    const shapes = Object.values(SHAPES);
    return shapes[hash % shapes.length];
}

function pickIcon(name) {
  if (typeof name !== 'string' || !name) return Award;
  const key = name.toLowerCase()
  if (key.includes('delivery')) return PackageCheck;
  if (key.includes('investor')) return Landmark;
  if (key.includes('homeostat')) return TrendingUp;
  if (key.includes('protocol') || key.includes('planner')) return ClipboardList;
  if (key.includes('stocked')) return Archive;
  if (key.includes('supplement') || key.includes('scholar')) return Pill;
  if (key.includes('streak v') || key.includes('axiom')) return Gem;
  if (key.includes('streak iv') || key.includes('progenitor')) return Flame;
  if (key.includes('streak ii') || key.includes('vector')) return Zap;
  if (key.includes('streak')) return Star;
  if (key.includes('catalyst')) return Beaker;
  if (key.includes('founders')) return Crown;
  return Award;
}

function chooseFinish(name, theme) {
    if (typeof name !== 'string' || !name) return { start: theme?.accent, mid: theme?.primary, end: theme?.primaryDark, border: theme?.primaryDark };
    const n = name.toLowerCase();
    const gold = { start: '#FFDE7A', mid: '#FFC43A', end: '#B8860B', border: '#8B6914' };
    const silver = { start: '#F3F4F6', mid: '#CDD3DD', end: '#9AA3AE', border: '#6B7280' };
    const bronze = { start: '#D29A72', mid: '#A0522D', end: '#8B4513', border: '#5E2F0E' };
    const defaultFinish = { start: theme?.accent, mid: theme?.primary, end: theme?.primaryDark, border: theme?.primaryDark };

    if (['the investor', 'streak v – the axiom', 'the founders circle'].some(s => n.includes(s))) return gold;
    if (['the homeostat', 'streak iv – the progenitor', 'the catalyst'].some(s => n.includes(s))) return silver;
    if (['first delivery', 'streak i – the apprentice'].some(s => n.includes(s))) return bronze;
    
    const hash = hashString(name);
    const finishes = [defaultFinish, bronze, silver];
    return finishes[hash % finishes.length];
}

const BadgeBackgroundPattern = ({ name, color }) => {
    const hash = hashString(name);
    const patternType = hash % 3;
    const patternId = `pattern-${name.replace(/[^a-z0-9]/gi, '')}`;

    if (patternType === 0) { // diagonal stripes
        return (
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
                <defs>
                    <pattern id={patternId} patternUnits="userSpaceOnUse" width="8" height="8">
                        <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke={color} strokeWidth="1" opacity="0.2" />
                    </pattern>
                </defs>
            </svg>
        );
    }
    if (patternType === 1) { // dots
         return (
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
                <defs>
                    <pattern id={patternId} patternUnits="userSpaceOnUse" width="10" height="10">
                        <circle cx="5" cy="5" r="1.5" fill={color} opacity="0.3" />
                    </pattern>
                </defs>
            </svg>
        );
    }
    // waves
    return (
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
            <defs>
                <pattern id={patternId} patternUnits="userSpaceOnUse" width="20" height="10">
                    <path d="M 0 5 C 5 0, 15 10, 20 5" stroke={color} fill="none" strokeWidth="1" opacity="0.2"/>
                </pattern>
            </defs>
        </svg>
    );
}


export default function BadgeImage({ name, size = 72, theme, caption = true, iconUrl, iconSizeFactor = 0.6, isEarned = false }) {
  // Failsafe for missing name prop
  if (typeof name !== 'string' || !name) {
    return null; // or a placeholder component
  }

  const Icon = pickIcon(name)
  const finish = chooseFinish(name, theme)
  const w = size
  const h = size
  
  let customIcon = iconUrl
  try {
    if (!customIcon) {
      const map = JSON.parse(localStorage.getItem('tpprover_badge_icons') || '{}')
      if (map && map[name]) customIcon = String(map[name])
    }
  } catch {}

  // Modern badge design
  const badgeStyle = {
    width: w,
    height: h,
    borderRadius: '50%',
    background: isEarned 
      ? `linear-gradient(135deg, ${finish.start} 0%, ${finish.mid} 50%, ${finish.end} 100%)`
      : `linear-gradient(135deg, ${theme.border} 0%, #f3f4f6 50%, #e5e7eb 100%)`,
    border: `2px solid ${isEarned ? finish.border : theme.border}`,
    boxShadow: isEarned 
      ? `0 4px 12px ${finish.border}30, inset 0 1px 3px rgba(255,255,255,0.3)`
      : '0 2px 6px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'all 0.3s ease'
  }

  const iconColor = isEarned ? '#ffffff' : theme.text + '80'

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: w }} title={name}>
      <div style={badgeStyle}>
        {/* Subtle inner glow for earned badges */}
        {isEarned && (
          <div
            style={{
              position: 'absolute',
              inset: '4px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${finish.start}20 0%, transparent 70%)`,
              pointerEvents: 'none'
            }}
          />
        )}
        
        {customIcon ? (
          <img 
            src={customIcon} 
            alt="" 
            style={{ 
              width: Math.round(size * iconSizeFactor), 
              height: Math.round(size * iconSizeFactor), 
              objectFit: 'contain',
              filter: isEarned ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : 'grayscale(60%) opacity(70%)',
              transition: 'all 0.3s ease'
            }} 
          />
        ) : (
          <Icon 
            color={iconColor} 
            size={Math.round(size * iconSizeFactor)} 
            strokeWidth={1.5} 
            style={{ 
              filter: isEarned ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : 'none',
              transition: 'all 0.3s ease'
            }}
          />
        )}
      </div>
      
      {caption && (
        <div
          className="text-center font-semibold"
          style={{
            fontSize: '0.7rem',
            color: theme.text,
            maxWidth: '100%',
            whiteSpace: 'normal',
            lineHeight: 1.1,
          }}
        >
          {name}
        </div>
      )}
    </div>
  )
}


