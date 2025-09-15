import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, Beaker, Syringe, Pill, Package, ChevronDown, ChevronUp, ExternalLink, BookOpen } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

// Comprehensive peptide and compound database
const PEPTIDE_DATABASE = [
  // Healing & Recovery
  {
    id: 'bpc-157',
    name: 'BPC-157',
    category: 'Healing & Recovery',
    type: 'Peptide',
    commonDoses: ['250-500 mcg'],
    deliveryMethods: ['Injection', 'Oral'],
    description: 'Body Protective Compound. Promotes healing of tendons, ligaments, muscles, and gut lining.',
    benefits: ['Accelerated healing', 'Gut health', 'Joint repair', 'Anti-inflammatory'],
    halfLife: '~4 hours',
    researchLevel: 'Extensive animal studies',
  },
  {
    id: 'tb-500',
    name: 'TB-500',
    category: 'Healing & Recovery',
    type: 'Peptide',
    commonDoses: ['2.5-5 mg'],
    deliveryMethods: ['Injection'],
    description: 'Thymosin Beta-4 fragment. Promotes tissue repair and wound healing.',
    benefits: ['Wound healing', 'Muscle repair', 'Hair growth', 'Flexibility'],
    halfLife: '~7 days',
    researchLevel: 'Animal and limited human studies',
  },
  {
    id: 'ghk-cu',
    name: 'GHK-Cu',
    category: 'Healing & Recovery',
    type: 'Copper Peptide',
    commonDoses: ['1-3 mg'],
    deliveryMethods: ['Injection', 'Topical'],
    description: 'Copper peptide with anti-aging and healing properties.',
    benefits: ['Skin repair', 'Collagen production', 'Anti-aging', 'Wound healing'],
    halfLife: '~1 hour',
    researchLevel: 'Human clinical studies',
  },

  // Growth Hormone Releasing
  {
    id: 'ipamorelin',
    name: 'Ipamorelin',
    category: 'Growth Hormone',
    type: 'GHRP',
    commonDoses: ['200-300 mcg'],
    deliveryMethods: ['Injection'],
    description: 'Selective growth hormone releasing peptide with minimal side effects.',
    benefits: ['Increased GH', 'Better sleep', 'Fat loss', 'Muscle growth'],
    halfLife: '~2 hours',
    researchLevel: 'Human clinical studies',
  },
  {
    id: 'cjc-1295',
    name: 'CJC-1295',
    category: 'Growth Hormone',
    type: 'GHRH Analog',
    commonDoses: ['1-2 mg'],
    deliveryMethods: ['Injection'],
    description: 'Growth hormone releasing hormone analog with extended half-life.',
    benefits: ['Sustained GH release', 'Muscle growth', 'Fat loss', 'Recovery'],
    halfLife: '6-8 days',
    researchLevel: 'Animal and human studies',
  },
  {
    id: 'mk-677',
    name: 'MK-677 (Ibutamoren)',
    category: 'Growth Hormone',
    type: 'Growth Hormone Secretagogue',
    commonDoses: ['10-25 mg'],
    deliveryMethods: ['Oral'],
    description: 'Oral growth hormone secretagogue that mimics ghrelin.',
    benefits: ['Increased GH/IGF-1', 'Improved sleep', 'Muscle growth', 'Bone density'],
    halfLife: '~24 hours',
    researchLevel: 'Human clinical studies',
  },

  // Metabolic & Fat Loss
  {
    id: '5-amino-1mq',
    name: '5-Amino-1MQ',
    category: 'Metabolic & Fat Loss',
    type: 'Small Molecule',
    commonDoses: ['50-100 mg'],
    deliveryMethods: ['Oral', 'Injection'],
    description: 'NNMT inhibitor that promotes fat loss and metabolic health.',
    benefits: ['Fat loss', 'Increased NAD+', 'Metabolic enhancement', 'Energy boost'],
    halfLife: '~2-4 hours',
    researchLevel: 'Animal studies, limited human data',
  },
  {
    id: 'aod-9604',
    name: 'AOD-9604',
    category: 'Metabolic & Fat Loss',
    type: 'Growth Hormone Fragment',
    commonDoses: ['300-600 mcg'],
    deliveryMethods: ['Injection'],
    description: 'Fragment of growth hormone with fat-burning properties.',
    benefits: ['Fat loss', 'Improved metabolism', 'Cartilage repair'],
    halfLife: '~30 minutes',
    researchLevel: 'Human clinical studies',
  },
  {
    id: 'tesamorelin',
    name: 'Tesamorelin',
    category: 'Metabolic & Fat Loss',
    type: 'GHRH Analog',
    commonDoses: ['1-2 mg'],
    deliveryMethods: ['Injection'],
    description: 'FDA-approved GHRH analog for reducing visceral fat.',
    benefits: ['Visceral fat reduction', 'Improved body composition', 'Cognitive benefits'],
    halfLife: '~26 minutes',
    researchLevel: 'FDA approved for HIV lipodystrophy',
  },

  // Cognitive & Neuroprotective
  {
    id: 'noopept',
    name: 'Noopept',
    category: 'Cognitive & Neuroprotective',
    type: 'Nootropic Peptide',
    commonDoses: ['10-30 mg'],
    deliveryMethods: ['Oral', 'Nasal'],
    description: 'Potent nootropic with neuroprotective properties.',
    benefits: ['Enhanced cognition', 'Memory improvement', 'Neuroprotection'],
    halfLife: '~25 minutes',
    researchLevel: 'Human clinical studies (Russia)',
  },
  {
    id: 'cerebrolysin',
    name: 'Cerebrolysin',
    category: 'Cognitive & Neuroprotective',
    type: 'Neuropeptide Complex',
    commonDoses: ['5-30 ml'],
    deliveryMethods: ['Injection'],
    description: 'Brain-derived peptide complex with neuroprotective effects.',
    benefits: ['Neuroprotection', 'Cognitive enhancement', 'Stroke recovery'],
    halfLife: 'Variable',
    researchLevel: 'Extensive human clinical studies',
  },
  {
    id: 'dihexa',
    name: 'Dihexa',
    category: 'Cognitive & Neuroprotective',
    type: 'Nootropic Compound',
    commonDoses: ['5-10 mg'],
    deliveryMethods: ['Oral'],
    description: 'Potent cognitive enhancer that promotes synapse formation.',
    benefits: ['Memory enhancement', 'Neurogenesis', 'Cognitive improvement'],
    halfLife: '~2-4 hours',
    researchLevel: 'Animal studies, limited human data',
  },

  // Tanning & Libido
  {
    id: 'melanotan-2',
    name: 'Melanotan II',
    category: 'Tanning & Libido',
    type: 'Melanocortin Receptor Agonist',
    commonDoses: ['0.25-1 mg'],
    deliveryMethods: ['Injection', 'Nasal'],
    description: 'Synthetic analog of melanocyte-stimulating hormone.',
    benefits: ['Skin tanning', 'Libido enhancement', 'Appetite suppression'],
    halfLife: '~33 minutes',
    researchLevel: 'Animal and limited human studies',
  },
  {
    id: 'pt-141',
    name: 'PT-141 (Bremelanotide)',
    category: 'Tanning & Libido',
    type: 'Melanocortin Receptor Agonist',
    commonDoses: ['1.75-2 mg'],
    deliveryMethods: ['Injection', 'Nasal'],
    description: 'FDA-approved treatment for hypoactive sexual desire disorder.',
    benefits: ['Enhanced libido', 'Sexual function improvement'],
    halfLife: '~2.7 hours',
    researchLevel: 'FDA approved for HSDD in women',
  },

  // Sleep & Recovery
  {
    id: 'dsip',
    name: 'DSIP',
    category: 'Sleep & Recovery',
    type: 'Neuropeptide',
    commonDoses: ['100-300 mcg'],
    deliveryMethods: ['Injection'],
    description: 'Delta Sleep-Inducing Peptide for improved sleep quality.',
    benefits: ['Improved sleep', 'Stress reduction', 'Recovery enhancement'],
    halfLife: '~15 minutes',
    researchLevel: 'Animal and limited human studies',
  },

  // Blends & Combinations
  {
    id: 'ghrp-2-mod-grf',
    name: 'GHRP-2 + Mod GRF 1-29',
    category: 'Growth Hormone',
    type: 'Peptide Blend',
    commonDoses: ['100-200 mcg each'],
    deliveryMethods: ['Injection'],
    description: 'Synergistic combination for enhanced growth hormone release.',
    benefits: ['Amplified GH release', 'Better sleep', 'Recovery', 'Body composition'],
    halfLife: '~30 minutes',
    researchLevel: 'Combined research from individual peptides',
  },
  {
    id: 'bpc-tb500-blend',
    name: 'BPC-157 + TB-500',
    category: 'Healing & Recovery',
    type: 'Healing Blend',
    commonDoses: ['250 mcg BPC + 2.5 mg TB-500'],
    deliveryMethods: ['Injection'],
    description: 'Powerful healing combination for injury recovery.',
    benefits: ['Accelerated healing', 'Tissue repair', 'Anti-inflammatory'],
    halfLife: 'Variable',
    researchLevel: 'Individual peptide research',
  },

  // Nasal Formulations
  {
    id: 'oxytocin-nasal',
    name: 'Oxytocin (Nasal)',
    category: 'Cognitive & Social',
    type: 'Hormone',
    commonDoses: ['10-40 IU'],
    deliveryMethods: ['Nasal'],
    description: 'Social bonding hormone with mood and cognitive benefits.',
    benefits: ['Social bonding', 'Mood improvement', 'Stress reduction', 'Trust'],
    halfLife: '~3 minutes',
    researchLevel: 'Extensive human clinical studies',
  },
  {
    id: 'insulin-nasal',
    name: 'Insulin (Nasal)',
    category: 'Cognitive & Metabolic',
    type: 'Hormone',
    commonDoses: ['20-40 IU'],
    deliveryMethods: ['Nasal'],
    description: 'Intranasal insulin for cognitive enhancement without systemic effects.',
    benefits: ['Cognitive enhancement', 'Memory improvement', 'Neuroprotection'],
    halfLife: '~4-6 minutes',
    researchLevel: 'Human clinical studies',
  },

  // Additional Popular Peptides
  {
    id: 'epithalon',
    name: 'Epithalon',
    category: 'Anti-Aging',
    type: 'Tetrapeptide',
    commonDoses: ['5-10 mg'],
    deliveryMethods: ['Injection'],
    description: 'Telomerase activator with anti-aging properties.',
    benefits: ['Telomere lengthening', 'Anti-aging', 'Sleep improvement'],
    halfLife: '~30 minutes',
    researchLevel: 'Animal and limited human studies',
  },
  {
    id: 'thymalin',
    name: 'Thymalin',
    category: 'Immune Support',
    type: 'Thymic Peptide',
    commonDoses: ['5-10 mg'],
    deliveryMethods: ['Injection'],
    description: 'Thymic extract for immune system support.',
    benefits: ['Immune enhancement', 'Anti-aging', 'Thymus function'],
    halfLife: 'Variable',
    researchLevel: 'Russian clinical studies',
  },
  {
    id: 'selank',
    name: 'Selank',
    category: 'Cognitive & Anxiolytic',
    type: 'Heptapeptide',
    commonDoses: ['250-750 mcg'],
    deliveryMethods: ['Nasal', 'Injection'],
    description: 'Anxiolytic and nootropic peptide with cognitive benefits.',
    benefits: ['Anxiety reduction', 'Cognitive enhancement', 'Stress resilience'],
    halfLife: '~20 minutes',
    researchLevel: 'Russian clinical studies',
  },
  {
    id: 'semax',
    name: 'Semax',
    category: 'Cognitive & Neuroprotective',
    type: 'Heptapeptide',
    commonDoses: ['300-600 mcg'],
    deliveryMethods: ['Nasal', 'Injection'],
    description: 'Nootropic peptide with neuroprotective properties.',
    benefits: ['Cognitive enhancement', 'Neuroprotection', 'Memory improvement'],
    halfLife: '~65 minutes',
    researchLevel: 'Russian clinical studies',
  },
];

