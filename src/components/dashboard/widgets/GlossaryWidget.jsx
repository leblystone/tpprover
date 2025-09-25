import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Star, StarOff, ChevronDown, ChevronRight, Brain, AlertTriangle, Loader, Filter, FileText, Plus, Edit3, Trash2, Zap, Heart, Target, Shield, Sparkles } from 'lucide-react';
import ModernTooltip from '../../ui/ModernTooltip';

// Import the research compilation function from the modal
async function compilePeptideResearch(peptideName) {
  // Simulate comprehensive research compilation
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Create detailed research profile based on peptide name
  const name = peptideName.toUpperCase();
  
  // Enhanced peptide database with common variations and aliases
  const peptideDatabase = {
    'BPC-157': {
      aliases: ['BPC157', 'BPC 157', 'BODY PROTECTION COMPOUND'],
      classification: 'Gastric Pentadecapeptide',
      mechanism: 'Promotes angiogenesis, accelerates healing of various tissues including tendons, muscles, nervous system, and ligaments through growth hormone receptor pathways.',
      commonUses: ['Tissue repair research', 'Wound healing studies', 'Gastrointestinal research', 'Tendon and ligament research'],
      dosageRanges: 'Research dosages typically range from 200-800 mcg daily, administered subcutaneously or orally.',
      researchFindings: 'Studies demonstrate significant acceleration in healing processes, improved tissue regeneration, and protective effects against various forms of tissue damage.',
      considerations: 'Generally well-tolerated in research settings. May interact with blood clotting mechanisms.',
      researchStatus: 'Extensive preclinical research with growing clinical interest.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'SEMAGLUTIDE': {
      aliases: ['GLP-1 AGONIST', 'OZEMPIC', 'WEGOVY'],
      classification: 'GLP-1 Receptor Agonist',
      mechanism: 'Mimics incretin hormones, regulating blood sugar levels and slowing gastric emptying, leading to reduced appetite and food intake.',
      commonUses: ['Metabolic research', 'Weight management studies', 'Diabetes research', 'Cardiovascular research'],
      dosageRanges: 'Research protocols typically start at 0.25mg weekly, escalating to 1.0-2.4mg weekly based on study parameters.',
      researchFindings: 'Demonstrates significant effects on weight reduction, glycemic control, and cardiovascular outcomes in clinical trials.',
      considerations: 'May cause gastrointestinal effects. Requires careful monitoring in research protocols.',
      researchStatus: 'FDA-approved for specific indications, ongoing research for additional applications.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'TIRZEPATIDE': {
      aliases: ['MOUNJARO', 'ZEPBOUND', 'GIP/GLP-1 AGONIST'],
      classification: 'Dual GIP/GLP-1 Receptor Agonist',
      mechanism: 'Activates both GIP and GLP-1 receptors, providing enhanced glycemic control and weight management effects compared to single-target approaches.',
      commonUses: ['Advanced metabolic research', 'Dual-pathway studies', 'Comparative effectiveness research', 'Weight management research'],
      dosageRanges: 'Research protocols typically range from 2.5mg to 15mg weekly, with careful dose escalation.',
      researchFindings: 'Superior weight loss and glycemic control compared to single GLP-1 agonists in head-to-head trials.',
      considerations: 'Enhanced potency requires careful monitoring. May have increased gastrointestinal effects.',
      researchStatus: 'Recently approved, extensive ongoing research into optimal applications.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    }
  };

  // Find matching peptide (case-insensitive, includes aliases)
  let matchedPeptide = null;
  let matchedKey = null;
  
  for (const [key, data] of Object.entries(peptideDatabase)) {
    if (key === name || data.aliases.some(alias => alias === name)) {
      matchedPeptide = data;
      matchedKey = key;
      break;
    }
  }
  
  // If no exact match, create a generic research profile
  if (!matchedPeptide) {
    return {
      name: peptideName,
      classification: 'Research Compound',
      mechanism: `${peptideName} is currently under investigation for its potential therapeutic applications. Research is ongoing to fully characterize its mechanism of action and optimal use parameters.`,
      commonUses: ['Experimental research', 'Preclinical studies', 'Mechanism investigation'],
      dosageRanges: 'Dosage protocols vary based on research objectives and are typically established through preliminary studies.',
      researchFindings: 'Research is in progress. Current findings are being compiled from ongoing studies.',
      considerations: 'As with all research compounds, careful monitoring and adherence to research protocols is essential.',
      researchStatus: 'Investigational compound - research and development ongoing.',
      disclaimer: 'This information is compiled from available research and is for educational purposes only.'
    };
  }
  
  return {
    name: matchedKey,
    ...matchedPeptide,
    researchStatus: matchedPeptide.researchStatus || 'Investigational compound - research and development ongoing. Not approved for therapeutic use.',
    disclaimer: matchedPeptide.disclaimer || 'This information is compiled from available research and is for educational purposes only. Always consult current scientific literature and follow proper research protocols.'
  };
}

export default function GlossaryWidget({ widget, theme }) {
  const [favoriteEntries, setFavoriteEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'browse', 'favorites', 'notes'
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [expandedCategories, setExpandedCategories] = useState(new Set(['Popular']));
  const [userNotes, setUserNotes] = useState([]);
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  
  // AI Research state
  const [aiResearch, setAiResearch] = useState({ loading: false, data: null, error: null, query: '' });

  // Load favorites and notes from localStorage
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('tpprover_research_favorites');
      if (savedFavorites) {
        setFavoriteEntries(JSON.parse(savedFavorites));
      }
      
      const savedNotes = localStorage.getItem('tpprover_user_notes');
      if (savedNotes) {
        setUserNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error('Error loading glossary data:', error);
    }
  }, []);

  const handleAIResearch = async (term = searchTerm) => {
    if (!term.trim()) return;

    setAiResearch({ loading: true, data: null, error: null, query: term });

    try {
      const data = await compilePeptideResearch(term);
      setAiResearch({ loading: false, data, error: null, query: term });
      setActiveTab('search'); // Switch to search tab to show results
    } catch (error) {
      setAiResearch({ loading: false, data: null, error: 'Failed to compile research', query: term });
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Auto-search after 2 characters with debouncing
    if (value.length >= 2) {
      clearTimeout(window.glossarySearchTimeout);
      window.glossarySearchTimeout = setTimeout(() => {
        handleAIResearch(value);
      }, 800);
    }
  };

  const toggleFavorite = (peptideName) => {
    const newFavorites = favoriteEntries.includes(peptideName)
      ? favoriteEntries.filter(f => f !== peptideName)
      : [...favoriteEntries, peptideName];
    
    setFavoriteEntries(newFavorites);
    localStorage.setItem('tpprover_research_favorites', JSON.stringify(newFavorites));
  };

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAddNote = () => {
    if (noteForm.title.trim() || noteForm.content.trim()) {
      const newNote = {
        id: Date.now().toString(),
        title: noteForm.title.trim() || 'Research Note',
        content: noteForm.content.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedNotes = [newNote, ...userNotes];
      setUserNotes(updatedNotes);
      localStorage.setItem('tpprover_user_notes', JSON.stringify(updatedNotes));
      setNoteForm({ title: '', content: '' });
      setShowAddNoteForm(false);
    }
  };

  const handleDeleteNote = (id) => {
    const updatedNotes = userNotes.filter(note => note.id !== id);
    setUserNotes(updatedNotes);
    localStorage.setItem('tpprover_user_notes', JSON.stringify(updatedNotes));
  };

  const popularPeptides = [
    'Semaglutide',
    'Tirzepatide', 
    'BPC-157',
    'TB-500',
    'Ipamorelin',
    'CJC-1295'
  ];

  const peptideCategories = {
    'Popular': ['Semaglutide', 'Tirzepatide', 'BPC-157', 'TB-500', 'Ipamorelin', 'CJC-1295'],
    'Growth Hormone': ['Ipamorelin', 'CJC-1295', 'GHRP-6', 'GHRP-2', 'Hexarelin', 'MK-677'],
    'Healing & Recovery': ['BPC-157', 'TB-500', 'Thymosin Beta-4', 'GHK-Cu', 'Epitalon'],
    'Weight Loss': ['Semaglutide', 'Tirzepatide', 'AOD-9604', 'Tesamorelin', 'CJC-1295'],
    'Cognitive & Brain': ['Noopept', 'Cerebrolysin', 'Selank', 'Semax', 'Dihexa'],
    'Anti-Aging': ['Epitalon', 'GHK-Cu', 'Thymulin', 'FOXO4-DRI', 'Humanin'],
    'Nasal Sprays': ['Selank', 'Semax', 'Oxytocin', 'PT-141', 'Kisspeptin'],
    'Blends & Combos': ['CJC-1295 + Ipamorelin', 'BPC-157 + TB-500', 'Tesamorelin + Ipamorelin'],
    'Tanning & Libido': ['Melanotan II', 'PT-141', 'Kisspeptin', 'Oxytocin'],
    'Liver & Detox': ['Liver Blend', 'NAC', 'Glutathione', 'Taurine']
  };

  const getCategoryColors = (category) => {
    const colors = {
      'Popular': { bg: '#FDF6E3', border: '#D4A574', text: '#8B4513', icon: '#D2691E' },
      'Growth Hormone': { bg: '#EBF8FF', border: '#3182CE', text: '#2C5282', icon: '#4299E1' },
      'Healing & Recovery': { bg: '#FDF2F8', border: '#E53E3E', text: '#C53030', icon: '#F56565' },
      'Weight Loss': { bg: '#F0FDF4', border: '#38A169', text: '#2F855A', icon: '#68D391' },
      'Cognitive & Brain': { bg: '#FAF5FF', border: '#805AD5', text: '#553C9A', icon: '#9F7AEA' },
      'Anti-Aging': { bg: '#FFFBEB', border: '#D69E2E', text: '#B7791F', icon: '#F6E05E' },
      'Nasal Sprays': { bg: '#E6FFFA', border: '#319795', text: '#2C7A7B', icon: '#4FD1C7' },
      'Blends & Combos': { bg: '#F7FAFC', border: '#4A5568', text: '#2D3748', icon: '#718096' },
      'Tanning & Libido': { bg: '#FFF5F5', border: '#E53E3E', text: '#C53030', icon: '#FC8181' },
      'Liver & Detox': { bg: '#F0FDF4', border: '#059669', text: '#047857', icon: '#34D399' }
    };
    return colors[category] || { bg: '#F7FAFC', border: '#E2E8F0', text: '#4A5568', icon: '#A0AEC0' };
  };

  const renderPeptideCard = (peptideName, showCategory = false, categoryColors = null) => {
    const isFavorite = favoriteEntries.includes(peptideName);
    const cardColors = categoryColors || { bg: theme?.cardBackground, border: theme?.border, text: theme?.text };
    
    return (
      <div key={peptideName} className="flex items-center justify-between p-2 border rounded hover:shadow-sm transition-all duration-200" 
           style={{ 
             borderColor: cardColors.border || theme?.border, 
             backgroundColor: cardColors.bg || theme?.cardBackground 
           }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAIResearch(peptideName)}
              className="font-medium text-left hover:underline transition-colors text-sm truncate"
              style={{ color: cardColors.text || theme?.text }}
            >
              {peptideName}
            </button>
            {showCategory && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" 
                    style={{ 
                      backgroundColor: (cardColors.border || theme?.accent) + '20',
                      color: cardColors.text || theme?.text,
                      border: `1px solid ${(cardColors.border || theme?.accent)}40`
                    }}>
                {Object.entries(peptideCategories).find(([_, peptides]) => 
                  peptides.includes(peptideName))?.[0] || 'Other'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => toggleFavorite(peptideName)}
          className="p-1 rounded hover:bg-opacity-20 hover:bg-gray-500 transition-all duration-200 flex-shrink-0"
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? (
            <Star size={12} className="fill-current" style={{ color: theme?.warning || '#F59E0B' }} />
          ) : (
            <StarOff size={12} style={{ color: cardColors.icon || theme?.textLight }} />
          )}
        </button>
      </div>
    );
  };

  const renderSearchTab = () => (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleAIResearch()}
          placeholder="Search peptides..."
          className="flex-1 px-2 py-1.5 text-sm border rounded-md"
          style={{ borderColor: theme.border }}
        />
        <button
          onClick={() => handleAIResearch()}
          disabled={aiResearch.loading}
          className="px-2 py-1.5 rounded-md transition-colors flex items-center justify-center"
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        >
          {aiResearch.loading ? <Loader size={12} className="animate-spin" /> : <Search size={12} />}
        </button>
      </div>

      {/* AI Research Results */}
      {aiResearch.loading && (
        <div className="flex items-center justify-center py-4">
          <Loader size={20} className="animate-spin mr-2" style={{ color: theme.primary }} />
          <span className="text-sm" style={{ color: theme.text }}>Compiling research...</span>
        </div>
      )}

      {aiResearch.error && (
        <div className="p-3 rounded-lg border" style={{ borderColor: theme.error, backgroundColor: theme.error + '10' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: theme.error }} />
            <span className="text-sm" style={{ color: theme.error }}>{aiResearch.error}</span>
          </div>
        </div>
      )}

      {aiResearch.data && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg border" style={{ borderColor: theme.primary, backgroundColor: theme.primary + '10' }}>
            <div className="flex items-center gap-2 mb-2">
              <Brain size={16} style={{ color: theme.primary }} />
              <h3 className="font-semibold text-sm" style={{ color: theme.text }}>{aiResearch.data.name}</h3>
              <button
                onClick={() => toggleFavorite(aiResearch.data.name)}
                className="p-1 rounded hover:bg-opacity-20 hover:bg-gray-500 transition-all duration-200 ml-auto"
              >
                {favoriteEntries.includes(aiResearch.data.name) ? (
                  <Star size={14} className="fill-current" style={{ color: theme?.warning || '#F59E0B' }} />
                ) : (
                  <StarOff size={14} style={{ color: theme?.textLight }} />
                )}
              </button>
            </div>
            
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-medium" style={{ color: theme.text }}>Classification: </span>
                <span style={{ color: theme.textLight }}>{aiResearch.data.classification}</span>
              </div>
              
              <div>
                <span className="font-medium" style={{ color: theme.text }}>Mechanism: </span>
                <span style={{ color: theme.textLight }}>{aiResearch.data.mechanism}</span>
              </div>
              
              <div>
                <span className="font-medium" style={{ color: theme.text }}>Research Applications: </span>
                <span style={{ color: theme.textLight }}>{aiResearch.data.commonUses?.join(', ')}</span>
              </div>
              
              <div>
                <span className="font-medium" style={{ color: theme.text }}>Research Dosages: </span>
                <span style={{ color: theme.textLight }}>{aiResearch.data.dosageRanges}</span>
              </div>
              
              <div>
                <span className="font-medium" style={{ color: theme.text }}>Key Findings: </span>
                <span style={{ color: theme.textLight }}>{aiResearch.data.researchFindings}</span>
              </div>
              
              <div>
                <span className="font-medium" style={{ color: theme.text }}>Considerations: </span>
                <span style={{ color: theme.textLight }}>{aiResearch.data.considerations}</span>
              </div>
              
              <div className="pt-2 mt-2 border-t" style={{ borderColor: theme.border }}>
                <span className="text-xs" style={{ color: theme.textLight }}>{aiResearch.data.disclaimer}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popular Peptides */}
      {!aiResearch.data && !aiResearch.loading && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold" style={{ color: theme.textLight }}>Popular Research</h4>
          <div className="grid grid-cols-1 gap-1">
            {popularPeptides.slice(0, 4).map(peptide => renderPeptideCard(peptide))}
          </div>
        </div>
      )}
    </div>
  );

  const renderBrowseTab = () => (
    <div className="space-y-2">
      {Object.entries(peptideCategories).map(([category, peptides]) => {
        const isExpanded = expandedCategories.has(category);
        const categoryColors = getCategoryColors(category);
        
        return (
          <div key={category} className="border rounded-lg overflow-hidden" style={{ borderColor: categoryColors.border }}>
            <button
              onClick={() => toggleCategory(category)}
              className="w-full p-2 flex items-center justify-between hover:opacity-80 transition-opacity"
              style={{ backgroundColor: categoryColors.bg }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColors.border }}></div>
                <span className="font-medium text-sm" style={{ color: categoryColors.text }}>{category}</span>
                <span className="text-xs opacity-75" style={{ color: categoryColors.text }}>({peptides.length})</span>
              </div>
              {isExpanded ? 
                <ChevronDown size={14} style={{ color: categoryColors.text }} /> : 
                <ChevronRight size={14} style={{ color: categoryColors.text }} />
              }
            </button>
            
            {isExpanded && (
              <div className="p-2 space-y-1" style={{ backgroundColor: theme.background }}>
                {peptides.slice(0, 4).map(peptide => renderPeptideCard(peptide, false, categoryColors))}
                {peptides.length > 4 && (
                  <div className="text-xs text-center pt-1" style={{ color: theme.textLight }}>
                    +{peptides.length - 4} more peptides
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderNotesTab = () => (
    <div className="space-y-3">
      {/* Add Note Form */}
      {!showAddNoteForm ? (
        <button
          onClick={() => setShowAddNoteForm(true)}
          className="w-full p-2 border-2 border-dashed rounded-lg hover:border-solid transition-all duration-200 group"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center justify-center gap-2" style={{ color: theme.textLight }}>
            <Plus size={14} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Add research note</span>
          </div>
        </button>
      ) : (
        <div className="p-2 border-2 rounded-lg" style={{ borderColor: theme.primary, backgroundColor: theme.cardBackground }}>
          <div className="space-y-2">
            <input
              type="text"
              value={noteForm.title}
              onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              placeholder="Note title (optional)"
              className="w-full text-sm font-medium bg-transparent border-none focus:outline-none"
              style={{ color: theme.text }}
              autoFocus
            />
            <textarea
              value={noteForm.content}
              onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
              placeholder="Research observations..."
              rows={3}
              className="w-full text-sm bg-transparent border-none focus:outline-none resize-none"
              style={{ color: theme.text }}
            />
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleAddNote}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                Save
              </button>
              <button
                onClick={() => setShowAddNoteForm(false)}
                className="px-2 py-1 rounded text-xs"
                style={{ color: theme.text }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      {userNotes.length > 0 ? (
        <div className="space-y-2">
          {userNotes.slice(0, 3).map((note) => (
            <div key={note.id} className="group p-2 rounded border hover:shadow-sm transition-all duration-200" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {note.title && note.title !== 'Research Note' && (
                    <h5 className="text-sm font-medium mb-1 truncate" style={{ color: theme.text }}>
                      {note.title}
                    </h5>
                  )}
                  <p className="text-xs line-clamp-2 mb-1" style={{ color: theme.textLight }}>
                    {note.content}
                  </p>
                  <div className="text-xs" style={{ color: theme.textLight, opacity: 0.7 }}>
                    {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1 rounded hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  style={{ color: theme.textLight }}
                  title="Delete note"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {userNotes.length > 3 && (
            <div className="text-xs text-center" style={{ color: theme.textLight }}>
              +{userNotes.length - 3} more notes
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <FileText size={24} className="mx-auto mb-2 opacity-50" style={{ color: theme.textLight }} />
          <p className="text-sm" style={{ color: theme.textLight }}>No research notes yet</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Research Glossary
          </h3>
          <BookOpen size={20} style={{ color: theme.primary }} />
        </div>
      </div>
      
      {/* Tabs */}
      <div className="px-4 py-2 border-b" style={{ borderColor: theme.border }}>
        <div className="flex gap-1">
          {[
            { id: 'search', label: 'Search', icon: Search },
            { id: 'browse', label: 'Browse', icon: Filter },
            { id: 'notes', label: 'Notes', icon: FileText }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                activeTab === id ? 'shadow-sm' : ''
              }`}
              style={{
                backgroundColor: activeTab === id ? theme.primary : 'transparent',
                color: activeTab === id ? theme.textOnPrimary : theme.textLight
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'search' && renderSearchTab()}
        {activeTab === 'browse' && renderBrowseTab()}
        {activeTab === 'notes' && renderNotesTab()}
      </div>
    </div>
  );
}