import React from 'react'
import { themes, defaultThemeName } from '../theme/themes'

export default function Announcements() {
  const [themeName] = React.useState(defaultThemeName)
  const theme = themes[themeName]
  const [reactions, setReactions] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('tpprover_ann_reactions') || '{}') } catch { return {} }
  })
  const posts = React.useMemo(() => {
    // simple local list for now; later: admin API or Firestore
    const seed = [
      { id: 'p3', title: 'New: Badges + Streak Tiers', body: 'Streaks and spend badges are live. See Research → Badges.', date: new Date().toISOString().slice(0,10) },
      { id: 'p2', title: 'Vendors Overhaul', body: 'Cards, labels, payments, and import improvements.', date: new Date().toISOString().slice(0,10) },
      { id: 'p1', title: 'Welcome Testers', body: 'Phase 1/2 testers enabled. Thanks for the feedback!', date: new Date().toISOString().slice(0,10) },
    ]
    return seed
  }, [])
  const reactTo = (id, emoji) => {
    setReactions(prev => {
      const next = { ...prev, [id]: { ...(prev[id]||{}), [emoji]: ((prev[id]||{})[emoji]||0) + 1 } }
      try { localStorage.setItem('tpprover_ann_reactions', JSON.stringify(next)) } catch {}
      return next
    })
  }
  return (
    <section className="space-y-4">
      <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
        <div className="font-semibold mb-1" style={{ color: theme.primaryDark }}>Announcements</div>
        <div className="text-xs mb-3" style={{ color: theme.textLight }}>Read‑only updates from admin. React to posts to provide quick feedback.</div>
        <ul className="space-y-3">
          {posts.map(p => (
            <li key={p.id} className="rounded border p-3" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <div className="font-semibold" style={{ color: theme.text }}>{p.title}</div>
                <div className="text-xs" style={{ color: theme.textLight }}>{p.date}</div>
              </div>
              <div className="text-sm mt-1" style={{ color: theme.text }}>{p.body}</div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                {['👍','🎉','💡','❗'].map(e => (
                  <button key={e} className="px-2 py-1 rounded border" style={{ borderColor: theme.border }} onClick={() => reactTo(p.id, e)}>
                    {e} {(reactions[p.id]||{})[e]||0}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}


