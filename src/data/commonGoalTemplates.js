/**
 * Curated goal templates — names/structure only.
 * Never includes target numbers, ranges, or medical advice.
 */

export const COMMON_GOAL_TEMPLATES = [
  {
    id: 'manual',
    name: 'Write your own',
    category: 'General',
    linkedType: null,
    description: 'A freeform goal you track yourself',
    aliases: ['custom', 'manual', 'other'],
  },
  {
    id: 'weight',
    name: 'Reach a target weight',
    category: 'Health',
    linkedType: 'weight',
    description: 'Auto-tracks from your Bio-Metrics weight logs',
    aliases: ['weight', 'lbs', 'scale', 'body weight'],
  },
  {
    id: 'bodyfat',
    name: 'Reach a body-fat target',
    category: 'Fitness',
    linkedType: 'bodyfat',
    description: 'Auto-tracks from your Bio-Metrics body-fat entries',
    aliases: ['body fat', 'bf%', 'composition'],
  },
  {
    id: 'streak',
    name: 'Build a daily research streak',
    category: 'Lifestyle',
    linkedType: 'streak',
    description: 'Auto-tracks from completing today\'s research tasks',
    aliases: ['streak', 'consistency', 'daily'],
  },
  {
    id: 'hydration',
    name: 'Build a hydration streak',
    category: 'Health',
    linkedType: 'hydrationStreak',
    description: 'Auto-tracks from hitting your daily water goal',
    aliases: ['water', 'hydration', 'drink'],
  },
  {
    id: 'compliance',
    name: 'Reach Grade A compliance',
    category: 'Research',
    linkedType: 'complianceGrade',
    description: 'Auto-tracks from your 30-day dose compliance',
    aliases: ['compliance', 'grade', 'adherence'],
  },
  {
    id: 'doses',
    name: 'Log a total dose milestone',
    category: 'Research',
    linkedType: 'allTimeDoses',
    description: 'Auto-tracks from all logged doses over time',
    aliases: ['doses', 'logged', 'milestone'],
  },
  {
    id: 'protocols',
    name: 'Finish protocols',
    category: 'Research',
    linkedType: 'completedProtocols',
    description: 'Auto-tracks from completed protocol history',
    aliases: ['protocol', 'finish', 'complete protocol'],
  },
  {
    id: 'budget',
    name: 'Stay under a spending budget',
    category: 'Lifestyle',
    linkedType: 'spendBudget',
    description: 'Auto-tracks from your order spend total',
    aliases: ['budget', 'spend', 'cost', 'money'],
  },
  {
    id: 'stock',
    name: 'Clear all low-stock items',
    category: 'Lifestyle',
    linkedType: 'lowStockCleared',
    description: 'Auto-tracks when stockpile has zero low-stock items',
    aliases: ['stock', 'inventory', 'stockpile', 'low stock'],
  },
  {
    id: 'lab',
    name: 'Track a lab marker trend',
    category: 'Medical',
    linkedType: 'labMarker',
    description: 'Auto-tracks from your own logged lab values (you set the target)',
    aliases: ['lab', 'blood', 'marker', 'panel', 'test'],
  },
]

/**
 * Scored search — same pattern as searchCommonSupplements.
 * Empty query returns a short default list for empty-state / initial suggestions.
 */
export function searchCommonGoalTemplates(query, limit = 8) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) {
    return COMMON_GOAL_TEMPLATES.filter((t) => t.id !== 'manual').slice(0, limit)
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
