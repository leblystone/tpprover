import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import { Megaphone, Sparkles, Wrench, Users } from 'lucide-react'
import { formatMMDDYYYY } from '../utils/date'
import announcementsData from '../announcements.json';

export default function Announcements() {
  const { theme } = useOutletContext()

  const categoryStyles = {
    'New Feature': { icon: Sparkles, color: theme.info, bg: theme.infoBg || theme.accent },
    'Improvement': { icon: Wrench, color: theme.success, bg: theme.successBg || theme.accent },
    'Community': { icon: Users, color: theme.warning, bg: theme.warningBg || theme.accent },
    'General': { icon: Megaphone, color: theme.textLight, bg: theme.secondary },
  }

  const [reactions, setReactions] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('tpprover_ann_reactions') || '{}') } catch { return {} }
  })
  React.useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'tpprover_ann_reactions') {
        try { setReactions(JSON.parse(localStorage.getItem('tpprover_ann_reactions') || '{}')) } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  const posts = React.useMemo(() => {
    return announcementsData;
  }, [])

  const [filter, setFilter] = React.useState('All')
  const filteredPosts = posts.filter(p => filter === 'All' || p.category === filter)

  const reactTo = (id, emoji) => {
    setReactions(prev => {
      const next = { ...prev, [id]: { ...(prev[id]||{}), [emoji]: ((prev[id]||{})[emoji]||0) + 1 } }
      try { localStorage.setItem('tpprover_ann_reactions', JSON.stringify(next)) } catch {}
      return next
    })
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>Announcements</h1>
        <p className="text-sm" style={{ color: theme.textLight }}>Updates from the team. React to posts to share your feedback.</p>
      </div>

      <div className="flex items-center gap-2">
        {['All', 'New Feature', 'Improvement', 'Community', 'General'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors`}
            style={{ 
              backgroundColor: filter === cat ? theme.primary : 'transparent', 
              color: filter === cat ? theme.textOnPrimary : theme.text 
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredPosts.map(p => {
          const CatIcon = categoryStyles[p.category]?.icon || Megaphone
          const catColor = categoryStyles[p.category]?.color || '#6b7280'
          const catBg = categoryStyles[p.category]?.bg || '#f9fafb'
          return (
            <div key={p.id} className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: catBg, color: catColor }}>
                    <CatIcon className="h-4 w-4" />
                    {p.category}
                  </span>
                  <div className="text-xs" style={{ color: theme.textLight }}>{formatMMDDYYYY(p.date)}</div>
                </div>
                <h3 className="font-semibold text-lg" style={{ color: theme.text }}>{p.title}</h3>
                <p className="text-sm mt-1" style={{ color: theme.textLight }}>{p.body}</p>
              </div>
              <div className="px-5 py-3 border-t" style={{ borderColor: theme.border, backgroundColor: theme.secondary }}>
                <div className="flex items-center gap-2">
                  {['👍','🎉','💡','❗'].map(e => (
                    <button key={e} className="px-3 py-1.5 rounded-full border text-sm hover:border-gray-400 transition-colors" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }} onClick={() => reactTo(p.id, e)}>
                      <span className="text-lg align-middle">{e}</span>
                      <span className="ml-1.5 text-xs font-semibold">{(reactions[p.id]||{})[e]||0}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}