const CATEGORIES = [
  'All Categories',
  'Healing & Recovery',
  'Growth Hormone',
  'Metabolic & Fat Loss',
  'Cognitive & Neuroprotective',
  'Tanning & Libido',
  'Sleep & Recovery',
  'Anti-Aging',
  'Immune Support',
  'Cognitive & Social',
  'Cognitive & Metabolic',
  'Cognitive & Anxiolytic',
];

const DELIVERY_METHODS = [
  'All Methods',
  'Injection',
  'Oral',
  'Nasal',
  'Topical',
];

export default function Research() {
  const { theme } = useOutletContext();
  const { supplements, setSupplements } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedDelivery, setSelectedDelivery] = useState('All Methods');
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const filteredPeptides = useMemo(() => {
    return PEPTIDE_DATABASE.filter(peptide => {
      const matchesSearch = peptide.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           peptide.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           peptide.benefits.some(benefit => benefit.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'All Categories' || peptide.category === selectedCategory;
      const matchesDelivery = selectedDelivery === 'All Methods' || peptide.deliveryMethods.includes(selectedDelivery);
      
      return matchesSearch && matchesCategory && matchesDelivery;
    });
  }, [searchQuery, selectedCategory, selectedDelivery]);

  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const addToSupplements = (peptide) => {
    const newSupplement = {
      id: Date.now(),
      name: peptide.name,
      dose: peptide.commonDoses[0] || '',
      schedule: 'As needed',
      category: peptide.category,
      deliveryMethod: peptide.deliveryMethods[0] || 'Injection',
      notes: peptide.description,
    };
    
    setSupplements(prev => [newSupplement, ...prev]);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>
            Peptide Research Database
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            Comprehensive database of peptides, compounds, and research chemicals
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: theme.textLight }} />
            <input
              type="text"
              placeholder="Search peptides, benefits, descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
                color: theme.text,
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors"
            style={{
              borderColor: theme.border,
              backgroundColor: showFilters ? theme.accent : theme.cardBackground,
              color: theme.text,
            }}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border"
               style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 rounded border text-sm"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.secondary,
                  color: theme.text,
                }}
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Delivery Method
              </label>
              <select
                value={selectedDelivery}
                onChange={(e) => setSelectedDelivery(e.target.value)}
                className="w-full p-2 rounded border text-sm"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.secondary,
                  color: theme.text,
                }}
              >
                {DELIVERY_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-sm" style={{ color: theme.textLight }}>
          Showing {filteredPeptides.length} of {PEPTIDE_DATABASE.length} compounds
        </p>
      </div>

      {/* Peptide Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPeptides.map(peptide => {
          const isExpanded = expandedCards.has(peptide.id);
          
          return (
            <div
              key={peptide.id}
              className="border rounded-lg p-4 transition-all hover:shadow-md"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg" style={{ color: theme.text }}>
                    {peptide.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: theme.accent,
                        color: theme.text,
                      }}
                    >
                      {peptide.category}
                    </span>
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: theme.successBg,
                        color: theme.text,
                      }}
                    >
                      {peptide.type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addToSupplements(peptide)}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: theme.primary,
                      color: theme.textOnPrimary,
                    }}
                    title="Add to supplements"
                  >
                    <Package className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleExpanded(peptide.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: theme.accent,
                      color: theme.text,
                    }}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Basic Info */}
              <p className="text-sm mb-3" style={{ color: theme.textLight }}>
                {peptide.description}
              </p>

              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <span className="text-xs font-medium" style={{ color: theme.textLight }}>
                    Common Dose:
                  </span>
                  <p className="text-sm" style={{ color: theme.text }}>
                    {peptide.commonDoses.join(', ')}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium" style={{ color: theme.textLight }}>
                    Delivery:
                  </span>
                  <p className="text-sm" style={{ color: theme.text }}>
                    {peptide.deliveryMethods.join(', ')}
                  </p>
                </div>
              </div>

              {/* Benefits */}
              <div className="mb-3">
                <span className="text-xs font-medium" style={{ color: theme.textLight }}>
                  Key Benefits:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {peptide.benefits.slice(0, isExpanded ? undefined : 3).map(benefit => (
                    <span
                      key={benefit}
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: theme.infoBg,
                        color: theme.text,
                      }}
                    >
                      {benefit}
                    </span>
                  ))}
                  {!isExpanded && peptide.benefits.length > 3 && (
                    <span className="text-xs" style={{ color: theme.textLight }}>
                      +{peptide.benefits.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="space-y-3 pt-3 border-t" style={{ borderColor: theme.border }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs font-medium" style={{ color: theme.textLight }}>
                        Half-Life:
                      </span>
                      <p className="text-sm" style={{ color: theme.text }}>
                        {peptide.halfLife}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium" style={{ color: theme.textLight }}>
                        Research Level:
                      </span>
                      <p className="text-sm" style={{ color: theme.text }}>
                        {peptide.researchLevel}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredPeptides.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4" style={{ color: theme.textLight }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: theme.text }}>
            No compounds found
          </h3>
          <p className="text-sm" style={{ color: theme.textLight }}>
            Try adjusting your search terms or filters
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.warningBg }}>
        <p className="text-xs" style={{ color: theme.text }}>
          <strong>Disclaimer:</strong> This information is for research and educational purposes only. 
          Always consult with a qualified healthcare provider before using any peptides or research compounds. 
          Many of these substances are not approved by the FDA for human use.
        </p>
      </div>
    </section>
  );
}
