import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, CheckCircle, Clock, Star, Target, 
  Share2, BarChart3, Calendar, Award, Package, Calculator, TrendingUp,
  Lightbulb, Zap, AlertCircle, CheckCircle2, Circle
} from 'lucide-react';

const PRIORITY_LEVELS = {
  LOW: { label: 'Low', color: '#6b7280', icon: Circle },
  MEDIUM: { label: 'Medium', color: '#f59e0b', icon: AlertCircle },
  HIGH: { label: 'High', color: '#ef4444', icon: Target },
  CRITICAL: { label: 'Critical', color: '#dc2626', icon: Zap }
};

const STATUS_OPTIONS = {
  IDEA: { label: 'Idea', color: '#6b7280', icon: Lightbulb },
  PLANNING: { label: 'Planning', color: '#3b82f6', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: '#f59e0b', icon: TrendingUp },
  TESTING: { label: 'Testing', color: '#8b5cf6', icon: Target },
  COMPLETED: { label: 'Completed', color: '#10b981', icon: CheckCircle2 }
};

const CATEGORIES = {
  SHARING: { label: 'Sharing Features', icon: Share2, color: '#3b82f6' },
  ANALYTICS: { label: 'Analytics & Metrics', icon: BarChart3, color: '#10b981' },
  UI_UX: { label: 'UI/UX Improvements', icon: Star, color: '#f59e0b' },
  PERFORMANCE: { label: 'Performance', icon: Zap, color: '#ef4444' },
  SECURITY: { label: 'Security', icon: Target, color: '#8b5cf6' },
  INTEGRATION: { label: 'Integrations', icon: Package, color: '#06b6d4' }
};

