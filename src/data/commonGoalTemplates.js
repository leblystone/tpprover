/**
 * Curated goal templates — names/structure only.
 * Never includes target numbers, ranges, or medical advice.
 *
 * `suggested: false` hides a template from empty-state / default suggestion grids
 * while keeping it available for advanced linking in GoalModal.
 */

export const COMMON_GOAL_TEMPLATES = [
  {
    id: 'manual',
    name: 'Write your own',
    category: 'General',
    linkedType: null,
    description: 'A freeform goal you track yourself',
    aliases: ['custom', 'manual', 'other'],
    suggested: true,
  },
  {
    id: 'weight',
    name: 'Reach a target weight',
    category: 'Health',
    linkedType: 'weight',
    description: 'Auto-tracks from your Bio-Metrics weight logs',
    aliases: ['weight', 'lbs', 'scale', 'body weight'],
    suggested: true,
  },
  {
    id: 'bodyfat',
    name: 'Reach a body-fat target',
    category: 'Fitness',
    linkedType: 'bodyfat',
    description: 'Auto-tracks from your Bio-Metrics body-fat entries',
    aliases: ['body fat', 'bf%', 'composition'],
    suggested: false,
  },
  {
    id: 'streak',
    name: 'Build a daily research streak',
    category: 'Lifestyle',
    linkedType: 'streak',
    description: 'Auto-tracks from completing today\'s research tasks',
    aliases: ['streak', 'consistency', 'daily'],
    suggested: true,
  },
  {
    id: 'hydration',
    name: 'Build a hydration streak',
    category: 'Health',
    linkedType: 'hydrationStreak',
    description: 'Auto-tracks from hitting your daily water goal',
    aliases: ['water', 'hydration', 'drink'],
    suggested: true,
  },
  {
    id: 'compliance',
    name: 'Reach Grade A compliance',
    category: 'Research',
    linkedType: 'complianceGrade',
    description: 'Auto-tracks from your 30-day dose compliance',
    aliases: ['compliance', 'grade', 'adherence'],
    suggested: false,
  },
  {
    id: 'doses',
    name: 'Log a total dose milestone',
    category: 'Research',
    linkedType: 'allTimeDoses',
    description: 'Auto-tracks from all logged doses over time',
    aliases: ['doses', 'logged', 'milestone'],
    suggested: false,
  },
  {
    id: 'protocols',
    name: 'Finish N protocols',
    category: 'Research',
    linkedType: 'completedProtocols',
    description: 'Auto-tracks from completed protocol history — you set how many',
    aliases: ['protocol', 'finish', 'complete protocol'],
    suggested: true,
  },
  {
    id: 'budget',
    name: 'Stay under a spending budget',
    category: 'Lifestyle',
    linkedType: 'spendBudget',
    description: 'Auto-tracks from your order spend total',
    aliases: ['budget', 'spend', 'cost', 'money'],
    suggested: true,
  },
  {
    id: 'stock',
    name: 'Clear every low-stock item',
    category: 'Lifestyle',
    linkedType: 'lowStockCleared',
    description: 'Completes when your stockpile has items and nothing is flagged low',
    aliases: ['stock', 'inventory', 'stockpile', 'low stock', 'restock'],
    suggested: true,
  },
  {
    id: 'lab',
    name: 'Track a lab marker trend',
    category: 'Medical',
    linkedType: 'labMarker',
    description: 'Auto-tracks from your own logged lab values (you set the target)',
    aliases: ['lab', 'blood', 'marker', 'panel', 'test'],
    suggested: false,
  },
]

/** Templates shown on Goals empty / suggestion grids. */
export function getSuggestedGoalTemplates() {
  return COMMON_GOAL_TEMPLATES.filter((t) => t.suggested !== false && t.id !== 'manual')
}

/**
 * Rotate suggested templates so the grid stays capped (default 3)
 * and refreshes every `periodDays` calendar days.
 * Stable within a period; excludes linkedTypes already in use when provided.
 */
export function getRotatingSuggestedGoalTemplates({
  limit = 3,
  periodDays = 3,
  usedLinkedTypes = null,
  now = new Date(),
} = {}) {
  let pool = getSuggestedGoalTemplates()
  if (usedLinkedTypes instanceof Set || Array.isArray(usedLinkedTypes)) {
    const used = usedLinkedTypes instanceof Set ? usedLinkedTypes : new Set(usedLinkedTypes)
    pool = pool.filter((t) => !t.linkedType || !used.has(t.linkedType))
  }
  if (pool.length <= limit) return pool

  const utcMidnight = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const dayIndex = Math.floor(utcMidnight / 86400000)
  const period = Math.max(1, Math.floor(Number(periodDays) || 3))
  const offset = (Math.floor(dayIndex / period) * 7) % pool.length

  const rotated = [...pool.slice(offset), ...pool.slice(0, offset)]
  return rotated.slice(0, limit)
}

/**
 * Scored search — same pattern as searchCommonSupplements.
 * Empty query returns a short default list for empty-state / initial suggestions.
 */
export function searchCommonGoalTemplates(query, limit = 8) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) {
    return getSuggestedGoalTemplates().slice(0, limit)
  }
  const scored = []
  for (const item of COMMON_GOAL_TEMPLATES) {
    const name = item.name.toLowerCase()
    const cat = (item.category || '').toLowerCase()
    const aliases = (item.aliases || []).map((a) => a.toLowerCase())
    const desc = (item.description || '').toLowerCase()
    let score = 0
    if (name.startsWith(q) || aliases.some((a) => a.startsWith(q))) score = 3
    else if (name.includes(q) || aliases.some((a) => a.includes(q))) score = 2
    else if (cat.includes(q) || desc.includes(q)) score = 1
    if (score > 0) scored.push({ item, score })
  }
  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
  return scored.slice(0, limit).map((s) => s.item)
}

export function getGoalTemplateById(id) {
  return COMMON_GOAL_TEMPLATES.find((t) => t.id === id) || null
}

export function getGoalTemplateByLinkedType(linkedType) {
  if (!linkedType) return COMMON_GOAL_TEMPLATES.find((t) => t.linkedType == null) || null
  return COMMON_GOAL_TEMPLATES.find((t) => t.linkedType === linkedType) || null
}