export default function ImprovementsTracker({ theme }) {
  const [improvements, setImprovements] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingImprovement, setEditingImprovement] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'SHARING',
    priority: 'MEDIUM',
    status: 'IDEA',
    estimatedEffort: '',
    notes: '',
    tags: []
  });

  // Load improvements from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tpprover_improvements');
    if (saved) {
      try {
        setImprovements(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading improvements:', error);
      }
    } else {
      // Initialize with default improvements
      initializeDefaultImprovements();
    }
  }, []);

  const initializeDefaultImprovements = () => {
    const defaultImprovements = [
      {
        id: 'share-orders',
        title: 'Order Summaries Sharing',
        description: 'Allow users to share order summaries (without personal details like addresses, payment info)',
        category: 'SHARING',
        priority: 'MEDIUM',
        status: 'IDEA',
        estimatedEffort: '2-3 days',
        notes: 'Would include peptide name, quantity, vendor, order date, status. Exclude personal shipping details.',
        tags: ['sharing', 'orders', 'privacy'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'share-supplements',
        title: 'Supplement Stacks Sharing',
        description: 'Enable sharing of supplement schedules and stacks with dosing information',
        category: 'SHARING',
        priority: 'MEDIUM',
        status: 'IDEA',
        estimatedEffort: '1-2 days',
        notes: 'Include supplement names, dosages, timing, and schedule. Great for research collaboration.',
        tags: ['sharing', 'supplements', 'schedules'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'share-recon',
        title: 'Reconstitution Guides Sharing',
        description: 'Share reconstitution calculations and mixing guides for peptides',
        category: 'SHARING',
        priority: 'HIGH',
        status: 'IDEA',
        estimatedEffort: '2-3 days',
        notes: 'Include peptide concentration, diluent volume, final concentration, storage instructions.',
        tags: ['sharing', 'reconstitution', 'calculations'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'share-metrics',
        title: 'Research Progress Charts',
        description: 'Share anonymized research progress charts and metrics',
        category: 'SHARING',
        priority: 'MEDIUM',
        status: 'IDEA',
        estimatedEffort: '3-4 days',
        notes: 'Create anonymized charts showing progress trends without personal identifiers. Great for research community.',
        tags: ['sharing', 'metrics', 'charts', 'anonymized'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'share-badges',
        title: 'Achievement Badges Showcase',
        description: 'Allow users to share their earned badges and achievements',
        category: 'SHARING',
        priority: 'LOW',
        status: 'IDEA',
        estimatedEffort: '1 day',
        notes: 'Show earned badges with descriptions. Motivational and community-building feature.',
        tags: ['sharing', 'badges', 'achievements', 'gamification'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'share-calendar',
        title: 'Research Milestones Sharing',
        description: 'Share sanitized calendar notes and research milestones',
        category: 'SHARING',
        priority: 'MEDIUM',
        status: 'IDEA',
        estimatedEffort: '2 days',
        notes: 'Include research milestones, protocol start dates, important notes (sanitized of personal details).',
        tags: ['sharing', 'calendar', 'milestones', 'research'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'referral-tracking',
        title: 'Referral System Integration',
        description: 'Add referral tracking to sharing links to measure viral growth',
        category: 'ANALYTICS',
        priority: 'HIGH',
        status: 'IDEA',
        estimatedEffort: '3-4 days',
        notes: 'Track which shared content leads to new signups. Essential for measuring sharing feature ROI.',
        tags: ['analytics', 'referrals', 'tracking', 'growth'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'social-media-optimization',
        title: 'Social Media Card Optimization',
        description: 'Optimize shared cards for different social media platforms',
        category: 'UI_UX',
        priority: 'MEDIUM',
        status: 'IDEA',
        estimatedEffort: '2-3 days',
        notes: 'Create platform-specific card formats for Twitter, Facebook, Instagram, LinkedIn.',
        tags: ['ui', 'social-media', 'optimization', 'cards'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    setImprovements(defaultImprovements);
    saveImprovements(defaultImprovements);
  };

  const saveImprovements = (improvementsToSave) => {
    localStorage.setItem('tpprover_improvements', JSON.stringify(improvementsToSave));
  };

  const handleAddImprovement = () => {
    if (!formData.title.trim()) return;

    const newImprovement = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedImprovements = [...improvements, newImprovement];
    setImprovements(updatedImprovements);
    saveImprovements(updatedImprovements);
    
    setFormData({
      title: '',
      description: '',
      category: 'SHARING',
      priority: 'MEDIUM',
      status: 'IDEA',
      estimatedEffort: '',
      notes: '',
      tags: []
    });
    setShowAddForm(false);
  };

  const handleEditImprovement = (improvement) => {
    setEditingImprovement(improvement);
    setFormData({
      title: improvement.title,
      description: improvement.description,
      category: improvement.category,
      priority: improvement.priority,
      status: improvement.status,
      estimatedEffort: improvement.estimatedEffort,
      notes: improvement.notes,
      tags: improvement.tags || []
    });
    setShowAddForm(true);
  };

  const handleUpdateImprovement = () => {
    if (!formData.title.trim()) return;

    const updatedImprovements = improvements.map(imp => 
      imp.id === editingImprovement.id 
        ? { ...imp, ...formData, updatedAt: new Date().toISOString() }
        : imp
    );

    setImprovements(updatedImprovements);
    saveImprovements(updatedImprovements);
    
    setEditingImprovement(null);
    setFormData({
      title: '',
      description: '',
      category: 'SHARING',
      priority: 'MEDIUM',
      status: 'IDEA',
      estimatedEffort: '',
      notes: '',
      tags: []
    });
    setShowAddForm(false);
  };

  const handleDeleteImprovement = (id) => {
    if (window.confirm('Are you sure you want to delete this improvement?')) {
      const updatedImprovements = improvements.filter(imp => imp.id !== id);
      setImprovements(updatedImprovements);
      saveImprovements(updatedImprovements);
    }
  };

  const filteredImprovements = improvements.filter(imp => {
    const categoryMatch = filterCategory === 'ALL' || imp.category === filterCategory;
    const statusMatch = filterStatus === 'ALL' || imp.status === filterStatus;
    const priorityMatch = filterPriority === 'ALL' || imp.priority === filterPriority;
    return categoryMatch && statusMatch && priorityMatch;
  });

  const getStatusCounts = () => {
    const counts = {};
    Object.keys(STATUS_OPTIONS).forEach(status => {
      counts[status] = improvements.filter(imp => imp.status === status).length;
    });
    return counts;
  };

  const getPriorityCounts = () => {
    const counts = {};
    Object.keys(PRIORITY_LEVELS).forEach(priority => {
      counts[priority] = improvements.filter(imp => imp.priority === priority).length;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();
  const priorityCounts = getPriorityCounts();

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#3b82f6' + '20' }}>
              <Lightbulb size={20} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: theme.textLight }}>Total Ideas</p>
              <p className="text-2xl font-bold" style={{ color: theme.primaryDark }}>{improvements.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#10b981' + '20' }}>
              <CheckCircle2 size={20} style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: theme.textLight }}>Completed</p>
              <p className="text-2xl font-bold" style={{ color: theme.primaryDark }}>{statusCounts.COMPLETED}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#f59e0b' + '20' }}>
              <TrendingUp size={20} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: theme.textLight }}>In Progress</p>
              <p className="text-2xl font-bold" style={{ color: theme.primaryDark }}>{statusCounts.IN_PROGRESS}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#ef4444' + '20' }}>
              <Target size={20} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: theme.textLight }}>High Priority</p>
              <p className="text-2xl font-bold" style={{ color: theme.primaryDark }}>{priorityCounts.HIGH + priorityCounts.CRITICAL}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" style={{ color: theme.textLight }}>Category:</label>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1 rounded border text-sm"
            style={{ borderColor: theme.border, backgroundColor: theme.background }}
          >
            <option value="ALL">All Categories</option>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <option key={key} value={key}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" style={{ color: theme.textLight }}>Status:</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1 rounded border text-sm"
            style={{ borderColor: theme.border, backgroundColor: theme.background }}
          >
            <option value="ALL">All Status</option>
            {Object.entries(STATUS_OPTIONS).map(([key, status]) => (
              <option key={key} value={key}>{status.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" style={{ color: theme.textLight }}>Priority:</label>
          <select 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1 rounded border text-sm"
            style={{ borderColor: theme.border, backgroundColor: theme.background }}
          >
            <option value="ALL">All Priorities</option>
            {Object.entries(PRIORITY_LEVELS).map(([key, priority]) => (
              <option key={key} value={key}>{priority.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        >
          <Plus size={18} />
          Add Improvement
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="rounded-lg border p-6" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
              {editingImprovement ? 'Edit Improvement' : 'Add New Improvement'}
            </h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingImprovement(null);
                setFormData({
                  title: '',
                  description: '',
                  category: 'SHARING',
                  priority: 'MEDIUM',
                  status: 'IDEA',
                  estimatedEffort: '',
                  notes: '',
                  tags: []
                });
              }}
              className="p-1 rounded hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textLight }}>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
                placeholder="Improvement title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textLight }}>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
              >
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textLight }}>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
              >
                {Object.entries(PRIORITY_LEVELS).map(([key, priority]) => (
                  <option key={key} value={key}>{priority.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textLight }}>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
              >
                {Object.entries(STATUS_OPTIONS).map(([key, status]) => (
                  <option key={key} value={key}>{status.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textLight }}>Estimated Effort</label>
              <input
                type="text"
                value={formData.estimatedEffort}
                onChange={(e) => setFormData({ ...formData, estimatedEffort: e.target.value })}
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
                placeholder="e.g., 2-3 days, 1 week"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textLight }}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded border h-20"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
                placeholder="Detailed description of the improvement"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textLight }}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded border h-20"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
                placeholder="Additional notes, implementation details, etc."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingImprovement(null);
                setFormData({
                  title: '',
                  description: '',
                  category: 'SHARING',
                  priority: 'MEDIUM',
                  status: 'IDEA',
                  estimatedEffort: '',
                  notes: '',
                  tags: []
                });
              }}
              className="px-4 py-2 rounded-lg border font-semibold"
              style={{ borderColor: theme.border, color: theme.textLight }}
            >
              Cancel
            </button>
            <button
              onClick={editingImprovement ? handleUpdateImprovement : handleAddImprovement}
              className="px-4 py-2 rounded-lg font-semibold"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              {editingImprovement ? 'Update' : 'Add'} Improvement
            </button>
          </div>
        </div>
      )}

      {/* Improvements List */}
      <div className="space-y-4">
        {filteredImprovements.map((improvement) => {
          const category = CATEGORIES[improvement.category];
          const priority = PRIORITY_LEVELS[improvement.priority];
          const status = STATUS_OPTIONS[improvement.status];
          
          return (
            <div 
              key={improvement.id} 
              className="rounded-lg border p-6 hover:shadow-md transition-shadow"
              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
                      {improvement.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                        style={{ backgroundColor: category.color + '20', color: category.color }}
                      >
                        <category.icon size={12} />
                        {category.label}
                      </span>
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                        style={{ backgroundColor: priority.color + '20', color: priority.color }}
                      >
                        <priority.icon size={12} />
                        {priority.label}
                      </span>
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                        style={{ backgroundColor: status.color + '20', color: status.color }}
                      >
                        <status.icon size={12} />
                        {status.label}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm mb-3" style={{ color: theme.textLight }}>
                    {improvement.description}
                  </p>

                  {improvement.estimatedEffort && (
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={14} style={{ color: theme.textLight }} />
                      <span className="text-sm" style={{ color: theme.textLight }}>
                        Estimated: {improvement.estimatedEffort}
                      </span>
                    </div>
                  )}

                  {improvement.notes && (
                    <div className="mt-3 p-3 rounded" style={{ backgroundColor: theme.background }}>
                      <p className="text-sm italic" style={{ color: theme.textLight }}>
                        {improvement.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: theme.textLight }}>
                    <span>Created: {new Date(improvement.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(improvement.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEditImprovement(improvement)}
                    className="p-2 rounded hover:bg-gray-100"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteImprovement(improvement.id)}
                    className="p-2 rounded hover:bg-gray-100 text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredImprovements.length === 0 && (
          <div className="text-center py-12">
            <Lightbulb size={48} style={{ color: theme.textLight }} className="mx-auto mb-4" />
            <p className="text-lg font-medium" style={{ color: theme.textLight }}>
              No improvements found matching your filters
            </p>
            <p className="text-sm mt-2" style={{ color: theme.textLight }}>
              Try adjusting your filters or add a new improvement
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
